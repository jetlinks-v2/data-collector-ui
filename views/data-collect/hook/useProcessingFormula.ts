import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useExpressionFunctions,readArithmeticSteps,buildArithmeticSteps,expressionNodeType,normalizeExpressionType,type ArithmeticStepValues,type ExpressionEditorContext,type StructuredExpression } from '@jetlinks-web-core/components/Expression'
import { getCollectorExpressionFunctions } from '../../../api/data-collect/collector'
import { currentValue,expression,readProcessingExpression } from '../../../utils/processingExpression'
import type { FormulaDraft } from '../../../utils/processingDraft'

/** 只适配当前点位的引用与配置；编辑、类型候选和运算由公共表达式组件负责。 */
export function useProcessingFormula(key:'converter'|'outlier'|'deadband', getValue:()=>any, setValue:(value:any)=>void, getSchema:()=>Record<string,unknown>, getDraft:()=>FormulaDraft, field:'expression'|'writeExpression'='expression') {
  const { t } = useI18n()
  const catalog = useExpressionFunctions(getCollectorExpressionFunctions)
  const modeKey=field === 'writeExpression' ? 'writeEditorMode' : 'editorMode'
  const value = computed(()=>field === 'writeExpression' ? getValue()?.configuration?.writeExpression || expression(currentValue) : readProcessingExpression(key,getValue()))
  const draftRef=<K extends keyof FormulaDraft>(key:K)=>computed({get:()=>getDraft()[key],set:(value:FormulaDraft[K])=>{getDraft()[key]=value}})
  const editing=draftRef('editing'),invalid=draftRef('invalid'),pending=draftRef('pending'),typeError=draftRef('typeError'),stepDraft=draftRef('stepDraft')
  const steps=computed(()=>stepDraft.value || (value.value && readArithmeticSteps(value.value,currentValue)))
  const canSimplify=computed(()=>key === 'converter' && getValue()?.provider === 'expression' && normalizeExpressionType(getSchema().type) === 'number' && !!steps.value)
  const simple=computed(()=>canSimplify.value && getValue()?.configuration?.[modeKey] !== 'formula')
  const labels=computed(()=>({value:t('collectorProcessing.conditionColumn0'),valueHint:t('collectorProcessing.conditionColumnHint0'),operator:t('collectorProcessing.operator'),constant:t('collectorProcessing.constant'),operators:([
    {value:'add',symbol:'＋',icon:'PlusOutlined'},{value:'subtract',symbol:'−',icon:'MinusOutlined'},{value:'multiply',symbol:'×',icon:'CloseOutlined'},{value:'divide',symbol:'÷',icon:'PercentageOutlined'},
  ] as const).map(item=>({...item,label:t('collectorProcessing.'+item.value),description:t('collectorProcessing.'+item.value+'Hint')}))}))
  const context = computed<ExpressionEditorContext>(()=>({
    references:[{ id:'currentValue',path:[],label:t('collectorProcessing.conditionColumn0'),icon:'NumberOutlined',description:t('collectorProcessing.conditionColumnHint0'),schema:getSchema() },
      ...(key === 'deadband' ? [{ id:'lastValue',path:[],label:t('collectorProcessing.previousValue'),icon:'HistoryOutlined',description:t('collectorProcessing.previousValueHint'),schema:getSchema() }] : [])],
    // 输入类型通过 schema 交给公共组件，它按当前选区的参数/返回类型控制候选。
    functions:catalog.functions.value,
  }))
  function start() { if (!value.value) return; pending.value=JSON.parse(JSON.stringify(value.value));invalid.value=false;editing.value=true }
  function cancel() { editing.value=false;invalid.value=false;typeError.value=false;pending.value=undefined;stepDraft.value=undefined }
  function update(next:StructuredExpression) { pending.value=next;typeError.value=false;invalid.value=false }
  function done(finish:()=>boolean) {
    if (!finish() || invalid.value || !pending.value) return
    const actual=expressionNodeType(pending.value.root,context.value),expected=key === 'converter' ? normalizeExpressionType(getSchema().type) : 'boolean'
    // 与属性预处理一致：转换公式的显式空值表示忽略样本，不属于类型错误。
    if (!(key === 'converter' && actual === 'null') && actual !== 'unknown' && expected !== 'unknown' && actual !== expected) { invalid.value=true;typeError.value=true;return }
    const old = getValue()
    setValue({ ...old,enabled:true,provider:'expression',configuration:{ ...old?.configuration,[field]:pending.value,[modeKey]:'formula' } })
    cancel()
  }
  function updateSteps(next:ArithmeticStepValues) {
    stepDraft.value=next
    const tree=buildArithmeticSteps(next,currentValue);invalid.value=!tree
    if(tree){const old=getValue();setValue({...old,enabled:true,provider:'expression',configuration:{...old?.configuration,[field]:tree,[modeKey]:'simple'}})}
  }
  function simplify() { if(canSimplify.value && steps.value) updateSteps(steps.value) }
  function resetSimple() { cancel();updateSteps(readArithmeticSteps(expression(currentValue),currentValue)!) }
  return { value,context,editing,invalid,typeError,pending,start,cancel,update,done,simple,canSimplify,simplify,resetSimple,steps,labels,updateSteps,functionsError:catalog.error,refreshFunctions:catalog.refresh }
}
