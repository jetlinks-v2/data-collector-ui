import { computed, onActivated, onDeactivated, onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { throttle } from 'lodash-es'
import { Subscription } from 'rxjs'
import { listWorkspaceChannels, listWorkspaceCollectors, listWorkspacePoints, listWorkspaceProviders, monitorCollectors, observeWorkspace } from '../../../api/data-collect/workspace'
import { monitoredObjects, type RuntimeMonitoringRound } from '../../../utils/runtimeMonitoring'
import { observedPoints } from '../../../utils/workspaceObservation'
import { readPoint } from '../../../api/data-collect/collector'
import { workspaceSorts, type WorkspaceSort } from '../../../utils/workspaceList'
import type { CollectorObject, CollectorObservation, PointRow, ProviderDescriptor } from '../../../types/workspace'

/** 当前列表共享批量观测；选中项由详情流接管，避免同一采集器被重复扫描。 */
export function useWorkspaceData() {
  const { t } = useI18n()
  const collectors = shallowRef<CollectorObject[]>([]), channels = shallowRef<CollectorObject[]>([])
  const providers = shallowRef<ProviderDescriptor[]>([]), points = shallowRef<PointRow[]>([])
  const unsavedPoints = shallowRef<PointRow[]>([])
  const observation = shallowRef<CollectorObservation>()
  const collector = shallowRef<CollectorObject>(), selectedPointId = ref('')
  const loading = ref(false), pointLoading = ref(false), error = ref(''), paused = ref(false)
  const total = ref(0), pointTotal = ref(0), page = ref(1), pointPage = ref(1), search = ref(''), pointSearch = ref(''), pointState = ref(''), valueError = ref('')
  const channel = computed(() => channels.value.find(item => item.id === collector.value?.channelId))
  const pointSort = ref<WorkspaceSort>('newest'), collectorSort = ref<WorkspaceSort>('newest')
  const selectedPoint = computed(() => points.value.find(item => item.id === selectedPointId.value))
  let generation = 0, pointGeneration = 0, active = true, subscription: Subscription | undefined
  let streamRevision=0,previousMonitoring:RuntimeMonitoringRound|undefined,previousChannels:RuntimeMonitoringRound|undefined,previousObservation:CollectorObservation|undefined
  const describe = (cause: unknown) => cause instanceof Error ? cause.message : String(cause)
  // Accumulate by point before painting so throttle never drops another point's update.
  const pending = new Map<string, any>()
  const flush = throttle(() => {
    points.value = points.value.map(point => pending.has(point.id) ? { ...point, latest: pending.get(point.id) } : point)
    pending.clear()
  }, 250, { leading: true, trailing: true })
  function updateValues(payload: any) {
    for (const value of Array.isArray(payload) ? payload : [payload]) {
      if (!value) continue
      // Runtime queries wrap the last sample; WebSocket/read responses already contain samples.
      const sample = 'lastData' in value ? value.lastData : value
      if (sample) pending.set(value.pointId || sample.pointId || value.id, sample)
    }
    flush()
  }
  function unsubscribe() { ++streamRevision;subscription?.unsubscribe(); subscription = undefined;previousMonitoring=undefined;previousChannels=undefined;previousObservation=undefined;flush.cancel(); pending.clear() }
  function subscribe() {
    unsubscribe()
    if (!active || paused.value || document.hidden) return
    const stream=streamRevision
    const subscriptions=new Subscription()
    subscription=subscriptions
    let listFailure='',detailFailure=''
    const feedback=()=>{valueError.value=listFailure || detailFailure}
    const monitoredIds=new Set(collectors.value.filter(value=>value.id !== collector.value?.id).map(value=>value.id))
    const channelIds=new Set(channels.value.filter(value=>value.id !== collector.value?.channelId).map(value=>value.id))
    if(monitoredIds.size || channelIds.size){
      const disconnected=(cause:unknown)=>{
        if(stream !== streamRevision)return
        listFailure=describe(cause);feedback()
        collectors.value=collectors.value.map(value=>monitoredIds.has(value.id) ? unavailable(value) : value)
        channels.value=channels.value.map(value=>channelIds.has(value.id) ? unavailable(value) : value)
      }
      subscriptions.add(monitorCollectors([...monitoredIds],2000,[...channelIds]).subscribe({
        next:value=>{
          if(stream !== streamRevision)return
          listFailure='';feedback()
          const round={timestamp:value.timestamp,snapshots:value.collectors}
          const updated=new Map(monitoredObjects(collectors.value.filter(item=>monitoredIds.has(item.id)),round,previousMonitoring).map(item=>[item.id,item]))
          collectors.value=collectors.value.map(item=>updated.get(item.id) || item);previousMonitoring=round
          const channelRound={timestamp:value.timestamp,snapshots:value.channels || []}
          const updatedChannels=new Map(monitoredObjects(channels.value.filter(item=>channelIds.has(item.id)),channelRound,previousChannels,'channel').map(item=>[item.id,item]))
          channels.value=channels.value.map(item=>updatedChannels.get(item.id) || item);previousChannels=channelRound
        },
        error:disconnected,complete:()=>disconnected(t('collectorWorkspace.streamEnded')),
      }))
    }
    if(!collector.value)return
    const ids = points.value.filter(item => !item.id.startsWith('_new:')).map(item => item.id)
    const revision=pointGeneration,current=collector.value
    const disconnected=(cause:unknown)=>{
      if(stream !== streamRevision || revision !== pointGeneration || collector.value?.id !== current.id)return
      detailFailure=describe(cause);feedback()
      collector.value=unavailable(collector.value)
      collectors.value=collectors.value.map(item=>item.id === current.id ? collector.value! : item)
      points.value=points.value.map(unavailable)
      channels.value=channels.value.map(item=>item.id === current.channelId ? unavailable(item) : item)
    }
    subscriptions.add(observeWorkspace(current.id, ids).subscribe({
      next: value => {
        if (stream !== streamRevision || revision !== pointGeneration || collector.value?.id !== current.id) return
        detailFailure='';feedback();observation.value=value
        points.value=observedPoints(points.value,value,previousObservation)
        const round=(sample:CollectorObservation)=>({timestamp:sample.timestamp,snapshots:sample.nodes.map(node=>node.collector)})
        collector.value=monitoredObjects([collector.value!],round(value),previousObservation ? round(previousObservation) : undefined)[0]
        collectors.value=collectors.value.map(item=>item.id === current.id ? collector.value! : item)
        const channelRound=(sample:CollectorObservation)=>({timestamp:sample.timestamp,snapshots:sample.nodes.flatMap(node=>node.channel ? [node.channel] : [])})
        channels.value=channels.value.map(item=>item.id === current.channelId ? monitoredObjects([item],channelRound(value),previousObservation ? channelRound(previousObservation) : undefined,'channel')[0] : item)
        previousObservation=value
      },
      error:disconnected,
      complete:()=>disconnected(t('collectorWorkspace.streamEnded')),
    }))
  }
  function unavailable<T extends CollectorObject>(value:T):T {
    return {...value,runtime:{...value.runtime,id:value.id,serverId:value.runtime?.serverId || '',available:false}}
  }
  async function loadCollectors() {
    unsubscribe()
    const revision = ++generation; loading.value = true; error.value = ''
    try {
      const terms = search.value.trim() ? [{ column: 'name', termType: 'like', value: `%${search.value.trim()}%` }] : []
      const response = await listWorkspaceCollectors({ pageIndex: page.value - 1, pageSize: 48, terms, sorts: workspaceSorts(collectorSort.value) })
      if (revision !== generation) return
      if (!response.success) throw new Error(t('collectorWorkspace.loadFailed'))
      collectors.value = response.result?.data || []; total.value = response.result?.total || 0
      if (collector.value) collector.value = collectors.value.find(item => item.id === collector.value?.id) || collector.value
      subscribe()
    } catch (cause) { if (revision === generation) error.value = describe(cause) }
    finally { if (revision === generation) loading.value = false }
  }
  async function loadPoints() {
    const current = collector.value, revision = ++pointGeneration; unsubscribe(); points.value = []
    if (!current) { pointLoading.value = false;subscribe();return }
    pointLoading.value = true; error.value = ''
    try {
      const terms: object[] = [{ column: 'collectorId', value: current.id }]
      if (pointSearch.value.trim()) terms.push({ column: 'name', termType: 'like', value: `%${pointSearch.value.trim()}%` })
      if (pointState.value) terms.push({ column: 'state', value: pointState.value })
      // 批量创建的点位时间可能相同，使用唯一标识保证跨页顺序稳定。
      const response = await listWorkspacePoints({ pageIndex: pointPage.value - 1, pageSize: 48, terms, sorts: workspaceSorts(pointSort.value) })
      if (revision !== pointGeneration) return
      if (!response.success) throw new Error(t('collectorWorkspace.loadFailed'))
      points.value = [...unsavedPoints.value.filter(point => point.collectorId === current.id), ...response.result?.data || []]; pointTotal.value = response.result?.total || 0
      if (!points.value.some(point => point.id === selectedPointId.value)) selectedPointId.value = points.value[0]?.id || ''
      subscribe()
    } catch (cause) { if (revision === pointGeneration) error.value = describe(cause) }
    finally { if (revision === pointGeneration) pointLoading.value = false }
  }
  async function initialize() {
    await loadCollectors()
    const results = await Promise.allSettled([listWorkspaceChannels({ pageIndex: 0, pageSize: 100 }), listWorkspaceProviders()])
    if (results[0].status === 'fulfilled' && results[0].value.success) channels.value = results[0].value.result?.data || []
    if (results[1].status === 'fulfilled' && results[1].value.success) providers.value = results[1].value.result || []
    for (const result of results) if (result.status === 'rejected') error.value = describe(result.reason)
    else if (!result.value.success) error.value = t('collectorWorkspace.loadFailed')
    subscribe()
  }
  function select(value?: CollectorObject) {
    observation.value=undefined
    collector.value = value; pointSearch.value = ''; pointState.value = ''; selectedPointId.value = ''
    if (pointPage.value !== 1) pointPage.value = 1; else void loadPoints()
  }
  function filterPoints() { if (pointPage.value !== 1) pointPage.value = 1; else void loadPoints() }
  function filterCollectors() { if (page.value !== 1) page.value = 1; else void loadCollectors() }
  async function trial(point?: PointRow, selectedIds?: string[]) {
    const current = collector.value, revision = pointGeneration
    if (!current) return undefined
    const ids = point ? [point.id] : selectedIds || points.value.map(item => item.id)
    const savedIds = ids.filter(id => !id.startsWith('_new:'))
    if (!savedIds.length) return undefined
    try {
      const result = await readPoint(current.id, savedIds)
      if (collector.value?.id !== current.id || revision !== pointGeneration) return undefined
      if (!result.success) throw new Error(t('collectorWorkspace.loadFailed'))
      valueError.value = ''; updateValues(result.result || [])
      return new Set((result.result || []).filter(row => savedIds.includes(row.pointId)).map(row => row.pointId)).size
    } catch (cause) { if (collector.value?.id === current.id && revision === pointGeneration) valueError.value = describe(cause); return undefined }
  }
  const onVisibility = () => { if (document.hidden) unsubscribe(); else if (!paused.value) { if(collector.value)void loadPoints();else void loadCollectors() } }
  document.addEventListener('visibilitychange', onVisibility)
  watch(paused, subscribe)
  watch(page, loadCollectors)
  watch(pointPage, loadPoints)
  onDeactivated(() => { active = false; ++pointGeneration; unsubscribe() })
  onActivated(() => { if (!active) { active = true; if (collector.value) void loadPoints();else void loadCollectors() } })
  onBeforeUnmount(() => { ++generation; ++pointGeneration; unsubscribe(); document.removeEventListener('visibilitychange', onVisibility) })
  return { collectors, channels, providers, points, unsavedPoints, observation, collector, channel, selectedPointId, selectedPoint, loading, pointLoading, error, valueError, paused, total, pointTotal, page, pointPage, search, pointSearch, pointState, pointSort, collectorSort, initialize, loadCollectors, loadPoints, select, trial, filterPoints, filterCollectors }
}
