import { accessValues } from '../types/workspace'
import type { BatchFilterColumn, PointBatchAdapter, PointBatchFilters, PointBatchRow } from '../types/pointBatch'
import { pointBatchColumnText } from './pointBatchColumns'

export function emptyBatchFilters(): PointBatchFilters { return { identity: '', address: '', plugins:{}, byteLayout:'', codecs: [], accessModes: [], minimum: undefined, maximum: undefined } }
export function batchFilterActive(filters: PointBatchFilters, column: BatchFilterColumn): boolean {
  if (column === 'codec') return !!filters.codecs.length
  if (column === 'accessModes') return !!filters.accessModes.length
  if (column === 'interval') return filters.minimum != null || filters.maximum != null
  if(column.startsWith('plugin:'))return !!filters.plugins[column.slice(7)]?.trim()
  return !!filters[column as 'identity'|'address'|'byteLayout'].trim()
}
export function batchCodecKey(row: PointBatchRow, adapter?: PointBatchAdapter): string {
  return adapter?.isAutoCodec?.(row.point) ? '__auto__' : row.point.managedConfiguration?.codec || '__plugin__'
}
/** Local display filters never discard drafts or alter their persistent identities. */
export function matchesBatchFilters(row: PointBatchRow, filters: PointBatchFilters, adapter?: PointBatchAdapter): boolean {
  const identity = filters.identity.trim().toLocaleLowerCase(), address = filters.address.trim().toLocaleLowerCase()
  if (identity && ![row.point.name, row.point.pointKey].some(value => value?.toLocaleLowerCase().includes(identity))) return false
  if (address) {
    const configuration = adapter?.columns?.map(column => pointBatchColumnText(column, row.point)).join(' ') || row.address
    if (!configuration.toLocaleLowerCase().includes(address)) return false
  }
  for(const [key,value] of Object.entries(filters.plugins)) {
    if(!value.trim())continue
    const column=adapter?.columns?.find(column=>column.dataIndex===key)
    if(!column || !pointBatchColumnText(column,row.point).toLocaleLowerCase().includes(value.trim().toLocaleLowerCase()))return false
  }
  if(filters.byteLayout.trim() && !String(row.point.managedConfiguration?.byteLayout || '').toLocaleLowerCase().includes(filters.byteLayout.trim().toLocaleLowerCase()))return false
  if (filters.codecs.length && !filters.codecs.includes(batchCodecKey(row, adapter))) return false
  if (filters.accessModes.length && !accessValues(row.point).some(mode => filters.accessModes.includes(mode))) return false
  const interval = row.intervalInput == null ? row.point.interval : row.intervalInput.trim() ? Number(row.intervalInput) : NaN
  if ((filters.minimum != null || filters.maximum != null) && (interval == null || !Number.isFinite(interval))) return false
  return (filters.minimum == null || interval! >= filters.minimum) && (filters.maximum == null || interval! <= filters.maximum)
}
