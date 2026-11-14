import type { MetricDefinition, MetricSnapshot, RecordedAction, RecordingSnapshot, RuntimeSnapshot, RuntimeMetric } from '../types/workspace'

type Translate = (key: string) => string
export type RuntimeMetricGroup = 'current' | 'duration' | 'counter' | 'activity' | 'other'

/** 后端保留有界的最近执行、最近异常及在途执行；以语义入口替代不停变化的记录编号。 */
export function recordingChoices(executions:RecordingSnapshot['executions']) {
  return {latest:executions.at(-1),failed:executions.findLast(item=>item.failure || item.status === 'failed')}
}

/** 所有运行指标沿统一元数据解释；没有定义时仍保留原始标识与不可用值。 */
export function runtimeMetricRows(snapshot:RuntimeSnapshot|undefined,definitions:MetricDefinition[],time:(value:number)=>string,t:Translate) {
  const values:Record<string,RuntimeMetric>={}
  const sources:Record<string,MetricSnapshot>={}
  const metadata=new Map(definitions.map(item=>[item.id,item]))
  function flatten(metrics:MetricSnapshot|undefined,prefix=''){
    for(const [id,value] of Object.entries(metrics?.values || {})){
      values[prefix+id]=value
      if(metrics)sources[prefix+id]=metrics
    }
    for(const [scope,view] of Object.entries(metrics?.observations || {}))flatten(view,`${prefix}${scope}.`)
  }
  flatten(snapshot?.metrics)
  return Object.entries(values).map(([id,sample])=>{
    const definition=metadata.get(id)
    const semantic=definition?.expands?.metric?.semantic
    const metric=definition?.expands?.metric
    const source=sources[id]
    const related=(property?:string)=>property ? source?.values[property] : undefined
    const count=related(metric?.sampleCountProperty),availableValue=related(metric?.availableProperty)
    const available=sample.available && sample.value != null
      && (typeof sample.value !== 'number' || Number.isFinite(sample.value))
      && (!metric?.sampleCountProperty || (count?.available && typeof count.value === 'number' && count.value > 0))
      && (!metric?.availableProperty || (availableValue?.available && availableValue.value === true))
      && (semantic !== 'timestamp' || (typeof sample.value === 'number' && sample.value > 0))
    return {id,name:definition?.i18nName || definition?.name || id,description:definition?.i18nDescription || definition?.description,
      definition,available:Boolean(available),value:sample.value,instanceId:source?.instanceId,sampledAt:source?.sampledAt,
      bounds:related(metric?.boundsProperty)?.available ? related(metric?.boundsProperty)?.value : undefined,
      windowStart:related(metric?.windowStartProperty)?.value,windowEnd:related(metric?.windowEndProperty)?.value,
      emptyReason:!sample.available ? 'unavailable' : 'noSamples',
      group:metricGroup(definition),priority:metricPriority(definition),icon:semantic === 'timestamp' ? 'FieldTimeOutlined' : metric?.statistic === 'maximum' ? 'RiseOutlined' : semantic === 'duration' ? 'ClockCircleOutlined' : metric?.kind === 'counter' ? 'NumberOutlined' : 'DashboardOutlined',
      text:!available ? t(`collectorMonitoring.empty.${!sample.available ? 'unavailable' : 'noSamples'}`) : formatRuntimeMetric(sample.value,definition,time,t)}
  }).sort((left,right)=>left.priority-right.priority)
}

/** 沿公共指标语义分组；未知插件字段保留在其他组，不推断成错误或累计值。 */
function metricGroup(definition?:MetricDefinition):RuntimeMetricGroup {
  const metric=definition?.expands?.metric
  if(metric?.semantic === 'timestamp')return 'activity'
  if(metric?.kind === 'counter')return 'counter'
  if(metric?.semantic === 'duration')return 'duration'
  if(metric?.kind === 'gauge')return 'current'
  return 'other'
}

/** 完整指标浏览只过滤临时展示，不截断节点数据或隐藏未支持的值。 */
export function groupRuntimeMetricRows(rows:ReturnType<typeof runtimeMetricRows>,query='') {
  const keyword=query.trim().toLocaleLowerCase()
  const selected=keyword ? rows.filter(row=>`${row.name} ${row.id} ${row.description || ''}`.toLocaleLowerCase().includes(keyword)) : rows
  return (['current','duration','counter','activity','other'] as RuntimeMetricGroup[])
    .map(id=>({id,rows:selected.filter(row=>row.group === id)})).filter(group=>group.rows.length)
}

