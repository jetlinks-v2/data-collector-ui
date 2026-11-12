import { computed, onBeforeUnmount, provide, ref, watch } from 'vue'
import { onBeforeRouteLeave, onBeforeRouteUpdate, useRoute, useRouter } from 'vue-router'
import { Modal } from 'ant-design-vue'
import { useI18n } from 'vue-i18n'
import { cloneDeep, omit, set } from 'lodash-es'
import { useMenuStore } from '@jetlinks-web-core/store'
import { onlyMessage } from '@jetlinks-web/utils'
import { pointDetail, updatePoint, removePoint, detail } from '@data-collector-ui/api/data-collect/collector'
import { DATA_COLLECTOR_SAVE_TYPE } from '../../../data'
import type { CollectRecord } from '../../../hook/context'
import { POINT_PERSISTENCE, type PointEditor } from './detailContext'
import { pointReturnLocation } from './pointDetailNavigation'

const tabKeys = ['Info', 'AdvancedConfiguration', 'HistoryData', 'RelatedDevice', 'PointLogs', 'Alarm']
export function usePointDetail() {
  const { t: $t } = useI18n()
  const route = useRoute(), router = useRouter(), menu = useMenuStore()
  const info = ref<CollectRecord>({})
  const collector = ref<CollectRecord>({})
  const loading = ref(false), error = ref<'error' | '403' | '404' | ''>('')
  const saving = ref(false), saveFailed = ref(false), editing = ref(false)
  const editOpen = ref(false)
  const errors = ref<unknown[]>([])
  const editor = ref<PointEditor>()
  const modalEditor = ref<PointEditor>()
  const summaryRevision = ref(0)
  const currentEditor = () => editOpen.value ? modalEditor.value : editor.value
  const pending = ref<Partial<CollectRecord>>()
  const activeKey = ref('Info')
  const tabs = computed(() => [
    { key: 'Info', label: $t('DataCollect.index.400151-31') },
    { key: 'AdvancedConfiguration', label: $t('DataCollect.index.400151-32') },
    { key: 'HistoryData', label: $t('DataCollect.index.400151-33') },
    { key: 'RelatedDevice', label: $t('DataCollect.index.400152-0') },
    { key: 'PointLogs', label: $t('DataCollect.index.400151-34') },
    { key: 'Alarm', label: $t('DataCollect.index.400151-35') },
  ])
  let generation = 0
  let saveSequence = Promise.resolve(true)
  let queuedSaves = 0
  let bypassLeave = false
  const load = async () => {
    const token = ++generation
    info.value = {}
    error.value = ''
    loading.value = true
    try {
      const id = String(route.params.id || '')
      if (!id) { error.value = '404'; return }
      const response = await pointDetail(id)
      if (token !== generation) return
      if (!response.success || !response.result?.id) {
        error.value = response.status === 403 ? '403' : response.status === 404 ? '404' : 'error'
        return
      }
      info.value = response.result
    } catch (exception: any) {
      if (token === generation) error.value = exception?.response?.status === 403 ? '403' : exception?.response?.status === 404 ? '404' : 'error'
    } finally { if (token === generation) loading.value = false }
  }
  /** 保存按顺序提交，失败保留待重试草稿；旧页面的响应不能回写新点位。 */
  function save(patch: Partial<CollectRecord>): Promise<boolean> {
    const id = info.value.id
    if (!id) return Promise.resolve(false)
    const token = generation
    const requested = cloneDeep(patch)
    queuedSaves++
    saving.value = true
    saveSequence = saveSequence.then(async () => {
      if (token !== generation) { queuedSaves--; return false }
      // 前一项可能在排队期间失败；执行时合并，避免后续成功保存清掉失败草稿。
      const draft = { ...pending.value, ...requested }
      try {
        const body = omit({ ...info.value, ...draft }, ['runningState', 'modifierId', 'modifyTime', 'state', 'creatorId', 'createTime'])
        const response = await updatePoint(id, body)
        if (token !== generation) return false
        if (!response.success) throw new Error('Point save failed')
        const fresh = await pointDetail(id)
        if (token !== generation) return false
        info.value = fresh.success ? fresh.result : { ...info.value, ...draft }
        pending.value = undefined
        saveFailed.value = false
        return true
      } catch {
        if (token === generation) { pending.value = draft; saveFailed.value = true }
        return false
      } finally {
        queuedSaves--
        if (token === generation) saving.value = queuedSaves > 0
      }
    })
    return saveSequence
  }
  function saveField(name: string, value: unknown) {
    const patch = set({}, name, value)
    return save(patch)
  }
  async function retry() {
    if (currentEditor()?.isDirty?.()) return currentEditor()!.flush()
    return pending.value ? save(pending.value) : true
  }
  async function allowLeave() {
    if (bypassLeave) return true
    await saveSequence
    if (currentEditor()?.isDirty?.()) await currentEditor()!.flush()
    else if (pending.value) await save(pending.value)
    if (!saveFailed.value && !errors.value.length && !currentEditor()?.isDirty?.()) return true
    return new Promise<boolean>(resolve => Modal.confirm({
      title: $t('PointWorkspace.unsavedTitle'), content: $t('PointWorkspace.unsavedDescription'),
      okText: $t('PointWorkspace.discard'), cancelText: $t('PointWorkspace.keepEditing'),
      onOk: () => {
        currentEditor()?.discard?.()
        pending.value = undefined; saveFailed.value = false; errors.value = []; summaryRevision.value++
        resolve(true)
      },
      onCancel: () => resolve(false),
    }))
  }
  async function changeTab(key: string) {
    if (activeKey.value === key || !tabKeys.includes(key) || !(await allowLeave())) return
    activeKey.value = key
  }
  function backToList() {
    const entry = menu.getMenu('data-collect')
    if (!entry) return
    const list = router.resolve({ name: entry.routeName || 'data-collect' })
    return router.push(pointReturnLocation(router, list, route.query.returnTo))
  }
  async function remove() {
    const response = await removePoint(info.value.id || '')
    if (!response.success) return
    bypassLeave = true
    onlyMessage($t('Point.index.400149-14'))
    await backToList()
  }
  async function edit() {
    if (!(await allowLeave())) return
    editing.value = true
    const token = generation
    try {
      const response = await detail(info.value.collectorId || '')
      if (token !== generation) return
      if (!response.success) throw new Error('Collector unavailable')
      collector.value = response.result
      editOpen.value = true
    } catch { onlyMessage($t('PointWorkspace.loadFailed'), 'error') }
    finally { if (token === generation) editing.value = false }
  }
  async function refresh() {
    const id = info.value.id
    const token = generation
    if (!id) return
    const response = await pointDetail(id)
    if (token === generation && response.success) info.value = response.result
  }
  provide(DATA_COLLECTOR_SAVE_TYPE, 'collector')
  provide('point-info', info)
  provide('point-info-error-list', errors)
  provide('point-refresh', { refresh })
  provide(POINT_PERSISTENCE, { save })
  onBeforeRouteLeave(allowLeave)
  onBeforeRouteUpdate(async to => to.params.id === route.params.id || await allowLeave())
  function beforeUnload(event: BeforeUnloadEvent) {
    if (saving.value || saveFailed.value || errors.value.length || currentEditor()?.isDirty?.()) {
      event.preventDefault(); event.returnValue = ''
    }
  }
  window.addEventListener('beforeunload', beforeUnload)
  watch(() => route.params.id, () => {
    saving.value = false
    activeKey.value = 'Info'; errors.value = []; pending.value = undefined; saveFailed.value = false
    void load()
  }, { immediate: true })
  onBeforeUnmount(() => { generation++; window.removeEventListener('beforeunload', beforeUnload) })
  return { $t, info, collector, loading, error, saving, saveFailed, editing, editOpen, editor, modalEditor, summaryRevision, activeKey, tabs,
    load, saveField, retry, changeTab, backToList, remove, edit, refresh }
}
