import type { CollectorObject, PointRow } from '../types/workspace'
import { objectDisplayState, objectTone, stateValue } from '../types/workspace'

export type WorkspaceSort = 'newest' | 'name' | 'pointKey' | 'attention' | 'duration' | 'gap' | 'filtered'
/** A query-time index contains scalar summaries, never the latest value or per-node metric trees. */
export interface WorkspaceRuntimeIndex { state: string; priority: number; duration?: number; gap?: number; filtered?: number }
export const pointIndexMetrics = ['lastCollectionTimeNanos', 'expectedIntervalMillis', 'receivedAgeNanos', 'lastReceivedIntervalNanos', 'filteredOutlierSamples', 'filteredUnchangedSamples', 'filteredDeadbandSamples', 'filteredConversionSamples']
export const collectorIndexMetrics = ['lastTaskTimeNanos', 'pending', ...pointIndexMetrics.slice(4)]
export const runtimeSort = (sort: WorkspaceSort) => ['attention', 'duration', 'gap', 'filtered'].includes(sort)
export const runtimeFilter = (state: string) => !!state && !['enabled', 'disabled'].includes(state)

export function workspaceRuntimeIndex(object: CollectorObject): WorkspaceRuntimeIndex {
  const monitoring = object.monitoring
  const interval = monitoring?.receivedIntervalNanos
  const age = monitoring?.receivedAgeNanos
  const expected = monitoring?.expectedIntervalMillis
  const counts = monitoring?.pointSummary?.states || {}
  const tone = objectTone(object)
  const inactive = ['disabled', 'stopped', 'paused'].includes(stateValue(object.state))
  const priority = inactive ? 4 : tone === 'bad' || Object.entries(counts).some(([state, count]) => count > 0 && ['collectionError', 'failed', 'open'].includes(state)) ? 0
    : tone === 'warn' || monitoring?.pending || monitoring?.pointSummary?.longGap ? 1 : tone === 'gray' ? 2 : 3
  return { state: stateValue(objectDisplayState(object)), priority, duration: monitoring?.durationNanos,
    gap: expected && interval != null ? Math.max(interval, age || 0) / (expected * 1e6) : undefined, filtered: monitoring?.filteredTotal }
}

/** Missing runtime measurements sort last; IDs break ties without relying on database page boundaries. */
export function workspaceOrder(objects: CollectorObject[], sort: WorkspaceSort, search: string, state: string, index: Map<string, WorkspaceRuntimeIndex>): string[] {
  const text = search.trim().toLocaleLowerCase()
  const visible = objects.filter(object => {
    if (object.id.startsWith('_new:')) return true
    if (text && ![object.name, object.pointKey, object.address].some(value => value?.toLocaleLowerCase().includes(text))) return false
    if (!state) return true
    if (!runtimeFilter(state)) return stateValue(object.state) === state
    const value = index.get(object.id)
    if (!value) return false
    if (state === 'attention') return value.priority <= 1
    if (state === 'running') return ['running', 'recovered'].includes(value.state)
    if (state === 'protection') return ['open', 'retrying', 'halfOpen'].includes(value.state)
    return value.state === state
  })
  const numeric = (a: number | undefined, b: number | undefined, ascending = false) => a == null ? b == null ? 0 : 1 : b == null ? -1 : ascending ? a - b : b - a
  return visible.sort((a, b) => {
    if (a.id.startsWith('_new:') !== b.id.startsWith('_new:')) return a.id.startsWith('_new:') ? -1 : 1
    const left = index.get(a.id), right = index.get(b.id)
    const compared = sort === 'attention' ? numeric(left?.priority, right?.priority, true)
      : runtimeSort(sort) ? numeric(left?.[sort as 'duration' | 'gap' | 'filtered'], right?.[sort as 'duration' | 'gap' | 'filtered'])
      : sort === 'newest' ? Number(b.createTime || 0) - Number(a.createTime || 0)
      : String(sort === 'pointKey' ? a.pointKey || '' : a.name).localeCompare(String(sort === 'pointKey' ? b.pointKey || '' : b.name), undefined, { numeric: true })
    return compared || a.id.localeCompare(b.id)
  }).map(object => object.id)
}
export type PointBatchAction = 'enable' | 'disable' | 'read'
export interface PointSelection {
  keys: string[]
  total: number
  busy: boolean
  blocked: boolean
  feedback: string
  failed: boolean
}

/** Sort the whole query, with a unique tie-breaker for rows created together. */
export function workspaceSorts(sort: WorkspaceSort) {
  return [{ name: sort === 'newest' ? 'createTime' : sort, order: sort === 'newest' ? 'desc' : 'asc' }, { name: 'id', order: 'asc' }]
}

export function savedPointIds(points: PointRow[]) {
  return points.filter(point => !point.id.startsWith('_new:')).map(point => point.id)
}

export function batchTargets(points: PointRow[], keys: string[], action: PointBatchAction) {
  const checked = new Set(keys)
  const targetState = action === 'enable' ? 'enabled' : 'disabled'
  return points.filter(point => checked.has(point.id) && !point.id.startsWith('_new:') && (action === 'read' || stateValue(point.state) !== targetState)).map(point => point.id)
}

/** Never submit an empty query: it could change every point. */
export function pointBatchQuery(collectorId: string, ids: string[]) {
  if (!collectorId || !ids.length) throw new Error('A collector and point IDs are required')
  return { terms: [{ column: 'collectorId', value: collectorId }, { column: 'id', termType: 'in', value: ids }] }
}