/** 注册视图的定义与值使用相同路径；无需按协议硬编码字段名或说明。 */
export function runtimeMetricDefinitions(metrics:MetricSnapshot|undefined,prefix=''):MetricDefinition[] {
  return [...(metrics?.metadata?.properties || []).map(item=>({...item,id:prefix+item.id})),
    ...Object.entries(metrics?.observations || {}).flatMap(([scope,view])=>runtimeMetricDefinitions(view,`${prefix}${scope}.`))]
}

/** Known byte and duration units share one display conversion; unknown plugin units retain their metadata. */
const durationScale: Record<string, number> = { nanoseconds: 1, microseconds: 1e3, milliseconds: 1e6, seconds: 1e9, minutes: 60e9, hours: 3600e9 }
const durationUnits = [[1, 'ns'], [1e3, 'μs'], [1e6, 'ms'], [1e9, 's'], [60e9, 'min'], [3600e9, 'h']] as const
const byteUnits = [[1, 'B'], [1e3, 'KB'], [1e6, 'MB'], [1e9, 'GB'], [1e12, 'TB']] as const
const unitSymbols: Record<string, string> = { bytes:'B',nanoseconds:'ns',microseconds:'μs',milliseconds:'ms',seconds:'s',minutes:'min',hours:'h' }
export function formatMetricQuantity(value: number, unit: string, formatNumber = (number: number) => number.toLocaleString(undefined, { maximumFractionDigits: 2 })) {
  const scale = durationScale[unit]
  if (!scale && unit !== 'bytes') return undefined
  const raw = scale ? value * scale : value
  const units = scale ? durationUnits : byteUnits
  let selected: readonly [number, string] = units[0]
  for (const candidate of units) {
    if (Math.abs(raw) < candidate[0]) break
    selected = candidate
  }
  return { value: formatNumber(raw / selected[0]), unit: selected[1] }
}

/** Units follow the platform metadata wire format, including plugin-defined units. */
export function formatRuntimeMetric(value: unknown, definition: MetricDefinition | undefined, time: (value: number) => string, t: Translate, scaleUnits = true): string {
  if (typeof value === 'boolean') return t(value ? 'collectorMonitoring.yes' : 'collectorMonitoring.no')
  if (typeof value !== 'number') return String(value)
  if (definition?.expands?.metric?.semantic === 'timestamp') return time(value)
  const unit = definition?.valueType?.unit
  const id = typeof unit === 'string' ? unit : unit?.id || unit?.value
  const text = Number.isInteger(value) ? value.toLocaleString() : value.toLocaleString(undefined, { maximumFractionDigits: 2 })
  const rateSuffix = definition?.expands?.metric?.statistic === 'rate' ? '/s' : ''
  const quantity = scaleUnits ? formatMetricQuantity(value, id || '') : undefined
  if (quantity) return `${quantity.value} ${quantity.unit}${rateSuffix}`
  const known = ['task', 'sample', 'event', 'operation', 'count'].includes(id || '')
  const label = known ? t(`collectorRuntime.units.${id}`) : typeof unit === 'string' ? unitSymbols[unit] || unit : unit?.symbol || unit?.i18nName || unit?.name || ''
  return `${text}${label ? ` ${label}` : ''}${rateSuffix}`
}

/** Prioritize current gauges; cumulative counters retain their historical meaning. */
export function metricPriority(definition?: MetricDefinition): number {
  const metric = definition?.expands?.metric
  if (metric?.kind === 'gauge' && metric.semantic === 'value') return 0
  if (metric?.semantic === 'duration' && metric.kind !== 'counter') return 1
  if (metric?.semantic === 'timestamp') return 2
  return 3
}

/** Result codes can report a failed read even when the recorder action completed. */
export function actionTone(action: RecordedAction): 'ok' | 'warn' | 'bad' | 'gray' {
  const attributes = action.attributes || {}
  const code = Number(attributes.code)
  if (action.errorType || action.status === 'failed' || attributes.success === false || (Number.isFinite(code) && (code >>> 31) === 1)) return 'bad'
  if (action.status === 'cancelled' || attributes.decision === 'filtered') return 'gray'
  if (action.status === 'running' || action.status === 'created') return 'warn'
  if (attributes.decision && !['accepted', 'passed'].includes(String(attributes.decision))) return 'warn'
  return 'ok'
}
