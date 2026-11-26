import type { PointValueData } from '../utils/pointValue'

export interface PointHistorySample {
  id: string
  timestamp: number
  receivedAt?: number
  value: unknown
  reason?: string
  origin?: string
  segment?: number
  dataType?: string
}
export interface StoredPointData {
  id?: string
  timestamp: number
  value: unknown
  numberValue?: unknown
  reason?: string
}
export interface PointHistoryBuffer {
  samples: PointHistorySample[]
  startedAt: number
  skipped: number
  evicted: number
}
export interface PointHistoryCapture {
  pointId: string
  collectorId: string
  data: PointValueData
  origin: string
}
