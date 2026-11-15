import { computed, onBeforeUnmount, ref, watch, type Ref } from 'vue'
import { debounce } from 'lodash-es'
import { useUserStore } from '@jetlinks-web-core/store'
import type { CollectorObject } from '../../../types/workspace'
import type { PointBatchRow } from '../../../types/pointBatch'
import { changedBatchRow } from '../../../utils/pointBatchDraft'

/** Only dirty configuration is retained, scoped to the signed-in user and collector. */
export function useBatchDraftStorage(collector: Ref<CollectorObject | undefined>, rows: Ref<PointBatchRow[]>, active: Ref<boolean>) {
  const user = useUserStore(), failed = ref(false), recoveryFailed = ref(false)
  let ownerKey = '', ownerUser = ''
  const key = () => user.userInfo.id && collector.value?.id ? `collector-batch:v1:${user.userInfo.id}:${collector.value.id}` : ''
  function write() {
    if (!active.value || !ownerKey || ownerUser !== user.userInfo.id) return
    try {
      const dirty = rows.value.filter(changedBatchRow)
      if (dirty.length) localStorage.setItem(ownerKey, JSON.stringify({ version: 1, rows: dirty }))
      else localStorage.removeItem(ownerKey)
      failed.value = false
    } catch { failed.value = true }
  }
  const schedule = debounce(write, 350)
  watch(rows, schedule, { deep: true })
  function restore(): PointBatchRow[] {
    schedule.cancel(); ownerKey = key(); ownerUser = user.userInfo.id || ''; failed.value = false; recoveryFailed.value = false
    if (!ownerKey) return []
    try {
      const document = JSON.parse(localStorage.getItem(ownerKey) || 'null')
      if (!document) return []
      if (document.version !== 1 || !Array.isArray(document.rows)) { recoveryFailed.value = true; return [] }
      const restored = document.rows.filter((row: any) => row && typeof row.key === 'string' && typeof row.address === 'string'
        && row.point && row.point.id === row.key && typeof row.point.name === 'string'
        && row.point.configuration && typeof row.point.configuration === 'object' && !Array.isArray(row.point.configuration)
        && (!row.baseline || row.baseline.id === row.point.id))
      recoveryFailed.value = restored.length !== document.rows.length
      return restored
    } catch { recoveryFailed.value = true; return [] }
  }
  const flush = () => { schedule.cancel(); write() }
  window.addEventListener('beforeunload', flush)
  onBeforeUnmount(() => { flush(); window.removeEventListener('beforeunload', flush) })
  return { restore, flush, failed, recoveryFailed, available: computed(() => !!user.userInfo.id) }
}
