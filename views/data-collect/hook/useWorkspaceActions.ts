import { computed, ref, watch, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { enablePoints, disablePoints } from '../../../api/data-collect/collector'
import { batchTargets, pointBatchQuery, savedPointIds, type PointBatchAction } from '../../../utils/workspaceList'
import type { useWorkspaceData } from './useWorkspaceData'

/** Selection covers the filtered directory, independent of the virtual viewport or open editor. */
export function useWorkspaceActions(data: ReturnType<typeof useWorkspaceData>, hasDraft: Ref<boolean>) {
  const { t } = useI18n()
  const keys = ref<string[]>([]), busy = ref(false), feedback = ref(''), failed = ref(false)
  const ids = computed(() => savedPointIds(data.filteredPoints.value))
  const state = computed(() => ({ keys: keys.value, total: ids.value.length, busy: busy.value, blocked: hasDraft.value, feedback: feedback.value, failed: failed.value }))
  function clear() { if (!busy.value) { keys.value = []; feedback.value = '' } }
  function check(value: string[]) {
    if (busy.value) return
    const allowed = new Set(ids.value)
    keys.value = [...new Set(value)].filter(id => allowed.has(id)); feedback.value = ''
  }
  function toggle(id: string) { check(keys.value.includes(id) ? keys.value.filter(key => key !== id) : [...keys.value, id]) }
  function all() { check(keys.value.length === ids.value.length ? [] : ids.value) }
  // Observation frames replace rows frequently; only identities reset the selection.
  watch(() => `${data.collector.value?.id || ''}:${ids.value.join(',')}`, clear)
  watch([data.pointSort, data.pointState, data.pointSearch], clear)
  async function run(action: PointBatchAction) {
    const collectorId = data.collector.value?.id
    if (!collectorId || busy.value || hasDraft.value || !keys.value.length) return
    const targets = batchTargets(data.points.value, keys.value, action)
    if (!targets.length) { failed.value = false; feedback.value = t('collectorList.noChange'); return }
    busy.value = true; feedback.value = ''; failed.value = false
    try {
      if (action === 'read') {
        const count = await data.trial(undefined, targets)
        if (count == null) throw new Error(data.valueError.value || t('collectorWorkspace.loadFailed'))
        failed.value = count !== targets.length
        feedback.value = t(failed.value ? 'collectorList.readPartial' : 'collectorList.readDone', { count, total: targets.length })
      } else {
        const response = await (action === 'enable' ? enablePoints : disablePoints)(pointBatchQuery(collectorId, targets))
        if (!response.success) throw new Error(response.message || t('collectorWorkspace.saveFailed'))
        const count = Number(response.result)
        failed.value = count !== targets.length
        feedback.value = t(failed.value ? 'collectorList.partial' : action === 'enable' ? 'collectorList.enabledDone' : 'collectorList.disabledDone', { count, total: targets.length })
        // Refresh actual state even when fewer rows were changed; never invent per-row success.
        if (data.collector.value?.id === collectorId) await data.loadPoints()
        if (!failed.value) keys.value = []
      }
    } catch (cause) {
      failed.value = true
      feedback.value = cause instanceof Error ? cause.message : String(cause)
    } finally { busy.value = false }
  }
  return { state, busy, check, toggle, all, clear, run }
}
