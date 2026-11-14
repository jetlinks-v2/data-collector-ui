import { computed, onActivated, onDeactivated, onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { debounce, throttle } from 'lodash-es'
import { Subscription } from 'rxjs'
import { listWorkspaceChannels, listWorkspaceCollectors, listWorkspacePoints, listWorkspaceProviders, monitorCollectors, observeWorkspace, queryWorkspaceIndex } from '../../../api/data-collect/workspace'
import { monitoredObjects, type RuntimeMonitoringRound } from '../../../utils/runtimeMonitoring'
import { observedPoints } from '../../../utils/workspaceObservation'
import { readPoint } from '../../../api/data-collect/collector'
import { runtimeFilter, runtimeSort, workspaceOrder, type WorkspaceRuntimeIndex, type WorkspaceSort } from '../../../utils/workspaceList'
import type { CollectorObject, CollectorObservation, PointRow, ProviderDescriptor } from '../../../types/workspace'

/** 全量配置目录、有限运行索引和可视值流分别管理，滚动不重查配置或扰动全局排序。 */
export function useWorkspaceData() {
  const { t } = useI18n()
  const collectors = shallowRef<CollectorObject[]>([]), channels = shallowRef<CollectorObject[]>([])
  const providers = shallowRef<ProviderDescriptor[]>([]), points = shallowRef<PointRow[]>([])
  const unsavedPoints = shallowRef<PointRow[]>([]), observation = shallowRef<CollectorObservation>()
  const collector = shallowRef<CollectorObject>(), selectedPointId = ref('')
  const initializing = ref(true), loading = ref(false), pointLoading = ref(false), ordering = ref(false)
  const error = ref(''), paused = ref(false), valueError = ref('')
  const search = ref(''), pointSearch = ref(''), pointState = ref(''), collectorState = ref('')
  const pointSort = ref<WorkspaceSort>('newest'), collectorSort = ref<WorkspaceSort>('newest')
  const pointOrder = shallowRef<string[]>([]), collectorOrder = shallowRef<string[]>([])
  const indexTime = ref(0)
  const selectedPoint = computed(() => points.value.find(item => item.id === selectedPointId.value))
  const channel = computed(() => channels.value.find(item => item.id === collector.value?.channelId))
  const orderedRows = <T extends CollectorObject>(rows:T[], ids:string[]) => {
    const byId = new Map(rows.map(row => [row.id,row]))
    return ids.flatMap(id => byId.has(id) ? [byId.get(id)!] : [])
  }
  const filteredPoints = computed(() => orderedRows(points.value, pointOrder.value))
  const filteredCollectors = computed(() => orderedRows(collectors.value, collectorOrder.value))
  const total = computed(() => filteredCollectors.value.length), pointTotal = computed(() => filteredPoints.value.length)
  let pointIndex = new Map<string,WorkspaceRuntimeIndex>(), collectorIndex = new Map<string,WorkspaceRuntimeIndex>()
  let generation = 0, pointGeneration = 0, active = true, streamRevision = 0, detailRevision = 0
  let subscription:Subscription|undefined, detailSubscription:Subscription|undefined, indexSubscription:Subscription|undefined
  let previousObservation:CollectorObservation|undefined
  let visibleIds:string[] = []
  const describe = (cause:unknown) => cause instanceof Error ? cause.message : String(cause)
  const failures=new Map<string,string>()
  function feedback(key:string,cause?:unknown) {
    if(cause == null)failures.delete(key);else failures.set(key,describe(cause))
    valueError.value=[...failures.values()].join('; ')
  }
  const pending = new Map<string,any>()
  const flush = throttle(() => {
    points.value = points.value.map(point => pending.has(point.id) ? {...point,latest:pending.get(point.id)} : point)
    pending.clear()
  },250,{leading:true,trailing:true})
  function updateValues(payload:any) {
    const retained = new Set([...visibleIds,selectedPointId.value])
    for(const value of Array.isArray(payload) ? payload : [payload]) {
      if(!value)continue
      const sample = 'lastData' in value ? value.lastData : value
      const id = value.pointId || sample?.pointId || value.id
      if(sample && retained.has(id))pending.set(id,sample)
    }
    flush()
  }
  function unavailable<T extends CollectorObject>(value:T):T {
    return {...value,runtime:{...value.runtime,id:value.id,serverId:value.runtime?.serverId || '',available:false}}
  }
  function stopDetail() { ++detailRevision;detailSubscription?.unsubscribe();detailSubscription=undefined;flush.cancel();pending.clear() }
  function unsubscribe() {
    ++streamRevision;subscription?.unsubscribe();subscription=undefined;stopDetail();previousObservation=undefined
    updateVisible.cancel()
  }
  function subscribePoints() {
    stopDetail()
    const current=collector.value
    if(!current || !active || paused.value || document.hidden)return
    const revision=detailRevision, catalogRevision=pointGeneration
    const allowed=new Set(points.value.map(point=>point.id))
    // One selected object may remain open outside the viewport; never retain values for scrolled-away rows.
    const ids=[...new Set([...visibleIds,selectedPointId.value])].filter(id=>allowed.has(id) && !id.startsWith('_new:')).slice(0,200)
    const retained=new Set(ids)
    points.value=points.value.map(point=>{
      if(retained.has(point.id) || !point.latest && !point.runtime)return point
      const {latest,runtime,monitoring,...configuration}=point
      return configuration
    })
    if(previousObservation)previousObservation={...previousObservation,nodes:previousObservation.nodes.map(node=>({...node,points:node.points.filter(point=>retained.has(point.id))}))}
    observation.value=previousObservation
    const disconnected=(cause:unknown)=>{
      if(revision !== detailRevision || catalogRevision !== pointGeneration)return
      feedback('detail',cause);collector.value=unavailable(current)
      collectors.value=collectors.value.map(item=>item.id === current.id ? collector.value! : item)
      channels.value=channels.value.map(item=>item.id === current.channelId ? unavailable(item) : item)
      points.value=points.value.map(point=>retained.has(point.id) ? unavailable(point) : point)
    }
    detailSubscription=observeWorkspace(current.id,ids).subscribe({next:value=>{
      if(revision !== detailRevision || catalogRevision !== pointGeneration || collector.value?.id !== current.id)return
      feedback('detail');observation.value=value
      const updated=new Map(observedPoints(points.value.filter(point=>retained.has(point.id)),value,previousObservation).map(point=>[point.id,point]))
      points.value=points.value.map(point=>updated.get(point.id) || point)
      const round=(sample:CollectorObservation)=>({timestamp:sample.timestamp,snapshots:sample.nodes.map(node=>node.collector)})
      collector.value=monitoredObjects([collector.value!],round(value),previousObservation ? round(previousObservation) : undefined)[0]
      collectors.value=collectors.value.map(item=>item.id === current.id ? collector.value! : item)
      const channelRound=(sample:CollectorObservation)=>({timestamp:sample.timestamp,snapshots:sample.nodes.flatMap(node=>node.channel ? [node.channel] : [])})
      channels.value=channels.value.map(item=>item.id === current.channelId ? monitoredObjects([item],channelRound(value),previousObservation ? channelRound(previousObservation) : undefined,'channel')[0] : item)
      previousObservation=value
    },error:disconnected,complete:()=>disconnected(t('collectorWorkspace.streamEnded'))})
  }
  const updateVisible=debounce(subscribePoints,120,{maxWait:250})
  function setVisiblePoints(ids:string[]) {
    const next=[...new Set(ids)].sort()
    if(next.join(',') === visibleIds.join(','))return
    visibleIds=next;updateVisible()
  }
  function subscribe() {
    unsubscribe()
    failures.clear();valueError.value=''
    if(!active || paused.value || document.hidden)return
    const stream=streamRevision
    subscription=new Subscription()
    const rows=collectors.value.filter(value=>value.id !== collector.value?.id)
    const channelRows=channels.value.filter(value=>value.id !== collector.value?.channelId)
    // Respect the shared API's per-request bound without creating a timer for each object.
    for(let offset=0;offset<Math.max(rows.length,channelRows.length);offset+=100) {
      const ids=rows.slice(offset,offset+100).map(row=>row.id), channelIds=channelRows.slice(offset,offset+100).map(row=>row.id)
      const known=new Set(ids), knownChannels=new Set(channelIds)
      let previous:RuntimeMonitoringRound|undefined, previousChannels:RuntimeMonitoringRound|undefined
      const disconnected=(cause:unknown)=>{
        if(stream !== streamRevision)return
        feedback('list:'+offset,cause)
        collectors.value=collectors.value.map(value=>known.has(value.id) ? unavailable(value) : value)
        channels.value=channels.value.map(value=>knownChannels.has(value.id) ? unavailable(value) : value)
      }
      subscription.add(monitorCollectors(ids,2000,channelIds).subscribe({next:value=>{
        if(stream !== streamRevision)return
        feedback('list:'+offset)
        const round={timestamp:value.timestamp,snapshots:value.collectors}
        const updated=new Map(monitoredObjects(collectors.value.filter(item=>known.has(item.id)),round,previous).map(item=>[item.id,item]))
        collectors.value=collectors.value.map(item=>updated.get(item.id) || item);previous=round
        const channelRound={timestamp:value.timestamp,snapshots:value.channels || []}
        const updatedChannels=new Map(monitoredObjects(channels.value.filter(item=>knownChannels.has(item.id)),channelRound,previousChannels,'channel').map(item=>[item.id,item]))
        channels.value=channels.value.map(item=>updatedChannels.get(item.id) || item);previousChannels=channelRound
      },error:disconnected,complete:()=>disconnected(t('collectorWorkspace.streamEnded'))}))
    }
    subscribePoints()
  }
  function filterPoints() {
    indexSubscription?.unsubscribe();ordering.value=false
    const apply=()=>{pointOrder.value=workspaceOrder(points.value,pointSort.value,pointSearch.value,pointState.value,pointIndex)}
    if(!collector.value || !runtimeSort(pointSort.value) && !runtimeFilter(pointState.value)) {apply();return}
    const revision=pointGeneration
    ordering.value=true;error.value=''
    indexSubscription=queryWorkspaceIndex(points.value.filter(point=>!point.id.startsWith('_new:')),collector.value.id).subscribe({
      next:index=>{if(revision === pointGeneration){pointIndex=index;indexTime.value=Date.now();apply()}},
      error:cause=>{if(revision === pointGeneration){error.value=describe(cause);ordering.value=false}},
      complete:()=>{if(revision === pointGeneration)ordering.value=false},
    })
  }
  function filterCollectors() {
    indexSubscription?.unsubscribe();ordering.value=false
    const apply=()=>{collectorOrder.value=workspaceOrder(collectors.value,collectorSort.value,search.value,collectorState.value,collectorIndex)}
    if(!runtimeSort(collectorSort.value) && !runtimeFilter(collectorState.value)){apply();return}
    const revision=generation
    ordering.value=true;error.value=''
    indexSubscription=queryWorkspaceIndex(collectors.value).subscribe({
      next:index=>{if(revision === generation){collectorIndex=index;indexTime.value=Date.now();apply()}},
      error:cause=>{if(revision === generation){error.value=describe(cause);ordering.value=false}},
      complete:()=>{if(revision === generation)ordering.value=false},
    })
  }
  async function loadCollectors(resumeMonitoring=true) {
    unsubscribe()
    const revision=++generation;loading.value=true;error.value=''
    try {
      const response=await listWorkspaceCollectors({sorts:[{name:'id',order:'asc'}]})
      if(revision !== generation)return
      if(!response.success)throw new Error(t('collectorWorkspace.loadFailed'))
      collectors.value=response.result || []
      if(collector.value)collector.value=collectors.value.find(item=>item.id === collector.value?.id) || collector.value
      if(!collector.value)filterCollectors()
      if(resumeMonitoring)subscribe()
    }catch(cause){if(revision === generation)error.value=describe(cause)}
    finally{if(revision === generation)loading.value=false}
  }
  async function loadPoints() {
    const current=collector.value,revision=++pointGeneration
    unsubscribe();indexSubscription?.unsubscribe();ordering.value=false
    points.value=[];pointOrder.value=[];visibleIds=[];pointIndex.clear()
    if(!current){pointLoading.value=false;subscribe();return}
    pointLoading.value=true;error.value=''
    try {
      const response=await listWorkspacePoints({terms:[{column:'collectorId',value:current.id}],sorts:[{name:'id',order:'asc'}]})
      if(revision !== pointGeneration)return
      if(!response.success)throw new Error(t('collectorWorkspace.loadFailed'))
      points.value=[...unsavedPoints.value.filter(point=>point.collectorId === current.id),...response.result || []]
      if(!points.value.some(point=>point.id === selectedPointId.value))selectedPointId.value=''
      filterPoints();subscribe()
    }catch(cause){if(revision === pointGeneration)error.value=describe(cause)}
    finally{if(revision === pointGeneration)pointLoading.value=false}
  }
  async function initialize() {
    initializing.value=true
    const results=await Promise.allSettled([listWorkspaceChannels({}),listWorkspaceProviders(),loadCollectors(false)])
    if(results[0].status === 'fulfilled' && results[0].value.success)channels.value=results[0].value.result || []
    if(results[1].status === 'fulfilled' && results[1].value.success)providers.value=results[1].value.result || []
    for(const result of [results[0],results[1]])if(result.status === 'rejected')error.value=describe(result.reason)
    else if(!result.value.success)error.value=t('collectorWorkspace.loadFailed')
    subscribe();initializing.value=false
  }
  function select(value?:CollectorObject) {
    indexSubscription?.unsubscribe();ordering.value=false;observation.value=undefined
    collector.value=value;pointSearch.value='';pointState.value='';selectedPointId.value=''
    if(!value)filterCollectors()
    void loadPoints()
  }
  async function trial(point?:PointRow,selectedIds?:string[]) {
    const current=collector.value,revision=pointGeneration
    if(!current)return undefined
    const ids=(point ? [point.id] : selectedIds || visibleIds).filter(id=>!id.startsWith('_new:'))
    if(!ids.length)return undefined
    try {
      // Explicit bulk reads remain bounded; the default action reads only what is on screen.
      let count=0
      for(let offset=0;offset<ids.length;offset+=200){
        const batch=ids.slice(offset,offset+200),result=await readPoint(current.id,batch)
        if(collector.value?.id !== current.id || revision !== pointGeneration)return undefined
        if(!result.success)throw new Error(t('collectorWorkspace.loadFailed'))
        updateValues(result.result || [])
        count+=new Set((result.result || []).filter(row=>row.pointId != null && batch.includes(row.pointId)).map(row=>row.pointId)).size
      }
      valueError.value='';return count
    }catch(cause){if(collector.value?.id === current.id && revision === pointGeneration)valueError.value=describe(cause);return undefined}
  }
  const onVisibility=()=>{if(document.hidden)unsubscribe();else subscribe()}
  document.addEventListener('visibilitychange',onVisibility)
  watch(paused,subscribe)
  watch(selectedPointId,()=>updateVisible())
  onDeactivated(()=>{active=false;++pointGeneration;unsubscribe();indexSubscription?.unsubscribe();ordering.value=false})
  onActivated(()=>{if(!active){active=true;subscribe()}})
  onBeforeUnmount(()=>{++generation;++pointGeneration;unsubscribe();indexSubscription?.unsubscribe();document.removeEventListener('visibilitychange',onVisibility)})
  return {collectors,filteredCollectors,channels,providers,points,filteredPoints,unsavedPoints,observation,collector,channel,selectedPointId,selectedPoint,initializing,loading,pointLoading,ordering,indexTime,error,valueError,paused,total,pointTotal,search,pointSearch,pointState,collectorState,pointSort,collectorSort,initialize,loadCollectors,loadPoints,select,trial,filterPoints,filterCollectors,setVisiblePoints}
}
