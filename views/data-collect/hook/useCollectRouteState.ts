import { reactive, watch, onBeforeUnmount } from 'vue'
import { useRoute, useRouter, type LocationQuery } from 'vue-router'
import { decodeConditionFilterQuery, encodeConditionFilterQuery } from '@jetlinks-web-core/components/ConditionFilter'
import { pointSearchFields } from '../components/Point/columns'
import type { CollectFilters, CollectListState, ScopeType } from './context'

const arrayKeys = ['provider', 'runningState', 'state', 'collectorState'] as const
const boolKeys = ['channel', 'collector', 'point'] as const
const text = (value: unknown) => typeof value === 'string' ? value : ''
export const createCollectFilters = (): CollectFilters => ({
  channel: false, collector: false, point: false,
  provider: [], runningState: [], state: [], collectorState: [],
})
export function readCollectRoute(query: LocationQuery): CollectListState {
  const filters = createCollectFilters()
  arrayKeys.forEach(key => {
    const values = query[key]
    filters[key] = (Array.isArray(values) ? values : values ? [values] : []).filter((v): v is string => typeof v === 'string')
  })
  boolKeys.forEach(key => { filters[key] = query['error-' + key] === '1' })
  return {
    scopeType: ['channel', 'collector'].includes(text(query.scopeType)) ? query.scopeType as ScopeType : 'all',
    scopeId: text(query.scopeId),
    pointType: ['running', 'stopped'].includes(text(query.pointState)) ? query.pointState as 'running' | 'stopped' : 'total',
    terms: decodeConditionFilterQuery(query.q, pointSearchFields),
    page: Math.max(1, Math.floor(Number(query.page) || 1)),
    pageSize: [10, 20, 50, 100].includes(Number(query.pageSize)) ? Number(query.pageSize) : 10,
    sort: ['name', 'modifyTime', 'interval'].includes(text(query.sort)) ? text(query.sort) : '',
    order: query.order === 'asc' ? 'asc' : 'desc',
    viewType: query.view === 'separate' ? 'separate' : 'compact',
    treeSearch: text(query.treeSearch), filters,
  }
}
export function collectRouteQuery(state: CollectListState) {
  const query: Record<string, string | string[] | undefined> = {
    scopeType: state.scopeType === 'all' ? undefined : state.scopeType,
    scopeId: state.scopeType === 'all' ? undefined : state.scopeId,
    pointState: state.pointType === 'total' ? undefined : state.pointType,
    q: encodeConditionFilterQuery(state.terms, pointSearchFields) || undefined,
    page: state.page > 1 ? String(state.page) : undefined,
    pageSize: state.pageSize === 10 ? undefined : String(state.pageSize),
    sort: state.sort || undefined, order: state.sort ? state.order : undefined,
    view: state.viewType === 'separate' ? 'separate' : undefined,
    treeSearch: state.treeSearch || undefined,
  }
  arrayKeys.forEach(key => { query[key] = state.filters[key].length ? state.filters[key] : undefined })
  boolKeys.forEach(key => { query['error-' + key] = state.filters[key] ? '1' : undefined })
  return query
}
/** 路由是列表返回状态的持久载体；恢复一次完整状态，避免各子组件重复写回。 */
export function useCollectRouteState() {
  const route = useRoute(), router = useRouter()
  const listPath = route.path
  const state = reactive(readCollectRoute(route.query))
  let restoring = false
  let active = true
  const pendingWrites = new Set<string>()
  watch(() => route.query, query => {
    if (route.path !== listPath || pendingWrites.has(route.fullPath)) return
    const next = readCollectRoute(query)
    if (JSON.stringify(next) === JSON.stringify(state)) return
    restoring = true
    Object.assign(state.filters, next.filters)
    Object.assign(state, { ...next, filters: state.filters })
    restoring = false
  }, { flush: 'sync' })
  watch(state, () => {
    if (restoring || !active || route.path !== listPath) return
    const query = { ...route.query, ...collectRouteQuery(state) }
    const target = router.resolve({ path: listPath, query })
    if (target.fullPath !== route.fullPath) {
      pendingWrites.add(target.fullPath)
      void router.replace({ path: listPath, query }).finally(() => pendingWrites.delete(target.fullPath))
    }
  }, { deep: true })
  onBeforeUnmount(() => { active = false })
  return state
}
