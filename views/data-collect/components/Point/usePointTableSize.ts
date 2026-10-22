import { computed, nextTick, ref } from 'vue'
import type { Ref } from 'vue'
import { useResizeObserver } from '@vueuse/core'

interface TableViewportInstance {
  getTableWrapperRef: () => HTMLElement | undefined
}

/** 使用可视容器与真实表头高度计算虚拟表体高度，空态不随横向表格滚动。 */
export function usePointTableSize(tableRef?: Ref<TableViewportInstance | undefined>) {
  const viewport = ref<HTMLElement>()
  const headerHeight = ref(48)
  const availableHeight = ref(500)
  const bodyHeight = computed(() => Math.max(120, availableHeight.value - headerHeight.value))
  useResizeObserver(viewport, async () => {
    await nextTick()
    const wrapper = tableRef?.value?.getTableWrapperRef() || viewport.value
    const header = wrapper?.querySelector('.ant-table-header')
    headerHeight.value = header?.getBoundingClientRect().height || 48
    availableHeight.value = viewport.value?.clientHeight || 500
  })
  return { viewport, bodyHeight, headerHeight }
}
