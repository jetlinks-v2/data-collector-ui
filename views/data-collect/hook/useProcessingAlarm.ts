import { computed, onScopeDispose, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { getCollectorError } from '../../../api/data-collect/collector'

interface AlarmConfiguration { reason?: string; code?: number; shakeLimit?: { enabled?: boolean; time?: number | null; threshold?: number | null; [key:string]:unknown }; [key:string]:unknown }
interface ErrorDefinition { code: number; description?: string; name?: string }
export const createAlarmConfiguration = (): AlarmConfiguration => ({ reason:'outlier', shakeLimit:{ enabled:true, time:60, threshold:3, alarmFirst:true, outputFirst:false, continuous:false, rolling:false } })

/** 错误候选仅在使用异常告警时获取；更新触发源不覆盖已有告警名称、级别或防抖参数。 */
export function useProcessingAlarm(getConfiguration: () => AlarmConfiguration, setConfiguration: (value: AlarmConfiguration) => void, isActive: () => boolean) {
  const { t } = useI18n()
  const errors = ref<ErrorDefinition[]>([]), loading = ref(false), failed = ref(false)
  let disposed = false, loaded = false
  async function load() {
    if (loading.value || disposed) return
    loading.value = true; failed.value = false
    try {
      const response = await getCollectorError()
      if (disposed) return
      if (!response.success) throw new Error('errors unavailable')
      errors.value = response.result || []; loaded = true
    } catch { if (!disposed) failed.value = true }
    finally { if (!disposed) loading.value = false }
  }
  watch(isActive, active => { if (active && !loaded) void load() }, { immediate:true })
  onScopeDispose(() => { disposed = true })
  const options = computed(() => [
    { value:'reason:outlier', label:t('collectorProcessing.alarmOutlier'), icon:'SafetyOutlined', description:t('collectorProcessing.alarmOutlierHint') },
    { value:'reason:deadband', label:t('collectorProcessing.alarmDeadband'), icon:'FilterOutlined', description:t('collectorProcessing.alarmDeadbandHint') },
    ...errors.value.map(error => ({ value:`code:${error.code}`, label:error.description || error.name || String(error.code), icon:'WarningOutlined', description:error.name || String(error.code) })),
  ])
  const trigger = computed({
    get:() => getConfiguration().reason ? `reason:${getConfiguration().reason}` : getConfiguration().code != null ? `code:${getConfiguration().code}` : undefined,
    set:(value: string | undefined) => {
      if (!value) return
      const configuration = { ...getConfiguration() }
      if (value.startsWith('reason:')) { configuration.reason = value.slice(7); delete configuration.code }
      else { configuration.code = Number(value.slice(5)); delete configuration.reason }
      setConfiguration(configuration)
    },
  })
  function setLimit(change: Partial<NonNullable<AlarmConfiguration['shakeLimit']>>) {
    setConfiguration({ ...getConfiguration(), shakeLimit:{ ...createAlarmConfiguration().shakeLimit, ...getConfiguration().shakeLimit, ...change } })
  }
  function setNumber(key: 'time' | 'threshold', value: number | string | null | undefined) {
    setLimit({ [key]:value == null || value === '' ? undefined : Number(value) })
  }
  const limit = computed(() => getConfiguration().shakeLimit || {})
  return { options, trigger, limit, setLimit, setNumber, loading, failed, load }
}
