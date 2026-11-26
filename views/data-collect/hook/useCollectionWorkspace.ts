import { computed, nextTick, onBeforeUnmount, onMounted, provide, reactive, ref, shallowReactive, shallowRef, watch } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import { useI18n } from 'vue-i18n'
import type { ResponsiveSplitter } from '@jetlinks-web-core/components'
import { Modal } from 'ant-design-vue'
import { useWorkspaceData } from './useWorkspaceData'
import { useWorkspaceRuntime } from './useWorkspaceRuntime'
import { usePointDraft } from './usePointDraft'
import { useWorkspaceActions } from './useWorkspaceActions'
import { useWorkspaceRoute } from './useWorkspaceRoute'
import { COLLECTOR_DATA, COLLECTOR_TYPE, FOLD_TREE, REFRESH_HANDLER } from '../data'
import type { CollectorObject, EntityKind, PointRow, ProviderDescriptor } from '../../../types/workspace'
import type { ObjectConfigurationDraft } from './useObjectConfiguration'

interface ObjectEditorTarget { kind:'channel'|'collector'; object:CollectorObject; anchor:HTMLElement; surface:'card'|'header'|'channel'; trigger?:HTMLElement }
interface ObjectEditorHandle { dirty:boolean; saving:boolean; prepared:boolean; snapshot:()=>ObjectConfigurationDraft }

