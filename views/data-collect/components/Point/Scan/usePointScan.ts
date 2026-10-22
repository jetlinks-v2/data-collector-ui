import { computed, onBeforeUnmount, provide, ref, shallowRef, watch } from 'vue'
import type { Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import { savePointBatch } from '@data-collector-ui/api/data-collect/collector'
import { devGetProtocol } from '@data-collector-ui/utils/utils'
import { applyCollectorPointTemplate } from './data'
import type { CollectorPointSummary } from '../types'

type ScanRow = Record<string, unknown>
interface ScanSetting {
  columns: unknown[]
  selectedData: ScanRow[]
  handleData?: (rows: ScanRow[]) => ScanRow[]
}
interface ScanEditor {
  onSave: () => Promise<ScanRow[] | false>
}

/** 协议负责发现和字段转换，页面统一管理加载、模板默认值与批量保存。 */
export function usePointScan(collector: Ref<CollectorPointSummary>, onSaved: () => void) {
  const { t } = useI18n()
  const scanSetting = ref<ScanSetting>({ columns: [], selectedData: [] })
  const jsonData = ref<string>()
  const renderRef = shallowRef<ScanEditor>()
  const loading = ref(false)
  const loadFailed = ref(false)
  const renderReady = ref(false)
  const renderFailed = ref(false)
  const saveLoading = ref(false)
  const ready = computed(() => renderReady.value && !loading.value && !loadFailed.value && !renderFailed.value)
  let requestVersion = 0

  // 重试会卸载旧协议及其选择状态，避免将旧采集器的点位提交给当前采集器。
  const load = async () => {
    const version = ++requestVersion
    jsonData.value = undefined
    scanSetting.value = { columns: [], selectedData: [] }
    loading.value = true
    loadFailed.value = false
    renderReady.value = false
    renderFailed.value = false
    try {
      if (!collector.value.provider) throw new Error('Missing protocol')
      const source = await devGetProtocol(collector.value.provider, 'scan')
      if (version !== requestVersion) return
      if (typeof source !== 'string' || !source.trim()) throw new Error('Protocol unavailable')
      jsonData.value = source
    } catch {
      if (version === requestVersion) loadFailed.value = true
    } finally {
      if (version === requestVersion) loading.value = false
    }
  }

  // 校验和网络请求共享提交锁；失败后保留草稿，重复点击不会新增重复点位。
  const handleSave = async () => {
    if (saveLoading.value || !ready.value) return
    saveLoading.value = true
    const version = requestVersion
    try {
      const data = await renderRef.value?.onSave()
      if (data === false || version !== requestVersion) return
      const handleData = scanSetting.value.handleData
      const list = data?.length && typeof handleData === 'function' ? handleData(data) : []
      if (!Array.isArray(list) || !list.length) {
        onlyMessage(t('Virtual.PointAssign.400159-2'), 'warning')
        return
      }
      // 扫描插件仅识别点位，沿用采集器模板作为新增点位的默认配置。
      const response = await savePointBatch(applyCollectorPointTemplate(list, collector.value))
      if (response.success && version === requestVersion) {
        onlyMessage(t('DataCollect.index.400151-11'))
        onSaved()
      }
    } catch {
      // 编辑校验和请求层负责具体错误提示，页面保留当前已选点位。
    } finally {
      saveLoading.value = false
    }
  }

  provide('plugin-scan-point', scanSetting)
  provide('collector-data', collector)
  watch(() => [collector.value.id, collector.value.provider], load, { immediate: true })
  onBeforeUnmount(() => { requestVersion++ })

  return {
    scanSetting, jsonData, renderRef, loading, loadFailed, renderReady, renderFailed,
    saveLoading, ready, load, handleSave,
  }
}
