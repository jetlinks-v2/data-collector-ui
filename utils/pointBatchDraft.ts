import { cloneDeep, isEqual } from 'lodash-es'
import { accessValues, stateValue, type CollectorObject, type PointRow } from '../types/workspace'
import type { BatchField, PointBatchAdapter, PointBatchRow } from '../types/pointBatch'

export const batchFields: BatchField[] = ['name', 'pointKey', 'address', 'codec', 'accessModes', 'interval']

/** Editing starts from full configuration, never from a lightweight directory projection. */
export function editableBatchPoint(point: PointRow): PointRow {
  const result = cloneDeep(point)
  delete result.latest; delete result.runtime; delete result.monitoring; delete result.metadata
  result.accessModes = accessValues(point)
  result.features = (point.features || []).map(stateValue)
  result.configuration ||= {}; result.managedConfiguration ||= {}
  return result
}
export function batchRow(point: PointRow, adapter?: PointBatchAdapter, existing = true): PointBatchRow {
  const value = editableBatchPoint(point)
  const address = adapter?.getAddress?.(value) || value.address || ''
  return { key: value.id, point: value, baseline: existing ? cloneDeep(value) : undefined, baselineAddress: existing ? address : undefined, address }
}
export function changedBatchRow(row: PointBatchRow): boolean {
  return !!row.deleted || !row.baseline || !isEqual(row.point, row.baseline) || row.address !== row.baselineAddress || Object.values(row.fieldErrors || {}).some(Boolean) || Object.values(row.ruleErrors || {}).some(Boolean) || !!Object.keys(row.inputs || {}).length
}
export function batchFieldValue(row: PointBatchRow, field: BatchField): string {
  if (field === 'address') return row.address
  if (field === 'codec') return row.point.managedConfiguration?.codec || ''
  if (field === 'byteLayout') return row.point.managedConfiguration?.byteLayout || ''
  if (field === 'accessModes') return accessValues(row.point).join(',')
  if (field === 'interval' && row.intervalInput != null) return row.intervalInput
  return String(row.point[field] ?? '')
}
/** A failed protocol conversion retains entered text without mutating the last valid configuration. */
export function setBatchField(row: PointBatchRow, field: BatchField, input: string, adapter?: PointBatchAdapter): void {
  row.saveError = undefined
  if (row.fieldErrors) delete row.fieldErrors[field]
  if (field === 'address') {
    row.address = input
    if (!adapter?.setAddress) throw new Error('addressReadOnly')
    const point = cloneDeep(row.point)
    try { adapter.setAddress(point, input); row.point = point }
    catch (cause) { (row.fieldErrors ||= {}).address = cause instanceof Error ? cause.message : String(cause) }
  } else if (field === 'codec') {
    if (!adapter?.setCodec || adapter.isAutoCodec?.(row.point)) throw new Error('typeReadOnly')
    const point = cloneDeep(row.point)
    adapter.setCodec(point, input)
    row.point = point
  } else if (field === 'byteLayout') {
    if(adapter?.isAutoCodec?.(row.point)){throw new Error('typeReadOnly')}
    (row.point.managedConfiguration ||= {}).byteLayout = input
  } else if (field === 'accessModes') {
    row.point.accessModes = input.split(/[,，\s]+/).filter(Boolean)
  } else if (field === 'interval') {
    // Empty cannot silently clear an existing value. Zero is a valid subscription-only interval.
    row.intervalInput = input
    row.point.interval = input.trim() ? Number(input) : NaN
    if ('interval' in (row.point.configuration || {})) row.point.configuration.interval = row.point.interval
  } else row.point[field] = input
}
export function newBatchPoint(collector: CollectorObject, id: string): PointRow {
  const template = cloneDeep(collector.configuration?.template || {})
  return {
    ...template, id, name: '', pointKey: `point_${id.slice(0, 12)}`, provider: collector.provider, collectorId: collector.id, channelId: collector.channelId,
    configuration: cloneDeep(template.configuration || {}), managedConfiguration: cloneDeep(template.managedConfiguration || {}),
    interval: template.interval ?? 1000, accessModes: template.accessModes || ['read'], features: template.features || [],
  }
}
export function batchIssues(rows: PointBatchRow[], directory: PointRow[], adapter?: PointBatchAdapter): Map<string, string[]> {
  const replacing = new Set(rows.flatMap(row => row.baseline ? [row.point.id] : []))
  const keys = new Map<string, number>()
  for (const point of directory) if (!replacing.has(point.id) && point.pointKey) keys.set(point.pointKey, (keys.get(point.pointKey) || 0) + 1)
  for (const row of rows) if (!row.deleted && row.point.pointKey) keys.set(row.point.pointKey, (keys.get(row.point.pointKey) || 0) + 1)
  return new Map(rows.map(row => {
    if (row.deleted) return [row.key, row.saveError ? [row.saveError] : []]
    const errors: string[] = []
    if (!row.point.name?.trim()) errors.push('nameRequired')
    if ((!row.baseline || row.point.pointKey !== row.baseline.pointKey) && !row.point.pointKey?.trim()) errors.push('keyRequired')
    if ((!row.baseline || row.point.pointKey !== row.baseline.pointKey) && row.point.pointKey && (keys.get(row.point.pointKey) || 0) > 1) errors.push('duplicateKey')
    const interval = row.intervalInput == null ? row.point.interval : row.intervalInput.trim() ? Number(row.intervalInput) : NaN
    if (interval != null && (!Number.isSafeInteger(interval) || interval < 0 || interval > 2147483647)) errors.push('invalidInterval')
    const modes = accessValues(row.point)
    if (!modes.length || modes.some(mode => !['read', 'write', 'subscribe'].includes(mode))) errors.push('invalidAccess')
    errors.push(...Object.values(row.fieldErrors || {}).filter((value): value is string => !!value))
    errors.push(...Object.values(row.ruleErrors || {}).filter(Boolean))
    if(row.validationError)errors.push(row.validationError)
    if (!row.baseline && !row.address && !adapter?.columns?.length) errors.push('addressRequired')
    if (row.saveError) errors.push(row.saveError)
    return [row.key, errors]
  }))
}
/** Send explicit editable data only. Persistent identities and every untouched plugin field survive. */
export function batchPayload(row: PointBatchRow): PointRow {
  const point = editableBatchPoint(row.point)
  return point
}

