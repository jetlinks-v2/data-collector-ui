import { computed, nextTick, onBeforeUnmount, onMounted, provide, reactive, ref, watch } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Modal } from 'ant-design-vue'
import { useWorkspaceData } from './useWorkspaceData'
import { useWorkspaceRuntime } from './useWorkspaceRuntime'
import { usePointDraft } from './usePointDraft'
import { useWorkspaceActions } from './useWorkspaceActions'
import { COLLECTOR_DATA, COLLECTOR_TYPE, FOLD_TREE, REFRESH_HANDLER } from '../data'
import type { CollectorObject, EntityKind, PointRow, ProviderDescriptor } from '../../../types/workspace'

/** Layout and selection have one owner; Teleport moves the existing plugin form. */
export function useCollectionWorkspace() {
  const data = useWorkspaceData(), runtime = useWorkspaceRuntime(data.collector, data.paused, data.observation)
  const draft = usePointDraft(data.selectedPoint, data.collector, async (oldId, value) => {
    data.unsavedPoints.value = data.unsavedPoints.value.filter(point => point.id !== oldId)
    if (value?.id) {
      if (editingId.value === oldId) editingId.value = value.id
      data.selectedPointId.value = value.id
    }
    await data.loadPoints()
  })
  const batch = useWorkspaceActions(data, draft.hasChanges)
  const root = ref<HTMLElement>(), main = ref<HTMLElement>(), sidebar = ref<HTMLElement>(), drawerHost = ref<HTMLElement>(), editorHost = ref<HTMLElement>()
  const navigationTarget = ref<HTMLElement>(), editorTarget = ref<HTMLElement>()
  const drawerOpen = ref(false), folded = ref(false), narrow = ref(false), inline = ref(false)
  const view = ref<'cards' | 'table'>('cards'), editingId = ref(''), advanced = ref(false)
  const objectForm = ref<'channel' | 'collector'>(), diagnosticId = ref('')
  const configurationEditor = ref<{ dirty: boolean; saving: boolean }>()
  const choosingProvider = ref(false), setupProvider = ref<ProviderDescriptor>()
  const { t } = useI18n()
  provide(COLLECTOR_DATA, computed(() => data.collector.value || {}))
  provide(COLLECTOR_TYPE, computed(() => data.collector.value ? 'collector' : 'all'))
  provide(FOLD_TREE, folded)
  provide('filter-value', reactive({ channel: false, collector: false, point: false, provider: [], runningState: [], state: [], collectorState: [] }))
  provide(REFRESH_HANDLER, { refreshAll: refresh, refreshLeft: data.initialize, refreshRight: data.loadPoints })
  const diagnosticState = computed(() => ({ snapshot: runtime.snapshot.value, recording: runtime.recording.value, definitions: runtime.definitions.value, loading: runtime.loading.value, error: runtime.error.value || data.valueError.value }))
  async function refresh() { if (batch.busy.value) return; await data.initialize(); if (data.collector.value) await data.loadPoints() }
  async function confirmConfiguration() {
    if (configurationEditor.value?.saving) return false
    if (!configurationEditor.value?.dirty) return true
    return confirmDiscard()
  }
  function confirmDiscard() {
    return new Promise<boolean>(resolve => Modal.confirm({ title: t('collectorWorkspace.leaveDraft'), okText: t('collectorWorkspace.leave'), cancelText: t('collectorWorkspace.continueEditing'), onOk: () => resolve(true), onCancel: () => resolve(false) }))
  }
  let overviewScroll = 0
  async function select(value?: CollectorObject) {
    if (batch.busy.value || !await confirmConfiguration()) return
    drawerOpen.value = false
    // Selecting the current collector only dismisses navigation; keep its filters and draft.
    if (value && value.id === data.collector.value?.id) return
    if (!data.collector.value) overviewScroll = main.value?.scrollTop || 0
    closeDiagnostic(); data.select(value); editingId.value = ''; objectForm.value = undefined; choosingProvider.value = false; setupProvider.value = undefined
    await nextTick()
    if (main.value) main.value.scrollTop = value ? 0 : overviewScroll
  }
  async function cancelSetup() { if (await confirmConfiguration()) { setupProvider.value = undefined; choosingProvider.value = true } }
  async function editObject(kind?: 'channel' | 'collector') { if (await confirmConfiguration()) objectForm.value = kind }
  function selectPoint(id: string) { if (batch.busy.value) return; editingId.value = inline.value && editingId.value === id ? '' : id; data.selectedPointId.value = id }
  function closePoint() {
    if (draft.saving.value || batch.busy.value) return
    const trigger = root.value?.querySelector<HTMLButtonElement>('.cw-point-select[aria-pressed="true"]')
    // Hide the editor without changing the selected model or discarding its draft.
    editingId.value = ''
    void nextTick(() => trigger?.focus({ preventScroll: true }))
  }
  function addPoint() { if (batch.busy.value) return; const point = draft.add(); if (point) { data.unsavedPoints.value = [point, ...data.unsavedPoints.value]; data.points.value = [point, ...data.points.value]; data.filterPoints(); data.selectedPointId.value = point.id; editingId.value = point.id } }
  function diagnose(kind: EntityKind, object: CollectorObject) { diagnosticId.value = object.id; runtime.inspect(kind, object.id) }
  function diagnosticVisibility(point: PointRow, visible: boolean) { if (visible) diagnose('point', point); else if (diagnosticId.value === point.id) closeDiagnostic() }
  function closeDiagnostic() { diagnosticId.value = ''; runtime.close() }
  async function relocate() {
    await nextTick()
    navigationTarget.value = narrow.value || folded.value ? drawerHost.value : sidebar.value
    editorTarget.value = inline.value && editingId.value ? document.getElementById(`cw-editor-${editingId.value}`) || undefined : editorHost.value
  }
  let observer: ResizeObserver | undefined
  onMounted(() => {
    observer = new ResizeObserver(() => {
      narrow.value = (root.value?.clientWidth || 0) <= 800
      inline.value = (main.value?.clientWidth || 0) <= 680
      void relocate()
    })
    if (root.value) observer.observe(root.value)
    if (main.value) observer.observe(main.value)
    void data.initialize(); void relocate()
  })
  // Value updates must not trigger DOM relocation; only the visible point identities matter.
  const pointIds = computed(() => data.points.value.map(point => point.id).join(','))
  watch([narrow, folded, drawerOpen, inline, editingId, data.selectedPointId, pointIds], relocate, { flush: 'post' })
  watch(data.selectedPointId, id => { if (editingId.value && editingId.value !== id) editingId.value = '' })
  onBeforeRouteLeave(() => {
    if (configurationEditor.value?.saving) return false
    return draft.hasChanges.value || configurationEditor.value?.dirty ? confirmDiscard() : true
  })
  const preventLoss = (event: BeforeUnloadEvent) => { if (configurationEditor.value?.dirty) { event.preventDefault(); event.returnValue = '' } }
  window.addEventListener('beforeunload', preventLoss)
  onBeforeUnmount(() => { observer?.disconnect(); window.removeEventListener('beforeunload', preventLoss) })
  function visiblePoints(ids:string[]) { data.setVisiblePoints(ids);void relocate() }
  return { data, runtime, draft, batch, root, main, sidebar, drawerHost, editorHost, navigationTarget, editorTarget, configurationEditor, drawerOpen, folded, narrow, inline, view, editingId, advanced, objectForm, choosingProvider, setupProvider, diagnosticId, diagnosticState, refresh, select, cancelSetup, editObject, selectPoint, closePoint, addPoint, diagnose, diagnosticVisibility, closeDiagnostic, visiblePoints }
}