/** Layout and selection have one owner; Teleport moves the existing plugin form. */
export function useCollectionWorkspace() {
  const data = useWorkspaceData(), runtime = useWorkspaceRuntime(data.collector, data.paused, data.observation, data.recording, data.recordingTarget, data)
  const draft = usePointDraft(data.selectedPoint, data.collector, async (oldId, value) => {
    if (value?.id) {
      data.applyPoint(oldId,value)
      if (editingId.value === oldId) editingId.value = value.id
    }
    await data.loadPoints()
  })
  const batch = useWorkspaceActions(data, draft.hasCurrentChanges)
  const root = ref<HTMLElement>(), main = ref<HTMLElement>(), content = ref<HTMLElement>()
  const navigation = ref<InstanceType<typeof ResponsiveSplitter>>()
  const editorTarget = ref<HTMLElement>()
  const folded = ref(false), inline = ref(false)
  const view = ref<'cards' | 'table'>('cards'), editingId = ref(''), advanced = ref(false)
  const objectForm = ref<'channel' | 'collector'>(), diagnosticId = ref('')
  const configurationEditor = ref<{ dirty: boolean; saving: boolean; prepareLeave?: () => void }>()
  watch([editingId,objectForm,configurationEditor,()=>batch.state.value.selecting],()=>{
    data.orderHeld.value=!!editingId.value || !!objectForm.value || !!configurationEditor.value || batch.state.value.selecting
  },{flush:'sync'})
  const objectTarget = shallowRef<ObjectEditorTarget>(), objectEditor = shallowRef<ObjectEditorHandle>()
  const objectDrafts = shallowReactive(new Map<string,ObjectConfigurationDraft>())
  const objectKey = computed(() => objectTarget.value ? `${objectTarget.value.kind}:${objectTarget.value.object.id}` : '')
  const objectValue = computed(() => {
    const target=objectTarget.value
    return target && (target.kind === 'channel' ? data.channels.value : data.collectors.value).find(item=>item.id === target.object.id) || target?.object
  })
  const objectDraft = computed(() => objectDrafts.get(objectKey.value))
  const sharedCount = computed(() => objectTarget.value?.kind === 'channel' ? objectValue.value?.collectorNumber ?? data.collectors.value.filter(item=>item.channelId === objectTarget.value?.object.id).length : 0)
  const configurationDirty = computed(() => !!configurationEditor.value?.dirty || !!objectEditor.value?.dirty || objectDrafts.size > 0)
  const configurationSaving = computed(() => !!configurationEditor.value?.saving || !!objectEditor.value?.saving)
  function stashObject() {
    if (!objectKey.value || !objectEditor.value) return
    if (objectEditor.value.dirty) objectDrafts.set(objectKey.value,objectEditor.value.snapshot())
    else objectDrafts.delete(objectKey.value)
  }
  watch(() => objectEditor.value?.dirty, dirty => { if(dirty === false)objectDrafts.delete(objectKey.value) })
  const choosingProvider = ref(false), setupProvider = ref<ProviderDescriptor>()
  const { t } = useI18n()
  provide(COLLECTOR_DATA, computed(() => data.collector.value || {}))
  provide(COLLECTOR_TYPE, computed(() => data.collector.value ? 'collector' : 'all'))
  provide(FOLD_TREE, folded)
  provide('filter-value', reactive({ channel: false, collector: false, point: false, provider: [], runningState: [], state: [], collectorState: [] }))
  provide(REFRESH_HANDLER, { refreshAll: refresh, refreshLeft: data.initialize, refreshRight: data.loadPoints })
  const diagnosticState = computed(() => ({ snapshot: runtime.snapshot.value, recording: runtime.recording.value, definitions: runtime.definitions.value, loading: runtime.loading.value, error: runtime.error.value || data.valueError.value }))
  async function refresh() { if (batch.busy.value) return; await data.initialize(); if (data.collector.value) await data.loadPoints() }
  watch(advanced, open => { if (!open) void refresh() })
  async function confirmConfiguration() {
    if (configurationSaving.value) return false
    configurationEditor.value?.prepareLeave?.()
    if (!configurationEditor.value?.dirty) return true
    return confirmDiscard()
  }
  function confirmDiscard() {
    return new Promise<boolean>(resolve => Modal.confirm({ title: t('collectorWorkspace.leaveDraft'), okText: t('collectorWorkspace.leave'), cancelText: t('collectorWorkspace.continueEditing'), onOk: () => resolve(true), onCancel: () => resolve(false) }))
  }
  const listPositions = new Map<string, { scroll: number; search: string; state: string; sort: typeof data.collectorSort.value }>()
  const navigate = useWorkspaceRoute(data, applySelection, () => !batch.busy.value && confirmConfiguration())
  const returnChannel = computed(() => navigate.parentScope.value.scopeType === 'channel' ? data.channels.value.find(item => item.id === navigate.parentScope.value.scopeId) : undefined)
  function returnToList() { return select(undefined, data.collector.value ? returnChannel.value : undefined) }
  function select(value?: CollectorObject, selectedChannel?:CollectorObject) {
    if (batch.busy.value || configurationSaving.value) return
    navigation.value?.close(main.value)
    if (value && value.id === data.collector.value?.id) return
    return navigate.select(value, selectedChannel)
  }
  function applySelection(value?: CollectorObject, selectedChannel?:CollectorObject) {
    closePoint(false)
    navigation.value?.close(main.value)
    if (!data.collector.value) listPositions.set(data.selectedChannelId.value || '', { scroll: content.value?.scrollTop || 0, search: data.search.value, state: data.collectorState.value, sort: data.collectorSort.value })
    const position = !value ? listPositions.get(selectedChannel?.id || '') : undefined
    if (position) { data.search.value = position.search; data.collectorState.value = position.state; data.collectorSort.value = position.sort }
    stashObject(); objectTarget.value=undefined; objectEditor.value=undefined
    closeDiagnostic(); data.select(value,selectedChannel?.id); editingId.value = ''; objectForm.value = undefined; choosingProvider.value = false; setupProvider.value = undefined
    void nextTick(() => { if (content.value) content.value.scrollTop = position?.scroll || 0 })
  }
  async function cancelSetup() { if (await confirmConfiguration()) { setupProvider.value = undefined; choosingProvider.value = true } }
  function startCollection() {
    const channel = data.selectedChannelId.value ? data.channel.value : undefined
    setupProvider.value = channel ? data.providers.value.find(provider => provider.id === channel.provider) : undefined
    choosingProvider.value = !setupProvider.value
  }
  function editObject(target?: ObjectEditorTarget, restoreFocus = true) {
    if (configurationSaving.value || batch.busy.value || draft.saving.value) return
    if (!target) { const trigger=objectTarget.value?.trigger; objectForm.value=undefined; if(restoreFocus)void nextTick(()=>trigger?.focus({preventScroll:true})); return }
    const nextKey=`${target.kind}:${target.object.id}`
    if(nextKey !== objectKey.value) { stashObject(); objectEditor.value=undefined }
    closePoint(); closeDiagnostic(); objectTarget.value=target; objectForm.value=target.kind
  }
  function objectSaved(value:CollectorObject) {
    if(!objectTarget.value)return
    objectDrafts.delete(objectKey.value)
    data.applyObject(objectTarget.value.kind,value)
  }
  function selectPoint(id: string) {
    if (batch.busy.value || configurationSaving.value) return
    // 多选沿用整卡操作范围，避免查看详情和勾选在同一次点击中竞争。
    if (batch.state.value.selecting) { batch.toggle(id); return }
    if(editingId.value && editingId.value !== id)closePoint(false)
    const settingsOpen = !!objectForm.value
    objectForm.value = undefined
    editingId.value = !settingsOpen && editingId.value === id ? '' : id; data.selectedPointId.value = id
  }
  function startBatch() {
    batch.start()
    if (batch.state.value.selecting) { closePoint(); closeDiagnostic() }
  }
  function closePoint(restoreFocus = true) {
    if (draft.saving.value || batch.busy.value) return
    const trigger = root.value?.querySelector<HTMLButtonElement>('.cw-point-select[aria-current="true"]')
    // Hide the editor without changing the selected model or discarding its draft.
    editingId.value = ''
    if(draft.model.value?.id.startsWith('_new:') && !draft.dirty.value)data.removePointDraft(draft.model.value.id)
    if(restoreFocus)void nextTick(() => trigger?.focus({ preventScroll: true }))
  }
  function addPoint() { if (batch.busy.value || configurationSaving.value) return; closePoint(false); objectForm.value = undefined; const point = draft.add(); if (point) { data.unsavedPoints.value = [point, ...data.unsavedPoints.value]; data.points.value = [point, ...data.points.value]; data.filterPoints(); data.selectedPointId.value = point.id; editingId.value = point.id } }
  function diagnose(kind: EntityKind, object: CollectorObject) { diagnosticId.value = object.id; runtime.inspect(kind, object.id) }
  function diagnosticVisibility(point: PointRow, visible: boolean) { if (visible) diagnose('point', point); else if (diagnosticId.value === point.id) closeDiagnostic() }
  function closeDiagnostic() { diagnosticId.value = ''; runtime.close() }
  let observer: ResizeObserver | undefined
  onMounted(() => {
    observer = new ResizeObserver(() => {
      inline.value = (main.value?.clientWidth || 0) <= 680
    })
    if (main.value) observer.observe(main.value)
    void data.initialize()
  })
  watch(data.selectedPointId, id => { if (editingId.value && editingId.value !== id) editingId.value = '' })
  onBeforeRouteLeave(() => {
    if (configurationSaving.value) return false
    return draft.hasChanges.value || configurationDirty.value ? confirmDiscard() : true
  })
  const preventLoss = (event: BeforeUnloadEvent) => { if (configurationDirty.value) { event.preventDefault(); event.returnValue = '' } }
  window.addEventListener('beforeunload', preventLoss)
  onBeforeUnmount(() => { observer?.disconnect(); window.removeEventListener('beforeunload', preventLoss) })
  function visiblePoints(ids:string[]) { data.setVisiblePoints(ids) }
  return { data, runtime, draft, batch, root, main, content, navigation, editorTarget, configurationEditor, objectTarget, objectKey, objectValue, objectDraft, objectEditor, sharedCount, objectSaved, folded, inline, view, editingId, advanced, objectForm, choosingProvider, setupProvider, startCollection, diagnosticId, diagnosticState, refresh, select, returnChannel, returnToList, cancelSetup, editObject, selectPoint, startBatch, closePoint, addPoint, diagnose, diagnosticVisibility, closeDiagnostic, visiblePoints }
}
