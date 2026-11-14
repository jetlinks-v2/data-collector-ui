import type { RecordedAction } from '../types/workspace'

/** Project one execution onto its own clock; wall-clock fallback is explicitly approximate. */
export function recordingTimeline(actions: RecordedAction[]) {
  const started = actions.filter(action => action.timestamp > 0)
  const precise = started.every(action => action.startOffsetNanos != null)
  const origin = started.length ? Math.min(...started.map(action => precise ? action.startOffsetNanos! : action.timestamp * 1e6)) : 0
  const starts = new Map(started.map(action => [action.id, Math.max(0, (precise ? action.startOffsetNanos! : action.timestamp * 1e6) - origin)]))
  const total = Math.max(0, ...started.map(action => starts.get(action.id)! + action.useNanos))
  const divisor = total >= 1e9 ? 1e9 : total >= 1e6 ? 1e6 : 1e3
  const unit = divisor === 1e9 ? 's' : divisor === 1e6 ? 'ms' : 'μs'
  const depths = new Map<number, number>(), ends = new Map<number, number>()
  const rows = actions.map(action => {
    const start = starts.get(action.id), depth = Math.min(3, action.parentId < 0 ? 0 : (depths.get(action.parentId) ?? 0) + 1)
    depths.set(action.id, depth)
    const previousEnd = ends.get(action.parentId) ?? starts.get(action.parentId) ?? 0
    const gap = start == null ? 0 : Math.max(0, start - previousEnd)
    if (start != null) ends.set(action.parentId, Math.max(previousEnd, start + action.useNanos))
    return { action, start, gap, depth, left: total && start != null ? start / total * 100 : 0, width: total ? action.useNanos / total * 100 : 0 }
  })
  return { rows, total, precise, divisor, unit, ticks: [0, total / 2, total] }
}

export function timelineNumber(nanos: number, divisor: number) {
  return Number((nanos / divisor).toFixed(2)).toString()
}
