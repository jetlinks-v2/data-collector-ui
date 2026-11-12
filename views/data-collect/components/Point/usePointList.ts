import { computed, onActivated, onDeactivated, shallowRef, watch } from 'vue'
import { queryPoint, queryPointCount } from '@data-collector-ui/api/data-collect/collector'
import { cloneDeep } from 'lodash-es'
import { useCollectContext, type PointRecord } from '../../hook/context'
import { usePointTablePagination } from './usePointTablePagination'
import { buildPointListQuery } from './pointQuery'
import { usePointValues } from './usePointValues'

export function usePointList() {
  const { state, ready } = useCollectContext()
  const acceptedQuery = shallowRef<Awaited<ReturnType<typeof buildPointListQuery>>>()
  const queryKey = computed(() => JSON.stringify([
    state.scopeType, state.scopeId, state.pointType, state.terms, state.sort, state.order, state.filters,
  ]))
  const page = usePointTablePagination<PointRecord>(async (pageIndex, pageSize) => {
    acceptedQuery.value = undefined
    const snapshot = cloneDeep(state)
    const key = queryKey.value
    const query = await buildPointListQuery(snapshot)
    if (!query) return { success: true, result: { data: [], total: 0 } }
    const response = await queryPoint({ ...query, pageIndex, pageSize })
    // 可选计数兼容不返回 total 的转换查询接口。
    if (response.success && response.result?.total == null) {
      const count = await queryPointCount(query)
      if (!count.success) throw new Error('Point count unavailable')
      response.result.total = count.result
    }
    if (queryKey.value === key) acceptedQuery.value = query
    return response
  })
  let active = true
  async function reload() {
    if (!ready.value || !active) return
    await page.load(state.page, state.pageSize)
    if (!page.failed.value && page.current.value !== state.page) state.page = page.current.value
  }
  watch(() => [queryKey.value, state.page, state.pageSize, ready.value], reload, { immediate: true })
  onDeactivated(() => { active = false; page.invalidate() })
  onActivated(() => { active = true })
  const propertyValue = usePointValues(page.rows)
  const hasSearch = computed(() => Boolean(state.terms.length || state.pointType !== 'total' ||
    Object.values(state.filters).some(value => Array.isArray(value) ? value.length : value)))
  function changePage(current: number, size: number) {
    state.page = state.pageSize === size ? current : 1
    state.pageSize = size
  }
  return { ...page, state, reload, changePage, queryKey, acceptedQuery, propertyValue, hasSearch }
}
