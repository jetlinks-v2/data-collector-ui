import type { PointRow } from './workspace'
import type { VNodeChild } from 'vue'
import type { PointBatchColumn } from '../views/data-collect/components/Point/BatchSave/components/usePointEditTable'

/** Reuse the established plugin column and form-component contract. */
export interface PointBatchPluginColumn extends PointBatchColumn<PointRow> {
  customRender?: (context: { text: unknown; record: PointRow; index: number }) => VNodeChild
}

/** Optional plugin functions keep protocol address rules outside the workspace. */
export interface PointBatchAdapter {
  columns?: PointBatchPluginColumn[]
  getAddress?(point: PointRow): string
  setAddress?(point: PointRow, text: string): void
  generate?(options: { start: string; count: number; codec?: string; step?: number }, template: PointRow): PointRow[]
  setCodec?(point: PointRow, codec: string): void
  validate?(point: PointRow): void
  isAutoCodec?(point: PointRow): boolean
}
export type BatchField = 'name' | 'pointKey' | 'address' | 'codec' | 'byteLayout' | 'accessModes' | 'interval'
export type BatchCellKey = BatchField | `plugin:${string}`
export interface PointBatchGridColumn {
  key: BatchCellKey
  title: string
  width: number
  field?: BatchField
  plugin?: PointBatchPluginColumn
}
export interface PointBatchRow {
  key: string
  /** Saved points remain in the local draft until deletion is confirmed. */
  deleted?: boolean
  point: PointRow
  baseline?: PointRow
  baselineAddress?: string
  address: string
  fieldErrors?: Record<string, string>
  ruleErrors?: Record<string, string>
  /** Raw values survive failed normalization without corrupting the last valid configuration. */
  inputs?: Record<string, unknown>
  validationError?: string
  intervalInput?: string
  saveError?: string
}
export type BatchFilterColumn = 'identity' | 'address' | 'codec' | 'byteLayout' | 'accessModes' | 'interval' | `plugin:${string}`
export interface PointBatchFilters {
  identity: string
  address: string
  plugins: Record<string, string>
  byteLayout: string
  codecs: string[]
  accessModes: string[]
  minimum?: number
  maximum?: number
}
