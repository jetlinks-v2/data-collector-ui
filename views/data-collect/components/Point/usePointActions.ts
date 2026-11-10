import { computed, onScopeDispose, provide, reactive, ref, watch, type Ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { cloneDeep } from 'lodash-es'
import { onlyMessage, downloadFileByUrl } from '@jetlinks-web/utils'
import { useMenuStore } from '@jetlinks-web-core/store'
import { detail, pointDetail, removePoint, batchDeletePoint, savePointBatch, enablePoints, disablePoints, deletePoints,
  exportPoint, exportTemplate, pointImport, queryCodecProvider } from '@data-collector-ui/api/data-collect/collector'
import { devGetProtocol } from '@data-collector-ui/utils/utils'
import { useCollectContext, type CollectRecord, type PointRecord } from '../../hook/context'
import { collectRouteQuery } from '../../hook/useCollectRouteState'
import type { usePointSelection } from './usePointSelection'
import type { buildPointListQuery } from './pointQuery'

type Selection = ReturnType<typeof usePointSelection>
type PointQuery = Awaited<ReturnType<typeof buildPointListQuery>>
export function usePointActions(selection: Selection, query: Ref<PointQuery>, rows: Ref<PointRecord[]>) {
  const { state, current: scope, refreshAll } = useCollectContext()
  const { t: $t } = useI18n()
  const menu = useMenuStore(), route = useRoute(), router = useRouter()
  const visible = reactive({ save: false, import: false, batchUpdate: false })
  const current = ref<CollectRecord>({}), formCollector = ref<CollectRecord>({})
  const editing = ref(false), busy = ref(false)
  const pointActions = reactive({ add: false, scan: false, batchAdd: false })
  const jsonData = ref(''), codecs = ref<any[]>([])
  let version = 0
  let editVersion = 0
  provide('point-actions', pointActions)
  provide('plugin-scan-point', ref({ columns: [], selectedData: [], handleData: undefined }))
  provide('collector-data', scope)
  provide('codec-list', codecs)
  watch(() => [state.scopeType, scope.value.id, scope.value.provider], async () => {
    const currentVersion = ++version
    Object.assign(pointActions, { add: false, scan: false, batchAdd: false })
    jsonData.value = ''
    if (state.scopeType !== 'collector' || !scope.value.provider) return
    if (scope.value.provider === 'COLLECTOR_GATEWAY') { pointActions.add = true; return }
    try {
      const component = await devGetProtocol(scope.value.provider, 'pointActions')
      if (version === currentVersion) jsonData.value = component
    } catch { if (version === currentVersion) jsonData.value = '' }
  }, { immediate: true })
  void queryCodecProvider().then((response: any) => {
    if (response.success) codecs.value = response.result.map((item: any) => ({ ...item, label: item.name, value: item.id }))
  })
  const saved = async () => { selection.clear(); await refreshAll() }
  function add() {
    formCollector.value = cloneDeep(scope.value)
    current.value = { collectorId: scope.value.id, provider: scope.value.provider }
    visible.save = true
  }
  async function edit(row: PointRecord) {
    const token = ++editVersion
    editing.value = true
    try {
      const [pointResponse, collectorResponse] = await Promise.all([pointDetail(row.id), detail(row.collectorId || '')])
      if (token !== editVersion) return
      if (!pointResponse.success || !collectorResponse.success) throw new Error('Point edit unavailable')
      current.value = pointResponse.result
      formCollector.value = collectorResponse.result
      visible.save = true
    } catch { onlyMessage($t('PointWorkspace.loadFailed'), 'error') }
    finally { if (token === editVersion) editing.value = false }
  }
  function view(row: PointRecord) {
    const returnTo = router.resolve({ path: route.path, query: { ...route.query, ...collectRouteQuery(state) } }).fullPath
    menu.jumpPage('data-collect/PointDetail', { params: { id: row.id }, query: { returnTo } })
  }
  async function remove(row: PointRecord) {
    const response = await removePoint(row.id)
    if (response.success) { onlyMessage($t('Point.index.400149-14')); await saved() }
  }
  const getBatchParams = () => {
    if (!query.value || !rows.value.length) throw new Error('No accepted point query')
    return cloneDeep(query.value)
  }
  async function runBatch(action: 'enable' | 'disable' | 'delete') {
    if (busy.value) return
    if ((!selection.all.value && !selection.selectedRows.value.length) || !rows.value.length) {
      onlyMessage($t('Point.index.400149-15'), 'warning'); return
    }
    busy.value = true
    try {
      const response = selection.all.value
        ? await ({ enable: enablePoints, disable: disablePoints, delete: deletePoints }[action])(getBatchParams())
        : action === 'delete'
          ? await batchDeletePoint(selection.selectedKeys.value)
          : await savePointBatch(selection.selectedRows.value.map(row => ({ ...row, state: action === 'enable' ? 'enabled' : 'disabled' })))
      if (response.success) { onlyMessage($t('Point.index.400149-14')); await saved() }
    } finally { busy.value = false }
  }
  const batchAdd = () => menu.jumpPage('data-collect/BatchAdd', { params: { id: scope.value.id } })
  // 添加与导入作用于当前采集器，不依赖已勾选点位。
  const batchActions = computed(() => [
    ...(state.scopeType === 'collector' ? [
      ...(pointActions.batchAdd ? [{
        key: 'batchAdd', text: $t('DataCollect.index.400151-12'), icon: 'PlusOutlined', onClick: batchAdd,
      }] : []),
      {
        key: 'import', text: $t('Point.index.400149-2'), icon: 'ImportOutlined',
        onClick: () => { visible.import = true },
      },
      {
        key: 'update', text: $t('DataCollect.index.400151-19'), icon: 'EditOutlined',
        disabled: busy.value || !selection.selectedKeys.value.length,
        onClick: () => { if (rows.value.length) visible.batchUpdate = true },
      },
    ] : []),
    ...(['enable', 'disable', 'delete'] as const).map(key => ({
      key, text: $t(key === 'enable' ? 'DataCollect.index.400151-17' : key === 'disable' ? 'DataCollect.index.400151-20' : 'DataCollect.index.400151-22'),
      icon: key === 'enable' ? 'CheckCircleOutlined' : key === 'disable' ? 'StopOutlined' : 'DeleteOutlined',
      danger: key === 'delete', disabled: busy.value || !selection.selectedKeys.value.length,
      popConfirm: {
        title: $t(key === 'enable' ? 'DataCollect.index.400151-18' : key === 'disable' ? 'DataCollect.index.400151-21' : 'Point.index.400149-6'),
        onConfirm: () => runBatch(key),
      },
    })),
  ])
  async function exportData() {
    const provider = scope.value.provider === 'COLLECTOR_GATEWAY' ? scope.value.configuration?.collectorProvider : scope.value.provider
    const result = await exportPoint(scope.value.id || '', provider || '')
    if (!result) return
    const url = URL.createObjectURL(new Blob([result as unknown as BlobPart], { type: 'xlsx' }))
    try { downloadFileByUrl(url, $t('Point.index.400149-16', [scope.value.name])) }
    finally { URL.revokeObjectURL(url) }
  }
  onScopeDispose(() => { version++; editVersion++ })
  return {
    visible, current, formCollector, editing, pointActions, jsonData, batchActions, busy, saved, add, edit, view, remove, getBatchParams,
    exportData, exportTemplate, pointImport, scope, batchAdd,
    scan: () => menu.jumpPage('data-collect/Scan', { params: { id: scope.value.id } }),
  }
}
