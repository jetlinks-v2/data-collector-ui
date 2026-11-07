import { onScopeDispose, ref, shallowRef } from 'vue'

interface PointPage<Row> {
  success: boolean
  result?: { data: Row[]; total?: number }
}
/** 服务端分页只接受当前版本响应；删除后越界自动回退，失败保留可重试页码。 */
export function usePointTablePagination<Row extends { id: string }>(
  request: (pageIndex: number, pageSize: number) => Promise<PointPage<Row>>,
) {
  const rows = shallowRef<Row[]>([])
  const total = ref(0), current = ref(1), pageSize = ref(10)
  const loading = ref(false), failed = ref(false)
  let revision = 0
  const load = async (page = current.value, size = pageSize.value): Promise<void> => {
    const version = ++revision
    current.value = Math.max(1, page)
    pageSize.value = size
    rows.value = []
    loading.value = true
    failed.value = false
    try {
      const response = await request(current.value - 1, size)
      if (version !== revision) return
      if (!response.success || !Array.isArray(response.result?.data) || response.result.total == null) {
        throw new Error('Invalid point page')
      }
      total.value = response.result.total
      const last = Math.max(1, Math.ceil(total.value / size))
      if (current.value > last) {
        await load(last, size)
        return
      }
      rows.value = response.result.data
    } catch {
      if (version === revision) failed.value = true
    } finally {
      if (version === revision) loading.value = false
    }
  }
  const invalidate = () => { revision++; rows.value = []; loading.value = false }
  onScopeDispose(invalidate)
  return { rows, total, current, pageSize, loading, failed, load, invalidate }
}
