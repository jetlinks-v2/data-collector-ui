import { inject, type InjectionKey, type Ref } from 'vue'
import type { ConditionFilterTerm } from '@jetlinks-web-core/components/ConditionFilter'

export type ScopeType = 'all' | 'channel' | 'collector'
export interface EnumValue { value: string; text: string }
// 协议扩展配置具有动态字段，业务宿主只约束公共字段。
export interface CollectRecord {
  id?: string
  name?: string
  identifier?: string
  description?: string
  provider?: string
  channelId?: string
  channelName?: string
  collectorId?: string
  collectorName?: string
  state?: EnumValue
  runningState?: EnumValue
  accessModes?: EnumValue[]
  features?: EnumValue[]
  modifyTime?: number
  interval?: number
  address?: string | number
  configuration?: Record<string, any>
  managedConfiguration?: Record<string, any>
  pointStateCount?: { running?: number; stopped?: number }
  [key: string]: any
}
export interface PointRecord extends CollectRecord { id: string }
export interface CollectFilters {
  channel: boolean; collector: boolean; point: boolean
  provider: string[]; runningState: string[]; state: string[]; collectorState: string[]
}
export interface CollectListState {
  scopeType: ScopeType
  scopeId: string
  pointType: 'total' | 'running' | 'stopped'
  terms: ConditionFilterTerm[]
  page: number
  pageSize: number
  sort: string
  order: 'asc' | 'desc'
  viewType: 'compact' | 'separate'
  treeSearch: string
  filters: CollectFilters
}
export interface CollectContext {
  state: CollectListState
  current: Ref<CollectRecord>
  ready: Ref<boolean>
  refreshAll: () => Promise<void>
}
export const COLLECT_LIST = Symbol('collect-list') as InjectionKey<CollectContext>
export function useCollectContext() {
  const context = inject(COLLECT_LIST)
  if (!context) throw new Error('Missing data collection page context')
  return context
}
