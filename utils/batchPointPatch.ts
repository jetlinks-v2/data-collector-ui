interface BatchPointChanges {
  accessModes?: string[]
  interval?: number | null
}

interface BatchPointPatch {
  accessModes?: string[]
  configuration?: { interval: number }
}

/** Blank inputs mean unchanged; only explicit choices enter query-wide updates. */
export function buildBatchPointPatch(changes: BatchPointChanges): BatchPointPatch {
  const patch: BatchPointPatch = {}
  if (changes.accessModes?.length) patch.accessModes = [...changes.accessModes]
  if (changes.interval != null) patch.configuration = { interval: changes.interval }
  return patch
}

/** The configuration interval is authoritative; preserve every unrelated point setting. */
export function applyBatchPointPatch(point: Record<string, any>, patch: BatchPointPatch) {
  const result = { ...point }
  if (patch.accessModes) result.accessModes = [...patch.accessModes]
  else if (Array.isArray(result.accessModes)) result.accessModes = result.accessModes.map(mode => typeof mode === 'string' ? mode : mode.value)
  if (patch.configuration) {
    result.configuration = { ...point.configuration, ...patch.configuration }
    delete result.interval
  }
  return result
}
