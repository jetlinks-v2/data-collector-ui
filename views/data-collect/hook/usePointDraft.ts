import { computed, onBeforeUnmount, reactive, ref, shallowRef, watch, type Ref } from 'vue'
import { cloneDeep, isEqual } from 'lodash-es'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import { updatePoint, savePoint } from '../../../api/data-collect/collector'
import type { CollectorObject, PointRow } from '../../../types/workspace'
import { accessValues, stateValue } from '../../../types/workspace'
import { processingPending } from '../../../utils/processingDraft'

/** Keep only edited drafts; a clean selected row does not leave a permanent cached form. */
export function usePointDraft(point: Ref<PointRow | undefined>, collector: Ref<CollectorObject | undefined>, saved: (oldId: string, value?: PointRow) => Promise<void>) {
  const { t } = useI18n()
  function editable(value: PointRow): CollectorObject {
    const result = cloneDeep(value)
    delete result.latest
    result.accessModes = accessValues(result)
    result.features = (result.features || []).map(stateValue)
    result.configuration ||= {}; result.managedConfiguration ||= {}
    return result
  }
  const drafts = new Map<string, { model: CollectorObject; baseline: CollectorObject }>()
  const model = shallowRef<CollectorObject>(), baseline = shallowRef<CollectorObject>()
  const saving = ref(false), error = ref(''), revision = ref(0)
  const dirty = computed(() => !!model.value && (!isEqual(model.value, baseline.value) || processingPending(model.value)))
  const draftCount = ref(0), hasChanges = computed(() => dirty.value || draftCount.value > 0)
  watch([() => point.value?.id, () => stateValue(point.value?.state)], () => {
    const value = point.value
    if (model.value && baseline.value) {
      if (dirty.value) drafts.set(model.value.id, { model: model.value, baseline: baseline.value })
      else drafts.delete(model.value.id)
      draftCount.value = drafts.size
    }
    const draft = value && drafts.get(value.id)
    baseline.value = value ? draft?.baseline || editable(value) : undefined
    model.value = value ? draft?.model || reactive(editable(value)) : undefined
    error.value = ''
  }, { immediate: true })
  function restore() {
    if (!baseline.value) return
    drafts.delete(baseline.value.id); draftCount.value = drafts.size; model.value = reactive(cloneDeep(baseline.value)); ++revision.value; error.value = ''
  }
  async function apply(validate: () => Promise<unknown>) {
    const current = model.value
    if (!current || saving.value) return
    error.value = ''
    try {
      await validate(); saving.value = true
      const payload = cloneDeep(current); delete (payload as PointRow).latest
      const response = current.id.startsWith('_new:') ? await savePoint({ ...payload, id: undefined }) : await updatePoint(current.id, payload)
      if (!response.success) throw new Error(response.message || t('collectorWorkspace.saveFailed'))
      drafts.delete(current.id)
      draftCount.value = drafts.size
      if (model.value === current) baseline.value = cloneDeep(current)
      await saved(current.id, response.result)
      onlyMessage(t('collectorWorkspace.saved'))
    } catch (cause) {
      if (cause instanceof Error) error.value = cause.message
    } finally { saving.value = false }
  }
  function add() {
    const current = collector.value
    if (!current) return
    const template = cloneDeep(current.configuration?.template || {})
    const value: PointRow = { ...template, id: `_new:${Date.now()}`, name: '', provider: current.provider, collectorId: current.id, channelId: current.channelId, configuration: {}, interval: template.interval ?? 1000, accessModes: template.accessModes || ['read'], features: template.features || [], managedConfiguration: template.managedConfiguration || {} }
    // A new draft is supplied by the workspace as the selected row; it never starts collection automatically.
    return value
  }
  const preventLoss = (event: BeforeUnloadEvent) => { if (dirty.value || drafts.size) { event.preventDefault(); event.returnValue = '' } }
  window.addEventListener('beforeunload', preventLoss)
  onBeforeUnmount(() => window.removeEventListener('beforeunload', preventLoss))
  return { model, dirty, hasChanges, saving, error, revision, restore, apply, add }
}
