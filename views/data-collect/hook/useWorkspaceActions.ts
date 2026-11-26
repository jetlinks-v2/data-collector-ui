import { computed, ref, watch, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { enablePoints, disablePoints } from '../../../api/data-collect/collector'
import { batchTargets, pointBatchQuery, savedPointIds, type PointBatchAction } from '../../../utils/workspaceList'
import type { useWorkspaceData } from './useWorkspaceData'

/** Selection covers the filtered directory, independent of the virtual viewport or open editor. */
export function useWorkspaceActions(data: ReturnType<typeof useWorkspaceData>, hasDraft: Ref<boolean>) {
  const { t } = useI18n()
  const keys = ref<string[]>([]), selecting = ref(false), busy = ref(false), feedback = ref(''), failed = ref(false)
  const ids = computed(() => savedPointIds(data.filteredPoints.value))
  const state = computed(() => ({ selecting: selecting.value, keys: keys.value, total: ids.value.length, busy: busy.value || data.trialState.value.running, blocked: hasDraft.value, feedback: feedback.value, failed: failed.value }))
  function start() { if (!busy.value && !hasDraft.value && ids.value.length) selecting.value = true }
  function clear() { if (!busy.value) { selecting.value = false; keys.value = []; feedback.value = '' } }
  function check(value: string[]) {
    if (busy.value || !selecting.value) return
    const allowed = new Set(ids.value)
    keys.value = [...new Set(value)].filter(id => allowed.has(id)); feedback.value = ''
  }
  function toggle(id: string) { check(keys.value.includes(id) ? keys.value.filter(key => key !== id) : [...keys.value, id]) }
  function all() { check(keys.value.length === ids.value.length ? [] : ids.value) }
  watch(() => data.collector.value?.id, clear)
  // Directory refresh and live sorting must not cancel an explicit selection session.
  // Removed points leave the selection; newly arriving points are never selected implicitly.
  watch(ids, value => {
    if (busy.value || !selecting.value || !keys.value.length) return
    const allowed = new Set(value)
    keys.value = keys.value.filter(id => allowed.has(id))
  })
  watch([data.pointSort, data.pointState, data.pointSearch], clear)
  async function run(action: PointBatchAction) {
    const collectorId = data.collector.value?.id
    if (!collectorId || busy.value || data.trialState.value.running || hasDraft.value || !keys.value.length) return
    const targets = batchTargets(data.points.value, keys.value, action)
    if (!targets.length) { failed.value = false; feedback.value = t('collectorList.noChange'); return }
    busy.value = true; feedback.value = ''; failed.value = false
    try {
      if (action === 'read') {
        // The shared trial feedback owns progress, partial results, cancellation and errors.
        await data.trial(undefined, targets)
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
  return { state, busy, start, check, toggle, all, clear, run }
}
