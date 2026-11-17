import { computed, onActivated, onDeactivated, onBeforeUnmount, ref, shallowReactive, shallowRef, watch, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { debounce, throttle } from 'lodash-es'
import { concatWith, retry, Subscription, throwError, timer, type Observable } from 'rxjs'
import { listWorkspaceChannels, listWorkspaceCollectors, listWorkspacePoints, listWorkspaceProviders, loadWorkspacePoint, observeCollectionWorkspace, queryWorkspaceIndex } from '../../../api/data-collect/workspace'
import { monitoredObjects } from '../../../utils/runtimeMonitoring'
import { applyObservedValues, observedPoints } from '../../../utils/workspaceObservation'
import { usePointTrial } from './usePointTrial'
import { runtimeFilter, runtimeSort, workspaceOrder, workspaceStateCounts, workspaceRuntimeIndex, type WorkspaceRuntimeIndex, type WorkspaceSort } from '../../../utils/workspaceList'
import type { CollectorObject, CollectorObservation, CollectorWorkspaceQuery, PointRow, ProviderDescriptor, RecordingSnapshot, WorkspaceRecordingTarget } from '../../../types/workspace'

/** 轻量目录、单点编辑配置、有限运行索引和可视值流分别管理。 */
export function useWorkspaceData() {
  const { t } = useI18n()
  const collectors = shallowRef<CollectorObject[]>([]), channels = shallowRef<CollectorObject[]>([])
  const providers = shallowRef<ProviderDescriptor[]>([]), points = shallowRef<PointRow[]>([])
  const unsavedPoints = shallowRef<PointRow[]>([]), observation = shallowRef<CollectorObservation>()
  const recording=shallowRef<RecordingSnapshot>(),recordingTarget=shallowRef<WorkspaceRecordingTarget>()
  const collector = shallowRef<CollectorObject>(), selectedPointId = ref(''), selectedChannelId = ref('')
  const pointDetails = shallowRef<PointRow>(), selectedLoading = ref(false), selectedError = ref('')
  const initializing = ref(true), loading = ref(false), pointLoading = ref(false), ordering = ref(false)
  const error = ref(''), paused = ref(false), valueError = ref('')
  const search = ref(''), pointSearch = ref(''), pointState = ref(''), collectorState = ref('')
  const pointSort = ref<WorkspaceSort>('newest'), collectorSort = ref<WorkspaceSort>('newest')
  const orderHeld = ref(false)
  const pointOrder = shallowRef<string[]>([]), collectorOrder = shallowRef<string[]>([])
  const pointsById = computed(() => new Map(points.value.map(point => [point.id,point])))
  const indexTime = ref(0)
  const selectedPoint = computed(() => {
    const row=points.value.find(item=>item.id === selectedPointId.value)
    if(row?.id.startsWith('_new:'))return row
    return row && pointDetails.value?.id === row.id ? {...pointDetails.value,...row} : undefined
  })
  const channel = computed(() => channels.value.find(item => item.id === (collector.value?.channelId || selectedChannelId.value)))
  const scopedCollectors = computed(() => selectedChannelId.value ? collectors.value.filter(item => item.channelId === selectedChannelId.value) : collectors.value)
  const orderedRows = <T extends CollectorObject>(rows:T[], ids:string[]) => {
    const byId = new Map(rows.map(row => [row.id,row]))
    return ids.flatMap(id => byId.has(id) ? [byId.get(id)!] : [])
  }
  const filteredPoints = computed(() => orderedRows(points.value, pointOrder.value))
  const filteredCollectors = computed(() => orderedRows(scopedCollectors.value, collectorOrder.value))
  const total = computed(() => filteredCollectors.value.length), pointTotal = computed(() => filteredPoints.value.length)
  const pointIndex = shallowRef(new Map<string,WorkspaceRuntimeIndex>()), collectorIndex = shallowRef(new Map<string,WorkspaceRuntimeIndex>())
  function acceptIndex(target:Ref<Map<string,WorkspaceRuntimeIndex>>,index:Map<string,WorkspaceRuntimeIndex>,baseline:Map<string,WorkspaceRuntimeIndex>) {
    // A stream frame arriving during the finite query owns the newer state for that row.
    for(const [id,value] of target.value)if(value !== baseline.get(id))index.set(id,value)
    target.value=index
  }
  const stateCounts=computed(()=>{
    const rows=collector.value ? points.value : scopedCollectors.value
    const index=new Map(collector.value ? pointIndex.value : collectorIndex.value)
    for(const row of rows)if(row.runtime && !index.has(row.id))index.set(row.id,workspaceRuntimeIndex(row))
    return workspaceStateCounts(rows,collector.value ? pointSearch.value : search.value,index)
  })
  let countSubscription:Subscription|undefined
  /** 打开筛选时只补一轮有限状态快照；可视区继续共用实时流，不订阅全部点位。 */
  function loadStateCounts(open:boolean) {
    countSubscription?.unsubscribe();countSubscription=undefined
    if(!open)return
    const current=collector.value,revision=current ? pointGeneration : generation
    const target=current ? pointIndex : collectorIndex,baseline=target.value
    const rows=(current ? points.value : scopedCollectors.value).filter(row=>!row.id.startsWith('_new:'))
    countSubscription=queryWorkspaceIndex(rows,current?.id).subscribe({
      next:index=>{
        if(current?.id !== collector.value?.id || revision !== (current ? pointGeneration : generation))return
        acceptIndex(target,index,baseline)
        indexTime.value=Date.now()
      },
      // 数量查询失败仍保留列表和已有观测，不将未知统计显示为零。
      error:()=>{},
    })
  }
  let generation = 0, pointGeneration = 0, active = true, streamRevision = 0
  let subscription:Subscription|undefined, indexSubscription:Subscription|undefined, indexRefresh:Subscription|undefined
  let monitoringSubscription:Subscription|undefined, recordingSubscription:Subscription|undefined
  let monitoringRevision=0, recordingRevision=0
  function stopIndexRefresh() { indexRefresh?.unsubscribe();indexRefresh=undefined }
  function scheduleIndexRefresh() {
    stopIndexRefresh()
    if(active && !document.hidden && !paused.value && !orderHeld.value && collector.value && (runtimeSort(pointSort.value) || runtimeFilter(pointState.value))) {
      indexRefresh=timer(5000).subscribe(()=>refreshPointIndex(true))
    }
  }
  function setOrder(target:Ref<string[]>,ids:string[]) {
    if(ids.length !== target.value.length || ids.some((id,index)=>id !== target.value[index]))target.value=ids
  }
  function applyPointOrder() { if(!orderHeld.value)setOrder(pointOrder,workspaceOrder(points.value,pointSort.value,pointSearch.value,pointState.value,pointIndex.value)) }
  function applyCollectorOrder() { if(!orderHeld.value)setOrder(collectorOrder,workspaceOrder(scopedCollectors.value,collectorSort.value,search.value,collectorState.value,collectorIndex.value)) }
  /** Statistic frames update scalar sort keys; high-frequency value frames never enter here. */
  function updateRuntimeOrder(updatedPoints:PointRow[] = []) {
    if(updatedPoints.length) {
      const index=new Map(pointIndex.value)
      for(const row of updatedPoints)if(row.runtime)index.set(row.id,workspaceRuntimeIndex(row))
      pointIndex.value=index
      if(runtimeSort(pointSort.value) || runtimeFilter(pointState.value))applyPointOrder()
    }
    if(collectors.value.length) {
      const index=new Map(collectorIndex.value)
      for(const row of collectors.value)if(row.runtime)index.set(row.id,workspaceRuntimeIndex(row))
      collectorIndex.value=index
      if(runtimeSort(collectorSort.value) || runtimeFilter(collectorState.value))applyCollectorOrder()
    }
  }
  let previousObservation:CollectorObservation|undefined
  let visibleIds:string[] = []
  let firstRange = true, pointOwnerId = '', configurationRequest:AbortController|undefined
  function cancelPointDetails() {
    configurationRequest?.abort();configurationRequest=undefined
    pointDetails.value=undefined;selectedLoading.value=false;selectedError.value=''
  }
  async function loadPointDetails() {
    const id=selectedPointId.value,current=collector.value
    if(pointDetails.value?.id === id)return
    cancelPointDetails()
    if(!id || !current || id.startsWith('_new:'))return
    const request=new AbortController()
    configurationRequest=request;selectedLoading.value=true
    try {
      const response=await loadWorkspacePoint(current.id,id,request.signal)
      if(request.signal.aborted || collector.value?.id !== current.id || selectedPointId.value !== id)return
      if(!response.success || !response.result?.[0])throw new Error(t('collectorWorkspace.loadFailed'))
      pointDetails.value=response.result[0]
    } catch(cause) {
      if(!request.signal.aborted && collector.value?.id === current.id)selectedError.value=describe(cause)
    } finally {
      if(configurationRequest === request){configurationRequest=undefined;selectedLoading.value=false}
    }
  }
  const describe = (cause:unknown) => cause instanceof Error ? cause.message : String(cause)
  const failures=new Map<string,string>()
  function feedback(key:string,cause?:unknown) {
    if(cause == null)failures.delete(key);else failures.set(key,describe(cause))
    valueError.value=[...failures.values()].join('; ')
  }
  /** 只用于持续观测；取消会同时释放请求和重连等待，有限查询不参与重试。 */
  function observeContinuously<T>(source:Observable<T>,disconnected:(cause:unknown)=>void) {
    return source.pipe(
      concatWith(throwError(()=>new Error(t('collectorWorkspace.streamEnded')))),
      retry({resetOnSuccess:true,delay:(cause,attempt)=>{
        // 鉴权或参数错误需要用户处理；断网、服务重启和意外结束按退避恢复。
        const status=Number(cause?.status)
        if(status >= 400 && status < 500 && status !== 408 && status !== 429)return throwError(()=>cause)
        disconnected(cause)
        return timer(Math.min(1000 * 2 ** Math.min(attempt - 1,4),15000))
      }}),
    )
  }
  const pending = new Map<string,NonNullable<CollectorObservation['data']>[number]>()
  const flush = throttle(() => {
    applyObservedValues(pointsById.value,pending.values())
    pending.clear()
  },100,{leading:true,trailing:true})
  function updateValues(payload:any) {
    const retained = new Set([...visibleIds,selectedPointId.value])
    for(const value of Array.isArray(payload) ? payload : [payload]) {
      if(!value)continue
      const sample = 'lastData' in value ? value.lastData : value
      const id = value.pointId || sample?.pointId || value.id
      // 同一刷新窗口也按采集时间保留最新值，避免晚到的旧样本覆盖待显示的新值。
      if(sample && retained.has(id) && Number(sample.timestamp || 0) >= Number(pending.get(id)?.timestamp || 0))pending.set(id,{...sample,pointId:id})
    }
    flush()
  }
  function unavailable<T extends CollectorObject>(value:T):T {
    return {...value,runtime:{...value.runtime,id:value.id,serverId:value.runtime?.serverId || '',available:false}}
  }
  function stopDetail() { ++streamRevision;subscription?.unsubscribe();subscription=undefined;flush.cancel();pending.clear();feedback('points') }
  function stopMonitoring() { ++monitoringRevision;monitoringSubscription?.unsubscribe();monitoringSubscription=undefined;feedback('monitoring') }
  function stopRecording() { ++recordingRevision;recordingSubscription?.unsubscribe();recordingSubscription=undefined;feedback('recording') }
  function unsubscribe() {
    stopDetail();stopMonitoring();stopRecording()
    updateVisible.cancel()
  }
  function objectSnapshots(object:CollectorObject|undefined) {
    const snapshots=object?.monitoring?.nodes || (object?.runtime ? [object.runtime] : [])
    return object?.runtime?.available === false ? snapshots.map(snapshot=>({...snapshot,available:false})) : snapshots
  }
  /** 摘要拥有采集器及通道状态，点位快照只补充点位，避免滚动重置摘要基线。 */
  function publishObservation() {
    const current=collector.value
    if(!current){observation.value=undefined;return}
    const snapshots=objectSnapshots(current),channelSnapshots=objectSnapshots(channel.value)
    const nodes=new Map((previousObservation?.nodes || []).map(node=>[node.serverId,{...node,
      collector:{id:current.id,serverId:node.serverId,available:false},channel:undefined,
    } as CollectorObservation['nodes'][number]]))
    for(const snapshot of snapshots)nodes.set(snapshot.serverId,{
      serverId:snapshot.serverId,collector:snapshot,
      channel:channelSnapshots.find(value=>value.serverId === snapshot.serverId),points:nodes.get(snapshot.serverId)?.points || [],
    })
    observation.value={timestamp:previousObservation?.timestamp || current.monitoring?.timestamp || 0,nodes:[...nodes.values()]}
  }
  function subscribeMonitoring() {
    stopMonitoring()
    if(!active || paused.value || document.hidden)return
    const revision=monitoringRevision,rows=collectors.value,channelRows=channels.value
    const query:CollectorWorkspaceQuery={monitoring:[]}
    for(let offset=0;offset<Math.max(rows.length,channelRows.length);offset+=100)query.monitoring.push({
      ids:rows.slice(offset,offset+100).map(row=>row.id),channelIds:channelRows.slice(offset,offset+100).map(row=>row.id),interval:2000,metrics:null,
    })
    if(!query.monitoring.length)return
    const disconnected=(cause:unknown)=>{
      if(revision !== monitoringRevision)return
      feedback('monitoring',cause)
      collectors.value=collectors.value.map(unavailable);channels.value=channels.value.map(unavailable)
      if(collector.value)collector.value=unavailable(collector.value)
      updateRuntimeOrder();publishObservation()
    }
    monitoringSubscription=observeContinuously(observeCollectionWorkspace(query),disconnected).subscribe({next:frame=>{
      if(revision !== monitoringRevision || !frame.monitoring)return
      feedback('monitoring')
      const value=frame.monitoring,known=new Set(value.collectors.map(row=>row.id)),knownChannels=new Set(value.channels?.map(row=>row.id))
      const updated=new Map(monitoredObjects(collectors.value.filter(row=>known.has(row.id)),{timestamp:value.timestamp,snapshots:value.collectors}).map(row=>[row.id,row]))
      collectors.value=collectors.value.map(row=>updated.get(row.id) || row)
      if(collector.value && updated.has(collector.value.id))collector.value=updated.get(collector.value.id)
      const updatedChannels=new Map(monitoredObjects(channels.value.filter(row=>knownChannels.has(row.id)),{timestamp:value.timestamp,snapshots:value.channels || []},undefined,'channel').map(row=>[row.id,row]))
      channels.value=channels.value.map(row=>updatedChannels.get(row.id) || row)
      updateRuntimeOrder();publishObservation()
    },error:disconnected})
  }
  function subscribeRecording() {
    stopRecording()
    const target=recordingTarget.value,revision=recordingRevision
    if(!target || !active || paused.value || document.hidden)return
    const disconnected=(cause:unknown)=>{if(revision === recordingRevision)feedback('recording',cause)}
    recordingSubscription=observeContinuously(observeCollectionWorkspace({monitoring:[],recording:target}),disconnected).subscribe({
      next:frame=>{if(revision === recordingRevision && recordingTarget.value === target && frame.recording){feedback('recording');recording.value=frame.recording}},
      error:disconnected,
    })
  }
  function subscribe() {
    stopDetail();updateVisible.cancel()
    const current=collector.value
    if(!active || paused.value || document.hidden)return
    const revision=streamRevision,catalogRevision=pointGeneration
    const allowed=new Set(points.value.map(point=>point.id))
    // One selected object may remain open outside the viewport; never retain values for scrolled-away rows.
    const ids=[...new Set([...visibleIds,selectedPointId.value])].filter(id=>allowed.has(id) && !id.startsWith('_new:')).slice(0,200)
    const retained=new Set(ids)
    points.value=points.value.map(point=>{
      if(retained.has(point.id) || !point.latest && !point.runtime)return point
      const {latest,runtime,monitoring,...configuration}=point
      return shallowReactive(configuration)
    })
    if(previousObservation)previousObservation={...previousObservation,nodes:previousObservation.nodes.map(node=>({...node,points:node.points.filter(point=>retained.has(point.id))}))}
    publishObservation()
    if(!current || !ids.length)return
    const query:CollectorWorkspaceQuery={monitoring:[],observation:{
      id:current.id,pointIds:ids,interval:2000,pointMetrics:null,metrics:[],channelMetrics:[],includeData:true,
    }}
    const disconnected=(cause:unknown)=>{
      if(revision !== streamRevision || catalogRevision !== pointGeneration)return
      feedback('points',cause)
      points.value=points.value.map(point=>retained.has(point.id) ? shallowReactive(unavailable(point)) : point)
      if(previousObservation)previousObservation={...previousObservation,nodes:previousObservation.nodes.map(node=>({...node,
        points:node.points.map(point=>({...point,runtime:{...point.runtime,available:false}})),
      }))}
      publishObservation()
      updateRuntimeOrder(points.value.filter(point=>retained.has(point.id)))
    }
    subscription=observeContinuously(observeCollectionWorkspace(query),disconnected).subscribe({next:frame=>{
      if(revision !== streamRevision || catalogRevision !== pointGeneration)return
      const value=frame.observation
      if(!value || !current || collector.value?.id !== current.id)return
      feedback('points')
      if(value.data){
        updateValues(value.data)
        return
      }
      const updated=new Map(observedPoints(points.value.filter(point=>retained.has(point.id)),value,previousObservation).map(point=>[point.id,shallowReactive(point)]))
      points.value=points.value.map(point=>updated.get(point.id) || point)
      previousObservation=value
      publishObservation()
      updateRuntimeOrder([...updated.values()])
    },error:disconnected})
  }
  const updateVisible=debounce(subscribe,120)
  function setVisiblePoints(ids:string[]) {
    const next=[...new Set(ids)].sort()
    if(next.join(',') === visibleIds.join(','))return
    visibleIds=next;stopDetail();updateVisible.cancel()
    if(firstRange && next.length){firstRange=false;subscribe()}
    else updateVisible()
  }
  function filterPoints() { refreshPointIndex() }
  function refreshPointIndex(background=false) {
    stopIndexRefresh();indexSubscription?.unsubscribe();ordering.value=false
    if(!collector.value || !runtimeSort(pointSort.value) && !runtimeFilter(pointState.value)) {applyPointOrder();return}
    const revision=pointGeneration
    const baseline=pointIndex.value
    if(!background){ordering.value=true;error.value=''}
    indexSubscription=queryWorkspaceIndex(points.value.filter(point=>!point.id.startsWith('_new:')),collector.value.id).subscribe({
      next:index=>{if(revision === pointGeneration){acceptIndex(pointIndex,index,baseline);indexTime.value=Date.now();applyPointOrder()}},
      error:cause=>{if(revision === pointGeneration){if(!background)error.value=describe(cause);ordering.value=false;scheduleIndexRefresh()}},
      complete:()=>{if(revision === pointGeneration){ordering.value=false;scheduleIndexRefresh()}},
    })
  }
  function filterCollectors() {
    stopIndexRefresh();indexSubscription?.unsubscribe();ordering.value=false
    if(!runtimeSort(collectorSort.value) && !runtimeFilter(collectorState.value)){applyCollectorOrder();return}
    const revision=generation
    const baseline=collectorIndex.value
    ordering.value=true;error.value=''
    indexSubscription=queryWorkspaceIndex(scopedCollectors.value).subscribe({
      next:index=>{if(revision === generation){acceptIndex(collectorIndex,index,baseline);indexTime.value=Date.now();applyCollectorOrder()}},
      error:cause=>{if(revision === generation){error.value=describe(cause);ordering.value=false}},
      complete:()=>{if(revision === generation)ordering.value=false},
    })
  }
  async function loadCollectors(resumeMonitoring=true) {
    stopMonitoring();stopIndexRefresh();indexSubscription?.unsubscribe();ordering.value=false
    const revision=++generation;loading.value=true;error.value=''
    try {
      const response=await listWorkspaceCollectors({sorts:[{name:'id',order:'asc'}]})
      if(revision !== generation)return
      if(!response.success)throw new Error(t('collectorWorkspace.loadFailed'))
      collectors.value=response.result || []
      if(collector.value)collector.value=collectors.value.find(item=>item.id === collector.value?.id) || collector.value
      if(!collector.value)filterCollectors()
      if(resumeMonitoring){subscribeMonitoring();scheduleIndexRefresh()}
    }catch(cause){if(revision === generation)error.value=describe(cause)}
    finally{if(revision === generation)loading.value=false}
  }
  async function loadPoints() {
    const current=collector.value,revision=++pointGeneration
    stopDetail();stopIndexRefresh();indexSubscription?.unsubscribe();ordering.value=false
    if(pointOwnerId !== (current?.id || '')) {
      cancelPointDetails();firstRange=true
      points.value=[];pointOrder.value=[];visibleIds=[];pointIndex.value=new Map()
      pointOwnerId=current?.id || ''
    }
    if(!current){pointLoading.value=false;subscribe();return}
    pointLoading.value=true;error.value=''
    try {
      const response=await listWorkspacePoints({terms:[{column:'collectorId',value:current.id}],sorts:[{name:'id',order:'asc'}]})
      if(revision !== pointGeneration)return
      if(!response.success)throw new Error(t('collectorWorkspace.loadFailed'))
      const previous=pointsById.value
      points.value=[...unsavedPoints.value.filter(point=>point.collectorId === current.id),...response.result || []].map(point=>shallowReactive({...previous.get(point.id),...point}))
      const retained=new Set(points.value.map(point=>point.id))
      visibleIds=visibleIds.filter(id=>retained.has(id))
      pointIndex.value=new Map([...pointIndex.value].filter(([id])=>retained.has(id)))
      if(!points.value.some(point=>point.id === selectedPointId.value))selectedPointId.value=''
      filterPoints();void loadPointDetails()
    }catch(cause){if(revision === pointGeneration)error.value=describe(cause)}
    finally{if(revision === pointGeneration){pointLoading.value=false;subscribe();scheduleIndexRefresh()}}
  }
  async function initialize() {
    initializing.value=true
    const results=await Promise.allSettled([listWorkspaceChannels({}),listWorkspaceProviders(),loadCollectors(false)])
    if(results[0].status === 'fulfilled' && results[0].value.success)channels.value=results[0].value.result || []
    if(results[1].status === 'fulfilled' && results[1].value.success)providers.value=results[1].value.result || []
    for(const result of [results[0],results[1]])if(result.status === 'rejected')error.value=describe(result.reason)
    else if(!result.value.success)error.value=t('collectorWorkspace.loadFailed')
    subscribeMonitoring();subscribe();initializing.value=false
  }
  function select(value?:CollectorObject, channelId='') {
    pointTrial.reset()
    countSubscription?.unsubscribe()
    stopIndexRefresh();indexSubscription?.unsubscribe();ordering.value=false;observation.value=undefined;previousObservation=undefined;recordingTarget.value=undefined;recording.value=undefined
    collector.value=value;selectedChannelId.value=value ? '' : channelId;pointSearch.value='';pointState.value='';selectedPointId.value=''
    if(!value)filterCollectors()
    void loadPoints()
  }
  /** Merge saved configuration without disturbing values, ordering snapshots or the active stream. */
  function applyObject(kind:'channel'|'collector', value:CollectorObject) {
    const merge=(current:CollectorObject)=>({...current,...value,runtime:current.runtime,monitoring:current.monitoring})
    if(kind === 'channel') {
      channels.value=channels.value.map(item=>item.id === value.id ? merge(item) : item)
      collectors.value=collectors.value.map(item=>item.channelId === value.id ? {...item,channelName:value.name} : item)
      if(collector.value?.channelId === value.id)collector.value={...collector.value,channelName:value.name}
    } else {
      collectors.value=collectors.value.map(item=>item.id === value.id ? merge(item) : item)
      if(collector.value?.id === value.id)collector.value=merge(collector.value)
    }
    collectorOrder.value=workspaceOrder(scopedCollectors.value,collectorSort.value,search.value,collectorState.value,collectorIndex.value)
  }
  /** Apply the saved row in place; only the selected point retains its full editing configuration. */
  function applyPoint(oldId:string, value:PointRow) {
    if(value.collectorId !== collector.value?.id)return
    const previous=pointsById.value.get(oldId)
    const saved={...previous,...value,latest:previous?.latest,runtime:previous?.runtime,monitoring:previous?.monitoring}
    if(selectedPointId.value === oldId) {
      const details=pointDetails.value
      cancelPointDetails()
      pointDetails.value={...details,...saved}
      selectedPointId.value=value.id
    }
    const {configuration,managedConfiguration,metadata,...summary}=saved
    points.value=points.value.map(point=>point.id === oldId ? shallowReactive(summary) as PointRow : point)
    unsavedPoints.value=unsavedPoints.value.filter(point=>point.id !== oldId)
    visibleIds=visibleIds.map(id=>id === oldId ? value.id : id)
    setOrder(pointOrder,pointOrder.value.map(id=>id === oldId ? value.id : id))
  }
  const pointTrial=usePointTrial(updateValues)
  function trial(point?:PointRow,selectedIds?:string[]) {
    const current=collector.value
    return current ? pointTrial.run(current.id,point ? [point.id] : selectedIds || visibleIds, point ? 'point' : 'list') : Promise.resolve(undefined)
  }
  function resume() { subscribeMonitoring();subscribe();subscribeRecording();scheduleIndexRefresh() }
  const onVisibility=()=>{if(document.hidden){unsubscribe();stopIndexRefresh()}else resume()}
  document.addEventListener('visibilitychange',onVisibility)
  watch(paused,()=>{if(paused.value){unsubscribe();stopIndexRefresh()}else resume()})
  watch(orderHeld,held=>{if(held)stopIndexRefresh();else{applyCollectorOrder();if(collector.value)refreshPointIndex(true)}})
  watch(recordingTarget,()=>{recording.value=undefined;subscribeRecording()})
  watch(selectedPointId,()=>{void loadPointDetails();updateVisible.cancel();subscribe()})
  onDeactivated(()=>{pointTrial.reset();active=false;++pointGeneration;cancelPointDetails();unsubscribe();stopIndexRefresh();indexSubscription?.unsubscribe();countSubscription?.unsubscribe();ordering.value=false})
  onActivated(()=>{if(!active){active=true;resume();void loadPointDetails()}})
  onBeforeUnmount(()=>{++generation;++pointGeneration;cancelPointDetails();unsubscribe();stopIndexRefresh();indexSubscription?.unsubscribe();countSubscription?.unsubscribe();document.removeEventListener('visibilitychange',onVisibility)})
  return {trialState:pointTrial.state,stopTrial:pointTrial.stop,collectors,filteredCollectors,scopedCollectors,channels,providers,points,filteredPoints,unsavedPoints,observation,recording,recordingTarget,collector,channel,selectedChannelId,selectedPointId,selectedPoint,selectedLoading,selectedError,loadPointDetails,initializing,loading,pointLoading,ordering,orderHeld,indexTime,error,valueError,paused,total,pointTotal,search,pointSearch,pointState,collectorState,pointSort,collectorSort,stateCounts,loadStateCounts,initialize,loadCollectors,loadPoints,applyObject,applyPoint,select,trial,filterPoints,filterCollectors,setVisiblePoints}
}
