import type { PointRow } from '../types/workspace'
import { stateValue } from '../types/workspace'

export type WorkspaceSort = 'newest' | 'name' | 'pointKey'
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
