import { nextTick, onScopeDispose, ref, shallowRef, watch, type Ref } from 'vue'
import { useResizeObserver } from '@vueuse/core'
import { throttle } from 'lodash-es'

interface PointPage<Row> {
  success: boolean
  result?: { data: Row[]; total?: number }
}

/** 管理点位追加分页；查询范围重置后忽略旧响应，失败时保留已加载数据与待重试页码。 */
export const usePointTablePagination = <Row extends { id: string }>(
  request: (pageIndex: number, pageSize: number) => Promise<PointPage<Row>>,
  container: Ref<HTMLElement | undefined>,
) => {
  const rows = shallowRef<Row[]>([])
  const loading = ref(false)
  const failed = ref(false)
  const hasMore = ref(true)
  const pageSize = 12
  let pageIndex = 0
  let revision = 0
  let previousScrollTop = 0

  const getBody = () => container.value?.querySelector<HTMLElement>('.ant-table-body')

  // 同一时刻只请求一页；成功后才推进页码，便于失败重试。
  const loadMore = async () => {
    if (loading.value || !hasMore.value) return
    const currentRevision = revision
    loading.value = true
    failed.value = false
    try {
      const response = await request(pageIndex, pageSize)
      if (currentRevision !== revision) return
      if (!response.success || !Array.isArray(response.result?.data)) {
        failed.value = true
        return
      }
      const page = response.result.data
      // ID 去重保留已加载行；结束判定按服务端分页位置，避免重复行导致无限请求。
      rows.value = [...new Map([...rows.value, ...page].map(row => [row.id, row])).values()]
      pageIndex++
      hasMore.value = page.length === pageSize &&
        (response.result.total == null || pageIndex * pageSize < response.result.total)
    } catch {
      if (currentRevision === revision) failed.value = true
    } finally {
      if (currentRevision === revision) loading.value = false
    }
  }

  // 筛选、排序或采集器变化时建立新查询，旧响应不能覆盖新列表。
  const reload = () => {
    revision++
    pageIndex = 0
    previousScrollTop = 0
    rows.value = []
    loading.value = false
    failed.value = false
    hasMore.value = true
    const body = getBody()
    if (body) body.scrollTop = 0
    return loadMore()
  }

  // scroll 不冒泡，由外层捕获实际表体事件；横向滚动不触发翻页。
  const onScroll = throttle((event: Event) => {
    const body = getBody()
    if (!body || event.target !== body) return
    const changed = body.scrollTop !== previousScrollTop
    previousScrollTop = body.scrollTop
    if (changed && body.scrollHeight - body.scrollTop - body.clientHeight <= 48) {
      void loadMore()
    }
  }, 150)

  // 首屏或窗口放大后不足一屏时继续填充，否则没有滚动条便无法触发下一页。
  const fillViewport = () => {
    const body = getBody()
    if (!failed.value && body && body.clientHeight > 0 && body.scrollHeight <= body.clientHeight + 1) {
      void loadMore()
    }
  }
  watch([rows, container], async () => {
    await nextTick()
    fillViewport()
  })
  useResizeObserver(container, fillViewport)
  onScopeDispose(() => {
    revision++
    onScroll.cancel()
  })

  return { rows, loading, failed, hasMore, loadMore, reload, onScroll }
}
