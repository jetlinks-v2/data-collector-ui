import { computed, onBeforeUnmount, provide, ref, shallowRef, watch } from 'vue'
import { onBeforeRouteLeave, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { omit } from 'lodash-es'
import { onlyMessage } from '@jetlinks-web/utils'
import { useMenuStore } from '@jetlinks-web-core/store'
import { detail, savePointBatch } from '@data-collector-ui/api/data-collect/collector'
import { devGetProtocol } from '@data-collector-ui/utils/utils'
import { pointBatchSaveKey } from './context'
import type { CollectorPointSummary } from '../types'

interface PointBatchEditor {
  onSave: () => Promise<Record<string, unknown>[] | false>
}

/** 管理当前采集器的协议加载、校验提交及返回定位，忽略已离开路由的响应。 */
export function usePointBatchSave() {
  const route = useRoute()
  const menuStore = useMenuStore()
  const { t } = useI18n()
  const collector = ref<CollectorPointSummary>({})
  const jsonData = ref<string>()
  const pointBatchRef = shallowRef<PointBatchEditor>()
  const loading = ref(false)
  const loadFailed = ref(false)
  const renderReady = ref(false)
  const renderFailed = ref(false)
  const saveLoading = ref(false)
  const hasTable = ref(false)
  const ready = computed(() => renderReady.value && !loading.value && !renderFailed.value)
  let requestVersion = 0

  const backToList = () => menuStore.jumpPage('data-collect')

  // 每次重载先卸载旧协议，防止切换采集器时保存上一份表格。
  const load = async () => {
    const version = ++requestVersion
    const id = String(route.params.id || '')
    loading.value = true
    loadFailed.value = false
    renderFailed.value = false
    renderReady.value = false
    jsonData.value = undefined
    collector.value = {}
    try {
      if (!id) throw new Error('Missing collector ID')
      const response = await detail(id)
      if (version !== requestVersion) return
      if (!response.success || !response.result) throw new Error('Collector unavailable')
      collector.value = response.result as CollectorPointSummary
      const source = await devGetProtocol(collector.value.provider || 'OPC_UA', 'pointBatch')
      if (version !== requestVersion) return
      if (typeof source !== 'string' || !source.trim()) throw new Error('Protocol unavailable')
      jsonData.value = source
    } catch {
      if (version === requestVersion) loadFailed.value = true
    } finally {
      if (version === requestVersion) loading.value = false
    }
  }

  // 校验也纳入提交锁，连续点击不会发送重复请求；编辑辅助字段不进入接口。
  const handleSave = async () => {
    if (saveLoading.value || !ready.value) return
    saveLoading.value = true
    const version = requestVersion
    try {
      const rows = await pointBatchRef.value?.onSave()
      if (!rows || version !== requestVersion) return
      const response = await savePointBatch(rows.map(row => omit(row, ['__dataIndex', '__serial', 'sames', 'id'])))
      if (response.success && version === requestVersion) {
        onlyMessage(t('DataCollect.index.400152-14'))
        backToList()
      }
    } catch {
      // 字段校验由编辑表格定位；请求错误由共享 request 层反馈，保留编辑草稿。
    } finally {
      saveLoading.value = false
    }
  }

  provide('point-batch-collector-data', collector)
  provide(pointBatchSaveKey, { saving: saveLoading, ready, hasTable, save: handleSave })
  watch(() => route.params.id, load, { immediate: true })
  onBeforeUnmount(() => { requestVersion++ })
  onBeforeRouteLeave((to) => {
    sessionStorage.setItem('collector-patch-add-key', to.name === 'data-collect' ? String(route.params.id || '') : '')
  })

  return {
    collector, jsonData, pointBatchRef, loading, loadFailed, renderReady, renderFailed,
    saveLoading, hasTable, ready, load, handleSave, backToList,
  }
}
