import { computed, ref, watch, type Ref } from 'vue'
import type { PointRecord } from '../../hook/context'

/** 普通勾选按 ID 跨页保留；查询变化清空，条件全选只在当前查询内生效。 */
export function usePointSelection(rows: Ref<PointRecord[]>, queryKey: Ref<string>) {
  const selected = ref(new Map<string, PointRecord>())
  const all = ref(false)
  const selectedRows = computed(() => all.value ? rows.value : [...selected.value.values()])
  const selectedKeys = computed(() => selectedRows.value.map(row => row.id))
  function clear() { selected.value.clear(); all.value = false }
  function toggleAll() { all.value = !all.value; selected.value.clear() }
  const rowSelection = computed(() => ({
    selectedRowKeys: selectedKeys.value,
    preserveSelectedRowKeys: true,
    onSelect: (row: PointRecord, checked: boolean) => {
      if (all.value) return
      if (checked) selected.value.set(row.id, row)
      else selected.value.delete(row.id)
    },
    onSelectAll: (checked: boolean, _rows: PointRecord[], changed: PointRecord[]) => {
      if (all.value) return
      changed.forEach(row => checked ? selected.value.set(row.id, row) : selected.value.delete(row.id))
    },
    onSelectNone: clear,
    getCheckboxProps: () => ({ disabled: all.value }),
  }))
  watch(queryKey, clear)
  watch(rows, current => current.forEach(row => { if (selected.value.has(row.id)) selected.value.set(row.id, row) }))
  return { all, selectedRows, selectedKeys, rowSelection, clear, toggleAll }
}