/** Three-way merge applies edited leaves and rejects concurrent edits to the same value. */
export function mergeBatchPoint(row: PointBatchRow, current?: PointRow): PointRow {
  if (!row.baseline) {
    // Stable client identities make an interrupted batch retry idempotent.
    if (current) {
      const remote = editableBatchPoint(current)
      for (const key of Object.keys(row.point) as Array<keyof PointRow>) {
        if (key === 'address') continue
        const localValue = key === 'state' ? stateValue(row.point.state) : row.point[key]
        const remoteValue = key === 'state' ? stateValue(remote.state) : remote[key]
        if (!isEqual(localValue, remoteValue)) throw new Error('remoteConflict')
      }
    }
    return batchPayload(row)
  }
  if (!current) throw new Error('remoteDeleted')
  const merge = (base: any, draft: any, remote: any): any => {
    if (isEqual(base, draft)) return cloneDeep(remote)
    if (isEqual(base, remote) || isEqual(draft, remote)) return cloneDeep(draft)
    if (base && draft && remote && [base, draft, remote].every(value => typeof value === 'object' && !Array.isArray(value))) {
      const output = cloneDeep(remote)
      for (const key of new Set([...Object.keys(base), ...Object.keys(draft)])) output[key] = merge(base[key], draft[key], remote[key])
      return output
    }
    throw new Error('remoteConflict')
  }
  return merge(row.baseline, row.point, editableBatchPoint(current))
}
