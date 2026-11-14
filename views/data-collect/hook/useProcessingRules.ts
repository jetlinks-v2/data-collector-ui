import { computed, onScopeDispose, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Modal } from 'ant-design-vue'
import type { CollectorObject, PointCapabilities } from '../../../types/workspace'
import { getPointDataType } from '../../../api/data-collect/collector'
import { useProcessingFormula } from './useProcessingFormula'
import { currentValue, expression } from '../../../utils/processingExpression'
import { processingDraft } from '../../../utils/processingDraft'
import { createAlarmConfiguration, useProcessingAlarm } from './useProcessingAlarm'

export type ProcessingRuleKey = 'converter' | 'outlier' | 'changedOnly' | 'deadband' | 'storage' | 'handler'
export interface ProcessingRulePresentation { key:ProcessingRuleKey; title:string; icon:string; color:string; description:string; disabled?:boolean }
const storageFeatures = ['storageData', 'storageOutlier', 'storageDeadband']

/** 共用点位草稿；仅用户操作才写配置，展开和读取不会重置点位覆盖或采集器默认值。 */
export function useProcessingRules(getModel: () => CollectorObject, getCapabilities: () => PointCapabilities = () => ({})) {
  const { t } = useI18n()
  const managed = computed(() => getModel().managedConfiguration || {})
  const decodedType = ref<string>()
  let typeRevision = 0
  watch(() => managed.value.codec, async codec => {
    const revision = ++typeRevision
    decodedType.value = undefined
    if (!codec) return
    try {
      const response = await getPointDataType(codec)
      if (revision === typeRevision && response.success) decodedType.value = response.result?.dataType?.id || response.result?.dataType?.type
    } catch { /* 未知类型保留已有配置，不按解码器名字猜测能力。 */ }
  }, { immediate:true })
  onScopeDispose(() => { ++typeRevision })
  const numeric = computed(() => {
    const type = managed.value.codec ? decodedType.value : getCapabilities().dataType?.id || getCapabilities().dataType?.type
    return !type || ['number','byte','short','int','long','float','double','decimal'].includes(type)
  })
  const hasChangedOnly = computed(() => getModel().features?.includes('changedOnly') || false)
  const storageValues = computed({
    get:() => (getModel().features || []).filter(value => storageFeatures.includes(value)),
    set:(values: string[]) => { getModel().features = [...(getModel().features || []).filter(value => !storageFeatures.includes(value)), ...values] },
  })
  const storageOptions = computed(() => storageFeatures.map((value, i) => ({ value, label:t(`collectorProcessing.storage${i}`), icon:['DatabaseOutlined','WarningOutlined','FilterOutlined'][i], description:t(`collectorProcessing.storageHint${i}`) })))
  const cleaningAction = computed({
    get:() => managed.value.outlier?.configuration?.action || 'ignore',
    set:(action:string) => { managed.value.outlier.configuration = { ...managed.value.outlier.configuration, action } },
  })
  const cleaningOptions = computed(() => [
    { value:'ignore', label:t('collectorProcessing.keepRange'), icon:'SafetyOutlined', description:t('collectorProcessing.keepRangeHint') },
    { value:'clamp', label:t('collectorProcessing.clampRange'), icon:'CompressOutlined', description:t('collectorProcessing.clampRangeHint') },
  ])
  const conversionModes = computed(() => [
    { value:'simple', label:t('collectorProcessing.simpleConversion'), icon:'CalculatorOutlined', description:t('collectorProcessing.simpleConversionHint'), disabled:!numeric.value },
    { value:'formula', label:t('collectorProcessing.formulaConversion'), icon:'FunctionOutlined', description:t('collectorProcessing.formulaConversionHint') },
  ])
  const enabled = (key: ProcessingRuleKey) => key === 'changedOnly' ? hasChangedOnly.value : key === 'storage' ? !!storageValues.value.length : !!managed.value[key]?.enabled
  const rules = computed<ProcessingRulePresentation[]>(() => [
    { key:'converter', title:t('collectorProcessing.conversion'), icon:'CalculatorOutlined', color:'purple', description:t('collectorOptions.calculationHint') },
    { key:'outlier', title:t('collectorProcessing.rangeCleaning'), icon:'SafetyOutlined', color:'blue', description:t('collectorProcessing.cleaningHint'), disabled:!numeric.value },
    { key:'changedOnly', title:t('collectorProcessing.change'), icon:'SwapOutlined', color:'cyan', description:t('collectorProcessing.changeHint') },
    { key:'deadband', title:t('collectorProcessing.conditions'), icon:'FilterOutlined', color:'cyan', description:t('collectorProcessing.conditionsHint') },
    { key:'storage', title:t('collectorProcessing.storage'), icon:'DatabaseOutlined', color:'default', description:t('collectorProcessing.storageHint') },
    { key:'handler', title:t('collectorProcessing.alarm'), icon:'AlertOutlined', color:'orange', description:t('collectorProcessing.alarmHint') },
  ])
  const groups = computed(() => {
    const stages=[
    { key:'cleaning', title:t('collectorProcessing.cleaning'), rules:rules.value.filter(rule => rule.key === 'outlier') },
    { key:'calculation', title:t('collectorProcessing.conversion'), rules:rules.value.filter(rule => rule.key === 'converter') },
    { key:'processing', title:t('collectorProcessing.handling'), rules:rules.value.filter(rule => ['changedOnly','deadband','storage','handler'].includes(rule.key)) },
    ]
    // 旧清洗器仍判断计算后的值，确认改为公式后才切换至原始值，避免改变现有阈值口径。
    if (managed.value.outlier?.provider && managed.value.outlier.provider !== 'expression' && !managed.value.outlier.configuration?.beforeConversion && enabled('converter')) [stages[0],stages[1]]=[stages[1],stages[0]]
    return stages
  })
  const visibleGroups = computed(() => groups.value.map(group => ({ ...group, rules:group.rules.filter(rule => enabled(rule.key)) })).filter(group => group.rules.length))
  function add(key: ProcessingRuleKey) {
    const model = getModel()
    if (key === 'changedOnly') { if (!hasChangedOnly.value) model.features = [...(model.features || []), key]; return }
    if (key === 'storage') { if (!storageValues.value.length) storageValues.value = ['storageData']; return }
    const defaults = key === 'converter' ? { provider:'expression', configuration:{ expression:expression(currentValue) } }
      : key === 'outlier' ? { provider:'range', configuration:{ min:0, max:100, action:'ignore', beforeConversion:true } }
      : key === 'deadband' ? { provider:'expression', configuration:{ expression:expression({ type:'literal',valueType:'boolean',value:true }) } }
      : { provider:'alarm', configuration:createAlarmConfiguration() }
    model.managedConfiguration ||= {}
    const old = model.managedConfiguration[key]
    model.managedConfiguration[key] = old?.provider
      ? { ...old, enabled:true, configuration:old.configuration || {} }
      : { ...defaults, enabled:true }
  }
  function remove(key: ProcessingRuleKey) {
    if (key === 'outlier' || key === 'converter' || key === 'deadband') formulas[key].cancel()
    if (key === 'converter') writeFormula.cancel()
    if (key === 'changedOnly') getModel().features = getModel().features?.filter(item => item !== key)
    else if (key === 'storage') storageValues.value = []
    else if (managed.value[key]) managed.value[key].enabled = false
  }
  function configure(key: 'handler', configuration: Record<string, unknown>) {
    getModel().managedConfiguration![key] = { ...managed.value[key], configuration }
  }
  const schema = () => ({ ...getCapabilities().dataType, type:(managed.value.codec ? decodedType.value : getCapabilities().dataType?.type || getCapabilities().dataType?.id) || 'unknown' })
  const formulas = Object.fromEntries((['outlier','converter','deadband'] as const).map(key => [key,useProcessingFormula(key,()=>managed.value[key],value=>{ getModel().managedConfiguration![key]=value },schema,()=>processingDraft(getModel())[key])])) as Record<'outlier'|'converter'|'deadband',ReturnType<typeof useProcessingFormula>>
  const writeFormula = useProcessingFormula('converter',()=>managed.value.converter,value=>{ getModel().managedConfiguration!.converter=value },schema,()=>processingDraft(getModel()).writeExpression,'writeExpression')
  const simpleConversion = computed(() => managed.value.converter?.provider === 'scale' || formulas.converter.simple.value)
  /** 不能无损还原的复杂公式，仅在用户确认后重置为简单运算。 */
  function changeConversionMode(mode:string) {
    const editor = formulas.converter
    if (mode === 'formula') { editor.start();return }
    if (simpleConversion.value) return
    if (editor.canSimplify.value && !editor.invalid.value) editor.simplify()
    else Modal.confirm({ title:t('collectorProcessing.resetConversionTitle'), content:t('collectorProcessing.resetConversionHint'), okText:t('collectorProcessing.resetConversion'), cancelText:t('collectorProcessing.cancelFormula'), onOk:editor.resetSimple })
  }
  const writable = computed(()=>getModel().accessModes?.some(mode=>typeof mode === 'string' ? mode === 'write' : mode.value === 'write'))
  const alarm = useProcessingAlarm(() => managed.value.handler?.configuration || {}, value => configure('handler', value), () => enabled('handler') && managed.value.handler.provider === 'alarm')
  const errors = computed<Partial<Record<ProcessingRuleKey,string>>>(() => {
    const result: Partial<Record<ProcessingRuleKey,string>> = {}, { outlier, converter, deadband, handler } = managed.value
    if (outlier?.enabled && outlier.provider === 'range') {
      const { min, max } = outlier.configuration || {}
      if (min == null || max == null || !Number.isFinite(Number(min)) || !Number.isFinite(Number(max)) || (outlier.configuration.action ? Number(min) > Number(max) : Number(min) >= Number(max))) result.outlier = t('collectorWorkspace.invalidRange')
    }
    if (converter?.enabled && converter.provider === 'scale') {
      const { factor, scale } = converter.configuration || {}
      if (factor != null && !Number.isFinite(Number(factor))) result.converter = t('collectorWorkspace.invalidFactor')
      else if (scale != null && (!Number.isInteger(Number(scale)) || Number(scale) < 0)) result.converter = t('collectorProcessing.invalidPrecision')
    }
    for (const key of ['outlier','converter','deadband'] as const) {
      if (enabled(key) && (formulas[key].editing.value || formulas[key].invalid.value || managed.value[key]?.provider === 'expression' && !formulas[key].value.value)) result[key] = t('collectorProcessing.finishFormula')
    }
    if (converter?.enabled && converter.provider === 'expression' && writable.value && (!converter.configuration?.writeExpression || writeFormula.editing.value || writeFormula.invalid.value)) result.converter=t('collectorProcessing.writeFormulaRequired')
    if (handler?.enabled && handler.provider === 'alarm' && alarm.limit.value.enabled) {
      const { time, threshold } = alarm.limit.value
      if (!alarm.trigger.value || time == null || !Number.isFinite(time) || time < 0 || (time > 0 && (threshold == null || !Number.isInteger(threshold) || threshold < 1))) result.handler = t('collectorProcessing.incompleteAlarm')
    }
    return result
  })
  const error = computed(() => Object.values(errors.value)[0] || '')
  return { managed, rules, groups, visibleGroups, enabled, add, remove, numeric, storageValues, storageOptions, cleaningAction, cleaningOptions, conversionModes, simpleConversion, changeConversionMode, formulas, writeFormula,writable,alarm, errors, error,
    validate:async () => { if (error.value) throw new Error(error.value) } }
}
