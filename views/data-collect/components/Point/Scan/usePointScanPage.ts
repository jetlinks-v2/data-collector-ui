import { onBeforeUnmount, ref, watch } from 'vue'
import { onBeforeRouteLeave, useRoute } from 'vue-router'
import { useMenuStore } from '@jetlinks-web-core/store'
import { detail } from '@data-collector-ui/api/data-collect/collector'
import type { CollectorPointSummary } from '../types'

/** 管理扫描页采集器加载与返回定位，切换路由时丢弃上一采集器的响应。 */
export function usePointScanPage() {
  const route = useRoute()
  const menuStore = useMenuStore()
  const collector = ref<CollectorPointSummary>({})
  const loading = ref(false)
  const loadFailed = ref(false)
  let requestVersion = 0

  const backToList = () => menuStore.jumpPage('data-collect')

  const load = async () => {
    const version = ++requestVersion
    const id = String(route.params.id || '')
    collector.value = {}
    loading.value = true
    loadFailed.value = false
    try {
      if (!id) throw new Error('Missing collector ID')
      const response = await detail(id)
      if (version !== requestVersion) return
      if (!response.success || !response.result) throw new Error('Collector unavailable')
      collector.value = response.result as CollectorPointSummary
    } catch {
      if (version === requestVersion) loadFailed.value = true
    } finally {
      if (version === requestVersion) loading.value = false
    }
  }

  watch(() => route.params.id, load, { immediate: true })
  onBeforeUnmount(() => { requestVersion++ })
  onBeforeRouteLeave((to) => {
    sessionStorage.setItem('collector-patch-add-key', to.name === 'data-collect' ? String(route.params.id || '') : '')
  })

  return { collector, loading, loadFailed, load, backToList }
}
