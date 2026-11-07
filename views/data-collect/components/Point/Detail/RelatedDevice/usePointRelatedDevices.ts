
import { computed, inject, onMounted, onScopeDispose, reactive, ref, watch, type Ref } from 'vue'
import type { CollectRecord } from '../../../../hook/context'

import {useI18n} from "vue-i18n";
import {
  deletePointRelatedDevices,
  downloadPointRelatedDevicesTemplate,
  importPointRelatedDevices,
  queryDeviceDetail,
  queryDeviceList,
  queryDevicePoints,
  queryPointRelatedDevices,
  savePointRelatedDevices
} from "@data-collector-ui/api/data-collect/collector";
import {onlyMessage, randomString} from "@jetlinks-web/utils";

type RelatedRecord = Record<string, any>

/** 关联设备的查询、编辑与保存状态由详情页面统一协调离开保护。 */
export function usePointRelatedDevices() {
const {t: $t} = useI18n();

const info = inject<Ref<CollectRecord>>('point-info', ref({}))
const pointRefresh = inject('point-refresh', {
  refresh: () => undefined
})

// 表格当前编辑态数据
const _dataSource = ref<RelatedRecord[]>([])
// 记录后端已存在的映射快照，用于识别删除和修改后的旧映射
const originalMappings = ref<RelatedRecord[]>([])
const batchImportVisible = ref(false)
const importAutoCreate = ref(false)
const deviceListLoading = ref(false)
const initLoading = ref(false)
const loadFailed = ref(false)
const saveLoading = ref(false)
const deviceOptions = ref<RelatedRecord[]>([])
// 按设备缓存详情、物模型和已映射点位，避免每次切换重复请求
const deviceCache = reactive<Record<string, RelatedRecord>>({})

let disposed = false
let loadVersion = 0
const baseline = ref('[]')
const rowSignature = () => JSON.stringify(_dataSource.value.map(({ mappingId, id, name, metadataId, createMode }) => ({ mappingId, id, name, metadataId, createMode })))
const isDirty = () => rowSignature() !== baseline.value
const discard = () => { _dataSource.value = JSON.parse(baseline.value).map((item: RelatedRecord) => createRow(item)) }
onScopeDispose(() => { disposed = true; loadVersion++ })

const columns = [
  {
    title: $t('DataCollect.index.400152-4'),
    dataIndex: 'id',
    ellipsis: true,
    width: 220,
  },
  {
    title: $t('DataCollect.index.400152-5'),
    dataIndex: 'name',
    ellipsis: true,
    width: 260,
  },
  {
    title: $t('DataCollect.index.400152-6'),
    dataIndex: 'metadataId',
    ellipsis: true,
  },
  {
    key: 'actions',
    title: $t('Collector.data.400141-40'),
    dataIndex: 'actions',
    width: 80
  }
]

const createModeOptions = [
  {
    label: $t('DataCollect.index.400152-23'),
    value: 'auto',
  },
  {
    label: $t('DataCollect.index.400152-24'),
    value: 'manual',
  }
]

const filterOption = (input: string, option?: RelatedRecord) => {
  return `${option?.label || ''}`.toLowerCase().includes(input.toLowerCase())
}

const normalizeListResult = (resp: any): RelatedRecord[] => {
  if (Array.isArray(resp)) {
    return resp
  }
  if (Array.isArray(resp?.result)) {
    return resp.result
  }
  if (Array.isArray(resp?.data)) {
    return resp.data
  }
  if (Array.isArray(resp?.result?.data)) {
    return resp.result.data
  }
  return []
}

const normalizeObjectResult = (resp: any) => {
  return resp?.result || resp?.data || resp || {}
}

const parseMetadata = (metadata: any) => {
  if (!metadata) {
    return {}
  }
  if (typeof metadata === 'string') {
    try {
      return JSON.parse(metadata || '{}')
    } catch (e: any) {
      return {}
    }
  }
  return metadata
}

const getMappedPointId = (point: RelatedRecord) => {
  return point?.pointId || point?.id
}

const generateMetadataId = () => `property_${randomString(8)}`

// 兼容点位映射查询接口与本地编辑结构的字段差异
const createRow = (item: RelatedRecord = {}) => ({
  __key: item.__key || randomString(8),
  mappingId: item.mappingId || item.id || '',
  id: item.thingId || item.deviceId || item.relationId || item.id || '',
  name: item.name || item.deviceName || item.relationName || '',
  metadataId: item.metadataId || item.property || item.propertyId || item.collectorMetadataId || '',
  createMode: item.createMode || 'manual',
})

const inferCreateMode = (row: RelatedRecord) => {
  const properties: RelatedRecord[] = deviceCache[row.id]?.properties || []
  const propertySet = new Set(properties.map((item) => item.id))
  row.createMode = row.metadataId && !propertySet.has(row.metadataId) ? 'auto' : 'manual'
  if (row.createMode === 'auto' && !row.metadataId) {
    row.metadataId = generateMetadataId()
  }
}

const isRequestSuccess = (resp: any) => {
  return !!(resp?.success || resp?.status === 200)
}

const getCodecValue = () => {
  const codec = info.value?.configuration?.codec || info.value?.managedConfiguration?.codec
  if (typeof codec === 'string') {
    return codec
  }
  return codec?.provider || codec?.id
}

const getCodecConfiguration = () => {
  const codec = info.value?.configuration?.codec || info.value?.managedConfiguration?.codec
  if (codec?.configuration) {
    return codec.configuration
  }
  if (info.value?.managedConfiguration?.byteLayout) {
    return {
      byteLayout: info.value.managedConfiguration.byteLayout
    }
  }
  return {}
}

// 保存接口只认当前设备+属性的最终状态，所以先保留一份原始映射快照
const snapshotMappings = (rows: RelatedRecord[] = []) => {
  originalMappings.value = rows
      .filter((item) => item.mappingId)
      .map((item) => ({
        mappingId: item.mappingId,
        id: item.id,
        metadataId: item.metadataId,
      }))
}

// 当已有映射被改设备、改属性或直接删除时，需要把旧 mappingId 一并删掉
const getDeletedMappingIds = () => {
  return originalMappings.value
      .filter((item) => {
        const current = _dataSource.value.find((row) => row.mappingId === item.mappingId)
        return !current || current.id !== item.id || current.metadataId !== item.metadataId
      })
      .map((item) => item.mappingId)
}

// 点位侧保存接口统一使用这个 payload，自动创建与手动创建只通过 autoCreate 区分
const buildSavePayload = (rows: RelatedRecord[] = []) => {
  const codec = getCodecValue()
  const codecConfiguration = getCodecConfiguration()

  return rows.map((item) => {
    const payload: RelatedRecord = {
      deviceId: item.id,
      metadataType: 'property',
      metadataId: item.metadataId,
      description: info.value?.description || info.value?.name,
      state: 'enabled',
    }

    if (codec) {
      payload.codec = codec
    }

    if (codecConfiguration && Object.keys(codecConfiguration).length) {
      payload.codecConfiguration = codecConfiguration
    }

    return payload
  })
}

// 详情页进入时优先从点位侧映射接口加载，避免依赖父级详情字段是否完整
const initDataSource = async () => {
  const token = ++loadVersion
  initLoading.value = true
  loadFailed.value = false
  try {
    const resp = await queryPointRelatedDevices(info.value.id || '', { paging: false })
    if (!isRequestSuccess(resp)) throw new Error('Point relations unavailable')
    const rows = normalizeListResult(resp).map(item => createRow(item))
    const ids = [...new Set(rows.map(item => String(item.id)).filter(Boolean))]
    await Promise.all(ids.map(id => loadDeviceMetadata(id, true)))
    if (disposed || token !== loadVersion) return false
    rows.forEach(item => inferCreateMode(item))
    _dataSource.value = rows
    snapshotMappings(rows)
    baseline.value = rowSignature()
    return true
  } catch {
    if (!disposed && token === loadVersion) loadFailed.value = true
    return false
  } finally {
    if (!disposed && token === loadVersion) initLoading.value = false
  }
}

// 设备下拉只需要 id + name，详情和物模型按需加载
const loadDeviceList = async () => {
  deviceListLoading.value = true
  const resp = await queryDeviceList({
    paging: false,
    sorts: [{name: 'createTime', order: 'desc'}],
  }).finally(() => {
    deviceListLoading.value = false
  })

  deviceOptions.value = normalizeListResult(resp).map((item) => ({
    label: item.name,
    value: item.id,
    raw: item,
  }))
}

// 设备缓存里同时放物模型和已映射点位，属性下拉禁用依赖这两部分数据
const loadDeviceMetadata = async (deviceId: string, force = false) => {
  if (!deviceId) {
    return
  }
  if (!force && deviceCache[deviceId]?.loaded) {
    return
  }

  deviceCache[deviceId] = {
    loading: true,
    loaded: false,
    detail: {},
    properties: [],
    mappedPoints: [],
    mappedPointMap: {},
  }

  try {
    const [detailResp, pointsResp] = await Promise.all([
      queryDeviceDetail(deviceId),
      queryDevicePoints(deviceId),
    ])

    const detail = normalizeObjectResult(detailResp)
    const mappedPoints = normalizeListResult(pointsResp)
    const metadata = parseMetadata(detail?.metadata)
    const properties: RelatedRecord[] = metadata?.properties || []

    const mappedPointMap = mappedPoints.reduce<Record<string, RelatedRecord>>((result, item) => {
      if (item?.metadataId) {
        result[item.metadataId] = item
      }
      return result
    }, {})

    deviceCache[deviceId] = {
      loading: false,
      loaded: true,
      detail,
      properties,
      mappedPoints,
      mappedPointMap,
    }
  } catch (e: any) {
    deviceCache[deviceId] = {
      loading: false,
      loaded: true,
      detail: {},
      properties: [],
      mappedPoints: [],
      mappedPointMap: {},
    }
  }
}

// 远端已映射和本地已选择的属性都要禁用，防止同设备属性重复绑定
const getPropertyOptions = (record: RelatedRecord) => {
  const currentPointId = info.value?.id
  const currentDevice = deviceCache[record.id] || {}
  const properties: RelatedRecord[] = currentDevice.properties || []
  const mappedPointMap = currentDevice.mappedPointMap || {}
  const selectedMetadataIdSet = new Set(
      _dataSource.value
          .filter((item) => item.__key !== record.__key && item.id === record.id && item.metadataId)
          .map((item) => item.metadataId)
  )

  return properties.map((item) => {
    const mappedPoint = mappedPointMap[item.id]
    const mappedPointId = getMappedPointId(mappedPoint)
    const disabledByRemote = !!mappedPoint && mappedPointId !== currentPointId
    const disabledByLocal = selectedMetadataIdSet.has(item.id)
    const disabled = disabledByRemote || disabledByLocal
    const mappedText = mappedPoint ? ` / ${$t('Children.index.645257-17')}` : ''

    return {
      label: `${item.name || item.id} (${item.id})${mappedText}`,
      value: item.id,
      disabled,
    }
  })
}

// 选择设备后清空当前属性，并立即拉取该设备的物模型数据
const onDeviceChange = async (record: RelatedRecord, value: unknown, option: RelatedRecord | RelatedRecord[]) => {
  record.id = value || ''
  const selected = Array.isArray(option) ? option[0] : option
  record.name = value ? selected?.raw?.name || selected?.label || '' : ''
  record.metadataId = ''

  if (!value) {
    return
  }

  await loadDeviceMetadata(String(value))

  if (record.createMode === 'auto') {
    record.metadataId = generateMetadataId()
  }
}

const onCreateModeChange = (record: RelatedRecord, value: unknown) => {
  record.createMode = value
  if (value === 'auto') {
    record.metadataId = generateMetadataId()
  } else {
    record.metadataId = ''
  }
}

// 导入弹窗通过 URL 形式把 autoCreate 带给 BatchImport 的流式上传逻辑
const getImportRequest = (fileUrl: string) => {
  if (!info.value?.id) {
    onlyMessage($t('DataCollect.index.400159-3'), 'error')
    return ''
  }
  return importPointRelatedDevices(info.value.id, fileUrl, importAutoCreate.value)
}

// 导入成功后统一重新加载一次点位映射，避免手工拼接导入结果
const handleBatchImport = async () => {
  await initDataSource()
  pointRefresh.refresh?.()
  onlyMessage($t('DataCollect.index.400152-14'), 'success')
}

// 保存前做本地兜底校验，重点拦截同设备同属性的重复选择
const validateRows = () => {
  if (!_dataSource.value.length) {
    onlyMessage($t('DataCollect.index.400152-26'), 'warning')
    return false
  }

  const selectedPropertyMap = new Set()

  for (const item of _dataSource.value) {
    if (!item.id || !item.name) {
      onlyMessage($t('DataCollect.index.400152-27'), 'warning')
      return false
    }
    if (!item.metadataId) {
      onlyMessage($t('DataCollect.index.400152-28'), 'warning')
      return false
    }

    const key = `${item.id}::${item.metadataId}`
    if (selectedPropertyMap.has(key)) {
      onlyMessage($t('DataCollect.index.400152-29'), 'warning')
      return false
    }
    selectedPropertyMap.add(key)
  }
  return true
}

// 保存策略：
// 1. 手动创建和自动创建分两次调用后端接口
// 2. 新状态保存成功后，再删除被替换/移除的旧 mapping
const performSave = async (): Promise<boolean> => {
  if (!info.value?.id) {
    onlyMessage($t('DataCollect.index.400159-3'), 'error')
    return false
  }

  const deletedIds = getDeletedMappingIds()

  if (_dataSource.value.length && !validateRows()) {
    return false
  }

  if (!_dataSource.value.length && !deletedIds.length) {
    onlyMessage($t('DataCollect.index.400152-26'), 'warning')
    return false
  }

  saveLoading.value = true
  try {
    const manualRows = _dataSource.value.filter((item) => item.createMode !== 'auto')
    const autoRows = _dataSource.value.filter((item) => item.createMode === 'auto')

    if (manualRows.length) {
      const saveResp = await savePointRelatedDevices(
          info.value.id,
          false,
          buildSavePayload(manualRows)
      )
      if (!isRequestSuccess(saveResp)) {
        onlyMessage(saveResp?.message || $t('DataCollect.index.400159-4'), 'error')
        return false
      }
    }

    if (autoRows.length) {
      const saveResp = await savePointRelatedDevices(
          info.value.id,
          true,
          buildSavePayload(autoRows)
      )
      if (!isRequestSuccess(saveResp)) {
        onlyMessage(saveResp?.message || $t('DataCollect.index.400159-4'), 'error')
        return false
      }
    }

    if (deletedIds.length) {
      const deleteResp = await deletePointRelatedDevices(info.value.id, deletedIds)
      if (!isRequestSuccess(deleteResp)) {
        onlyMessage(deleteResp?.message || $t('DataCollect.index.400159-5'), 'error')
        return false
      }
    }

    onlyMessage($t('DataCollect.index.400152-14'), 'success')
    const refreshed = await initDataSource()
    pointRefresh.refresh?.()
    return refreshed
  } catch (e: any) {
    onlyMessage(e?.message || $t('DataCollect.index.400159-4'), 'error')
    return false
  } finally {
    saveLoading.value = false
  }
}

let saveTask: Promise<boolean> | undefined
const handleSave = () => {
  if (saveTask) return saveTask
  saveTask = performSave().finally(() => { saveTask = undefined })
  return saveTask
}
// 等待手动保存/删除结束后再处理路由离开，失败和校验不通过时保留本地草稿。
const flush = async () => {
  if (saveTask) await saveTask
  if (saveLoading.value) await new Promise<void>(resolve => {
    const stop = watch(saveLoading, value => { if (!value) { stop(); resolve() } })
  })
  return !isDirty() || await handleSave()
}

const addItem = () => {
  if (initLoading.value || saveLoading.value) return
  _dataSource.value.push(createRow())
}

// 已落库映射删除时直接调删除接口；未保存的新行只删本地
const removeItem = async (record: RelatedRecord, index: number) => {
  if (record?.mappingId) {
    if (!info.value?.id) {
      onlyMessage($t('DataCollect.index.400159-3'), 'error')
      return
    }

    saveLoading.value = true
    try {
      const resp = await deletePointRelatedDevices(info.value.id, [record.mappingId])
      if (!isRequestSuccess(resp)) {
        onlyMessage(resp?.message || $t('DataCollect.index.400159-5'), 'error')
        return
      }

      originalMappings.value = originalMappings.value.filter((item) => item.mappingId !== record.mappingId)
      _dataSource.value.splice(index, 1)
      // 已保存行的即时删除只更新对应基线，其他尚未保存的编辑仍保留。
      baseline.value = JSON.stringify(JSON.parse(baseline.value).filter((item: RelatedRecord) => item.mappingId !== record.mappingId))
      await loadDeviceMetadata(record.id, true)
      onlyMessage($t('DataCollect.index.400152-14'), 'success')
      pointRefresh.refresh?.()
    } catch (e: any) {
      onlyMessage(e?.message || $t('DataCollect.index.400159-5'), 'error')
      return
    } finally {
      saveLoading.value = false
    }
    return
  }

  _dataSource.value.splice(index, 1)
}

watch(() => info.value.id, () => {
  initDataSource()
}, {
  immediate: true
})

onMounted(() => {
  loadDeviceList()
})



return { $t, initDataSource, loadFailed, _dataSource, batchImportVisible, importAutoCreate, deviceListLoading, initLoading, saveLoading, deviceOptions, deviceCache, columns, createModeOptions, filterOption, getPropertyOptions, onDeviceChange, onCreateModeChange, getImportRequest, handleBatchImport, handleSave, addItem, removeItem, downloadPointRelatedDevicesTemplate, flush, isDirty, discard }
}
