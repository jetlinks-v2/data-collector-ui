import type { PointValueData } from '../utils/pointValue'

export type EntityKind = 'channel' | 'collector' | 'point'
export type StateValue = string | { value: string; text?: string }
// Plugin configuration is an open document; platform fields remain explicitly typed.
export type PluginConfiguration = Record<string, any>
export interface CollectorObject {
  id: string
  name: string
  provider: string
  description?: string
  icon?: string
  state?: StateValue
  runningState?: StateValue
  configuration: PluginConfiguration
  channelId?: string
  collectorId?: string
  channelName?: string
  serverId?: string
  pointNumber?: number
  pointStateCount?: Record<string, number>
  collectorNumber?: number
  pointKey?: string
  address?: string
  unit?: string
  interval?: number
  accessModes?: Array<string | { value: string; text?: string }>
  features?: string[]
  managedConfiguration?: PluginConfiguration
  metadata?: PointCapabilities
  modifyTime?: number
  createTime?: number
  runtime?: RuntimeSnapshot
  monitoring?: RuntimeMonitoring
}
export interface ProviderDescriptor { id: string; name: string; description?: string; icon?: string }
export interface RuntimeMetric { available: boolean; value: unknown }
export interface FailureSnapshot { timestamp: number; pointId?: string; stage: string; code: number; reason: string }
export interface MetricSnapshot {
  scope:string; instanceId:string; sampledAt:number; values:Record<string,RuntimeMetric>
  observations?:Record<string,MetricSnapshot>
  metadata?:{properties?:MetricDefinition[]}
}
export interface RuntimeSnapshot {
  id: string; serverId: string; available: boolean; state?: string; runtimeState?: string
  metrics?: MetricSnapshot
  lastFailure?: FailureSnapshot
  currentFailure?: FailureSnapshot | null
  protectionState?: 'open' | 'retrying' | 'halfOpen' | null
  pointSummary?: PointRuntimeSummary
}
export interface PointRuntimeSummary { total:number; available:number; states:Record<string,number>; scheduled?:number; awaitingFirst?:number; longGap?:number }
export interface CollectorMonitoringSnapshot { timestamp:number; collectors:RuntimeSnapshot[]; channels?:RuntimeSnapshot[] }
export interface RuntimeMonitoring {
  timestamp:number; nodeCount:number; pointSummary?:PointRuntimeSummary
  nodes?:RuntimeSnapshot[]
  taskRate?:number; sampleRate?:number; durationNanos?:number; pending?:number
  collectionRate?:number; outputRate?:number; filteredRate?:number
  filterRates?:Record<'outlier'|'unchanged'|'deadband'|'conversion',number|undefined>
  filteredTotal?:number; filterTotals?:RuntimeMonitoring['filterRates']
  outcomes?:{output:number; filtered:number; failed:number; cancelled:number; outOfOrder:number; rejected:number}
  processing?:number; outputFailures?:number
  expectedIntervalMillis?:number; collectionIntervalNanos?:number; receivedIntervalNanos?:number; outputIntervalNanos?:number
  receivedAgeNanos?:number; outputAgeNanos?:number; nextRetryTime?:number
  readRate?:number; writeRate?:number; activeConnections?:number
  rateWindowMillis?:number; collectionTotal?:number; receivedTotal?:number; outputTotal?:number
  cadence?:{ expectedMillis:number; count:number; intervalNanos?:number; ageNanos?:number; rate?:number; windowMillis?:number; quantityRatio?:number }
}
export interface MetricUnit { id?: string; value?: string; symbol?: string; name?: string; i18nName?: string }
export interface MetricDefinition { id: string; name?: string; i18nName?: string; description?: string; i18nDescription?: string; valueType?: { unit?: string | MetricUnit }; expands?: { metric?: MetricSemantics } }
/** 与 core 指标注解生成的扩展一致；引用属性均相对于当前观测对象。 */
export interface MetricSemantics {
  kind?: string; semantic?: string; statistic?: string; scope?: string
  sampleCountProperty?: string; availableProperty?: string; valueProperty?: string
  boundsProperty?: string; bucketMode?: string; boundary?: string; overflowBucket?: boolean
  windowStartProperty?: string; windowEndProperty?: string
}
export interface RecordedAction {
  id: number; parentId: number; action: string; status: string; timestamp: number; useNanos: number; startOffsetNanos?: number | null
  tags?: Record<string, unknown>; attributes?: Record<string, unknown>; errorType?: string; errorMessage?: string
}
export interface RecordingSnapshot {
  sessionId: string; collectorId: string; serverId: string; expiresAt: number; active: boolean; skippedExecutions: number
  executions: Array<{ id: number; status: string; failure?: FailureSnapshot; truncated: boolean; actions: RecordedAction[] }>
}
export interface CollectorObservation {
  timestamp:number
  nodes:Array<{ serverId:string; collector:RuntimeSnapshot; channel?:RuntimeSnapshot; points:Array<{id:string;runtime:RuntimeSnapshot;lastData?:PointValueData}> }>
}
export interface PointRow extends CollectorObject { latest?: PointValueData }
export interface PointCapabilities {
  autoCodec?: boolean; dataType?: { id?: string; type?: string; unit?: string }
  accessModes?: Array<{ value: string; text?: string }>; supportCodecs?: Array<{ id: string; name?: string }>
}
export const stateValue = (state?: StateValue): string => typeof state === 'string' ? state : state?.value || ''
export const accessValues = (point: CollectorObject): string[] => (point.accessModes || []).map(stateValue)

/** 保护状态与当前故障独立于生命周期；历史故障不能冒充仍在失败。 */
export function objectDisplayState(object: CollectorObject): StateValue | undefined {
  const managed = object.runtime?.state || stateValue(object.state)
  if (['disabled', 'stopped', 'paused'].includes(stateValue(object.state))) return object.state
  if (['stopped', 'paused'].includes(managed)) return managed
  if (object.runtime?.available === false) return 'unavailable'
  if (object.runtime?.protectionState) return object.runtime.protectionState
  if (object.runtime?.currentFailure) return 'collectionError'
  const state = object.runtime?.runtimeState || object.runningState
  if (stateValue(state) && stateValue(state) !== 'running') return state
  if (object.runtime?.lastFailure) return 'currentFailure' in object.runtime ? 'recovered' : 'recentError'
  return state
}
export function objectTone(object: CollectorObject): 'ok' | 'warn' | 'bad' | 'gray' {
  if (object.runtime?.available === false) return 'gray'
  const state = stateValue(objectDisplayState(object))
  if (['failed', 'allError', 'collectionError', 'open'].includes(state)) return 'bad'
  if (['partialError', 'partError', 'retrying', 'halfOpen', 'recentError'].includes(state)) return 'warn'
  return ['running', 'recovered'].includes(state) ? 'ok' : 'gray'
}
/** Backend enum text takes precedence; raw runtime states use the caller's locale. */
export function objectStateText(object: CollectorObject, translate?: (value: string) => string | undefined): string {
  const state = objectDisplayState(object)
  return (typeof state === 'object' && state.text) || translate?.(stateValue(state)) || stateValue(state)
}
export function pointAddress(point: CollectorObject): string {
  // The provider's metadata resolver owns the address syntax and presentation.
  return point.address || point.pointKey || (point.id.startsWith('_new:') ? '—' : point.id)
}
