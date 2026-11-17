import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import * as vue from 'vue'
import { throttle, debounce } from 'lodash-es'
import {dirname,resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import { Observable, Subject, Subscription } from 'rxjs'
import { transformSync } from 'esbuild'

const require = createRequire(import.meta.url)
const utilityCache=new Map()
function loadUtility(path){
  if(utilityCache.has(path))return utilityCache.get(path).exports
  const module={exports:{}};utilityCache.set(path,module)
  new Function('require','module','exports',transformSync(readFileSync(path,'utf8'),{loader:'ts',format:'cjs'}).code)(id=>id.startsWith('.') ? loadUtility(resolve(dirname(path),`${id}.ts`)) : require(id),module,module.exports)
  return module.exports
}
const workspaceList=loadUtility(fileURLToPath(new URL('../utils/workspaceList.ts',import.meta.url)))
const {applyObservedValues}=loadUtility(fileURLToPath(new URL('../utils/workspaceObservation.ts',import.meta.url)))
const runtimeMonitoring=loadUtility(fileURLToPath(new URL('../utils/runtimeMonitoring.ts',import.meta.url)))
const source = readFileSync(new URL('../views/data-collect/hook/useWorkspaceData.ts', import.meta.url), 'utf8')
const deferred = () => {
  let resolve
  const promise = new Promise(done => { resolve = done })
  return { promise, resolve }
}

function combined(api,query) {
  return new Observable(observer=>{
    const subscription=new Subscription()
    for(const item of query.monitoring)subscription.add(api.monitorCollectors(item.ids,item.interval,item.channelIds).subscribe({next:value=>observer.next({monitoring:value}),error:error=>observer.error(error)}))
    if(query.observation){const item=query.observation;subscription.add(api.observeWorkspace(item.id,item.pointIds).subscribe({next:value=>observer.next({observation:value}),error:error=>observer.error(error),complete:()=>observer.complete()}))}
    if(query.recording)subscription.add(api.observeLatestRecording(query.recording).subscribe({next:value=>observer.next({recording:value}),error:error=>observer.error(error)}))
    return subscription
  })
}

test('initial queries run together and independent subscriptions paint the first snapshot immediately', async () => {
  const channels = deferred(), providers = deferred(), collectors = deferred()
  const calls = [], monitors = [], observations = [], closed = []
  const details = []
  let pointObserver
  const collector = { id: 'collector', channelId: 'channel', name: 'Collector' }
  const runtime = id => ({ id, serverId: 'server', available: true, state: 'running' })
  const api = {
    listWorkspaceChannels: () => { calls.push('channels'); return channels.promise },
    listWorkspaceProviders: () => { calls.push('providers'); return providers.promise },
    listWorkspaceCollectors: () => { calls.push('collectors'); return collectors.promise },
    listWorkspacePoints: async () => ({ success: true, result: ['point', 'second', 'third'].map(id => ({ id, collectorId: collector.id })) }),
    loadWorkspacePoint: (collectorId, id, signal) => {
      const result=deferred();details.push({collectorId,id,signal,...result});return result.promise
    },
    monitorCollectors: (ids, interval, channelIds) => new Observable(observer => {
      monitors.push({ ids, interval, channelIds })
      observer.next({ timestamp: 100, collectors: [runtime('collector')], channels: [runtime('channel')] })
    }),
    observeWorkspace: (id, pointIds) => new Observable(observer => {
      pointObserver = observer
      observations.push({ id, pointIds })
      observer.next({ timestamp: 101, nodes: [{ collector: runtime(id), channel: runtime('channel'), points: [] }] })
      return () => closed.push(pointIds)
    }),
  }
  api.observeCollectionWorkspace=query=>combined(api,query)
  const module = { exports: {} }
  new Function('require', 'module', 'exports', transformSync(source, { loader: 'ts', format: 'cjs' }).code)(id => {
    if (id === 'vue') return { ...vue, onActivated() {}, onDeactivated() {}, onBeforeUnmount() {} }
    if (id === 'vue-i18n') return { useI18n: () => ({ t: key => key }) }
    if (id === 'lodash-es') return { throttle, debounce }
    if (id.endsWith('/api/data-collect/workspace')) return api
    if (id.endsWith('/utils/runtimeMonitoring')) return { monitoredObjects: (values, round) => values.map(value => ({ ...value, runtime: round.snapshots.find(item => item.id === value.id) })) }
    if (id.endsWith('/utils/workspaceObservation')) return { applyObservedValues, observedPoints: values => values.map(value => ({ ...value, latest: { parsedData: 0, timestamp: 101 } })) }
    if (id === './usePointTrial') return {usePointTrial:()=>({state:vue.ref({running:false,ids:[],total:0,completed:0,error:'',cancelled:false}),run:async()=>0,reset(){},stop(){}})}
    if (id.endsWith('/api/data-collect/collector')) return {}
    if (id.endsWith('/utils/workspaceList')) return workspaceList
    return require(id)
  }, module, module.exports)
  const oldDocument = globalThis.document
  globalThis.document = { hidden: false, addEventListener() {}, removeEventListener() {} }
  const scope = vue.effectScope()
  try {
    const data = scope.run(() => module.exports.useWorkspaceData())
    assert.equal(data.initializing.value, true)
    const initialization = data.initialize()
    assert.deepEqual(calls, ['channels', 'providers', 'collectors'])
    collectors.resolve({ success: true, result: [collector] })
    providers.resolve({ success: true, result: [] })
    channels.resolve({ success: true, result: [{ id: 'channel', name: 'Channel' }] })
    await initialization
    assert.equal(data.initializing.value, false)
    assert.equal(monitors.length, 1)
    assert.deepEqual(monitors[0].ids, ['collector'])
    assert.deepEqual(monitors[0].channelIds, ['channel'])
    assert.equal(data.collectors.value[0].runtime.state, 'running')
    assert.equal(data.channels.value[0].runtime.state, 'running')
    data.select(data.collectors.value[0])
    await new Promise(resolve => setImmediate(resolve))
    assert.deepEqual(observations, [])
    assert.equal(data.points.value[0].latest, undefined)
    data.setVisiblePoints(['point'])
    // The first visible range starts synchronously, with no empty request or debounce delay.
    assert.deepEqual(observations.at(-1), { id: 'collector', pointIds: ['point'] })
    assert.equal(data.points.value[0].latest.parsedData, 0)
    const directory = data.points.value, ordered = data.filteredPoints.value
    const push = (timestamp, parsedData) => pointObserver.next({timestamp, nodes: [], data: [{pointId: 'point', timestamp, parsedData}]})
    push(200, 1)
    push(203, false)
    push(202, 2)
    await new Promise(resolve => setTimeout(resolve, 140))
    assert.equal(data.points.value[0].latest.parsedData, false, 'pending samples retain the newest timestamp')
    assert.equal(data.points.value, directory, 'data frames do not replace the directory')
    assert.equal(data.filteredPoints.value, ordered, 'data frames do not rebuild the ordered rows')
    const streamCounts=[monitors.length,observations.length,closed.length],runtime=data.collector.value.runtime
    data.applyObject('collector',{id:'collector',name:'Edited collector',configuration:{station:2}})
    data.applyObject('channel',{id:'channel',name:'Edited channel',configuration:{host:'192.0.2.5'}})
    assert.deepEqual([monitors.length,observations.length,closed.length],streamCounts,'applying settings does not replace monitoring subscriptions')
    assert.equal(data.points.value,directory,'applying settings does not reload or replace point values')
    assert.equal(data.collector.value.runtime,runtime,'configuration writes preserve current observation')
    assert.equal(data.collector.value.channelName,'Edited channel')
    assert.equal(data.channels.value[0].configuration.host,'192.0.2.5')
    push(204, 0)
    push(205, false)
    // Scrolling releases old values and cancels their stream without rebuilding navigation monitoring.
    data.setVisiblePoints(['second'])
    assert.deepEqual(closed.at(-1), ['point'])
    assert.equal(observations.length, 1)
    await new Promise(resolve => setTimeout(resolve, 160))
    assert.deepEqual(closed.at(-1), ['point'])
    assert.deepEqual(observations.at(-1).pointIds, ['second'])
    assert.equal(data.points.value[0].latest, undefined)
    assert.equal(directory[0].latest.timestamp, 204, 'canceling the old stream discards its pending trailing update')
    assert.equal(data.points.value[1].latest.parsedData, 0)
    assert.equal(monitors.length,1,'scrolling never replaces navigation monitoring')
    // An open editor retains exactly its selected point while other off-screen values are released.
    data.selectedPointId.value = 'second'
    await vue.nextTick()
    assert.equal(data.selectedLoading.value, true)
    assert.equal(data.selectedPoint.value, undefined, 'a directory row must never become a saveable form')
    details.at(-1).resolve({success:true,result:[{id:'second',configuration:{address:2},managedConfiguration:{filters:['test']}}]})
    await new Promise(resolve => setImmediate(resolve))
    assert.deepEqual(data.selectedPoint.value.configuration,{address:2})
    assert.equal(data.points.value[1].configuration,undefined, 'full configuration is held only for the selected point')
    data.setVisiblePoints(['third'])
    await new Promise(resolve => setTimeout(resolve, 160))
    assert.deepEqual(new Set(observations.at(-1).pointIds), new Set(['second', 'third']))
    data.selectedPointId.value = ''
    await new Promise(resolve => setTimeout(resolve, 160))
    assert.equal(data.points.value[1].latest, undefined)
    assert.deepEqual(observations.at(-1).pointIds, ['third'])
    assert.equal(data.selectedPoint.value,undefined)
    // Continuous scrolling cancels the old stream immediately and waits until scrolling settles.
    const before=observations.length
    for(const id of ['point','second','third','point']){
      data.setVisiblePoints([id])
      await new Promise(resolve => setTimeout(resolve,80))
      assert.equal(observations.length,before)
    }
    await new Promise(resolve => setTimeout(resolve,80))
    assert.deepEqual(observations.at(-1).pointIds,['point'])
    // Rapid selection aborts the previous detail request; its late response cannot replace the editor.
    data.selectedPointId.value='point';await vue.nextTick()
    const stale=details.at(-1)
    data.selectedPointId.value='third';await vue.nextTick()
    assert.equal(stale.signal.aborted,true)
    stale.resolve({success:true,result:[{id:'point',configuration:{address:1}}]})
    details.at(-1).resolve({success:true,result:[{id:'third',configuration:{address:3}}]})
    await new Promise(resolve => setImmediate(resolve))
    assert.equal(data.selectedPoint.value.id,'third')
    assert.equal(data.selectedPoint.value.configuration.address,3)
    const requests=details.length
    data.setVisiblePoints(['second'])
    await new Promise(resolve => setTimeout(resolve,160))
    assert.equal(details.length,requests,'scrolling does not reload protocol configuration')
    data.paused.value = true
    await vue.nextTick()
    assert.deepEqual(new Set(closed.at(-1)),new Set(['second','third']))
    data.select(undefined,'channel');await new Promise(resolve=>setImmediate(resolve))
    assert.deepEqual(data.filteredCollectors.value.map(item=>item.id),['collector'])
    assert.equal(data.channel.value.id,'channel')
    data.select(undefined,'other');await new Promise(resolve=>setImmediate(resolve))
    assert.deepEqual(data.filteredCollectors.value,[],'a channel view never includes collectors of another channel')
  } finally {
    scope.stop()
    if (oldDocument === undefined) delete globalThis.document
    else globalThis.document = oldDocument
  }
})

async function reconnectingWorkspace(sorting = false, realMonitoring = false) {
  const observations=[],monitors=[],recordings=[],requests=[],retries=[],unmount=[],queries=[],activated=[],deactivated=[]
  let visibility
  const runtime=id=>({id,serverId:'server',available:true,state:'running'})
  const snapshot=()=>({timestamp:Date.now(),nodes:[{serverId:'server',collector:runtime('collector'),channel:runtime('channel'),points:[]}]})
  const api={
    listWorkspaceChannels:async()=>({success:true,result:[{id:'channel'}]}),
    listWorkspaceProviders:async()=>({success:true,result:[]}),
    listWorkspaceCollectors:async()=>({success:true,result:[{id:'collector',channelId:'channel'},{id:'other'}]}),
    listWorkspacePoints:async()=>({success:true,result:['first','second'].map(id=>({id,name:id,state:'enabled',collectorId:'collector'}))}),
    loadWorkspacePoint:async(_collector,id)=>({success:true,result:[{id,collectorId:'collector',configuration:{address:1}}]}),
    queryWorkspaceIndex:(rows,id)=>new Observable(observer=>{const query={rows,id,observer,closed:false};queries.push(query);return ()=>{query.closed=true}}),
    monitorCollectors:(ids)=>new Observable(observer=>{monitors.push({ids,observer})}),
    observeWorkspace:(id,pointIds)=>new Observable(observer=>{observations.push({id,pointIds,observer})}),
    observeLatestRecording:target=>new Observable(observer=>{recordings.push({target,observer})}),
  }
  api.observeCollectionWorkspace=query=>{requests.push(query);return combined(api,query)}
  const module={exports:{}}
  new Function('require','module','exports',transformSync(source,{loader:'ts',format:'cjs'}).code)(id=>{
    if(id === 'vue')return {...vue,onActivated:callback=>activated.push(callback),onDeactivated:callback=>deactivated.push(callback),onBeforeUnmount:callback=>unmount.push(callback)}
    if(id === 'vue-i18n')return {useI18n:()=>({t:key=>key})}
    if(id === 'rxjs')return {...require(id),timer:delay=>{const signal=new Subject();retries.push({delay,signal});return signal}}
    if(id.endsWith('/api/data-collect/workspace'))return api
    if(id.endsWith('/utils/runtimeMonitoring'))return realMonitoring ? runtimeMonitoring : {monitoredObjects:(values,round)=>values.map(value=>{const runtime=round.snapshots.find(item=>item.id === value.id);return {...value,runtime,monitoring:runtime?.summary}})}
    if(id.endsWith('/utils/workspaceObservation'))return {applyObservedValues,observedPoints:(values,frame)=>sorting ? values.map(value=>{const runtime=frame.nodes.flatMap(node=>node.points).find(item=>item.id === value.id);return runtime ? {...value,runtime,monitoring:runtime.summary} : value}) : values}
    if(id === './usePointTrial')return {usePointTrial:()=>({state:vue.ref({running:false,ids:[],total:0,completed:0,error:'',cancelled:false}),run:async()=>0,reset(){},stop(){}})}
    if(id.endsWith('/api/data-collect/collector'))return {}
    if(id.endsWith('/utils/workspaceList'))return workspaceList
    return require(id)
  },module,module.exports)
  const oldDocument=globalThis.document
  globalThis.document={hidden:false,addEventListener:(_,callback)=>{visibility=callback},removeEventListener(){}}
  const scope=vue.effectScope()
  const data=scope.run(()=>module.exports.useWorkspaceData())
  await data.initialize()
  data.select(data.collectors.value[0]);await new Promise(resolve=>setImmediate(resolve))
  data.setVisiblePoints(['first'])
  return {data,api,observations,monitors,recordings,requests,retries,snapshot,queries,activated,deactivated,visibility:()=>visibility(),
    reconnect(index){retries[index].signal.next(0);retries[index].signal.complete()},
    close(){unmount.forEach(callback=>callback());scope.stop();globalThis.document=oldDocument},
  }
}

test('saving and refreshing a point retain its list, live values and editor until the replacement directory arrives',async()=>{
  const value=await reconnectingWorkspace()
  try {
    const {data,api}=value
    data.selectedPointId.value='first';await vue.nextTick();await new Promise(resolve=>setImmediate(resolve))
    const latest={timestamp:1,parsedData:42}
    data.points.value[0].latest=latest
    data.applyPoint('first',{...data.selectedPoint.value,name:'Updated point',configuration:{address:2}})
    const rows=data.points.value,ordered=data.filteredPoints.value
    assert.equal(data.selectedPoint.value.configuration.address,2)
    assert.equal(rows[0].configuration,undefined,'full configuration stays in the selected editor')
    const pending=deferred();api.listWorkspacePoints=()=>pending.promise
    const refreshing=data.loadPoints()
    assert.equal(data.points.value,rows,'refresh never clears the current list')
    assert.equal(data.filteredPoints.value,ordered)
    assert.equal(data.selectedPoint.value.id,'first')
    assert.equal(data.selectedLoading.value,false)
    pending.resolve({success:true,result:[{id:'first',name:'Updated point',collectorId:'collector'},{id:'second',name:'second',collectorId:'collector'}]})
    await refreshing
    assert.equal(data.points.value[0].latest,latest)
    assert.equal(data.selectedPoint.value.configuration.address,2)
    api.listWorkspacePoints=async()=>{throw new Error('directory unavailable')}
    await data.loadPoints()
    assert.equal(data.points.value.length,2,'failed refresh preserves the usable list')
    assert.equal(data.error.value,'directory unavailable')
    assert.equal(value.observations.at(-1).observer.closed,false,'a failed directory refresh resumes live observation')
    value.observations.at(-1).observer.next({timestamp:2,nodes:[],data:[{pointId:'first',timestamp:2,parsedData:43}]})
    assert.equal(data.points.value[0].latest.parsedData,43)
    const switching=deferred();api.listWorkspacePoints=()=>switching.promise
    data.select({id:'other'})
    assert.deepEqual(data.points.value,[],'a different collector must never show the previous directory')
    switching.resolve({success:true,result:[]});await new Promise(resolve=>setImmediate(resolve))
  } finally {value.close()}
})

test('directory refresh cannot invalidate editing details or let a late response overwrite a saved point',async()=>{
  const value=await reconnectingWorkspace()
  try {
    const {data,api}=value,details=deferred()
    api.loadWorkspacePoint=()=>details.promise
    data.selectedPointId.value='first';await vue.nextTick()
    await data.loadPoints()
    details.resolve({success:true,result:[{id:'first',collectorId:'collector',configuration:{address:1}}]})
    await new Promise(resolve=>setImmediate(resolve))
    assert.equal(data.selectedPoint.value.configuration.address,1,'directory refresh does not cancel the selected configuration')
    data.selectedPointId.value='second';await vue.nextTick();await new Promise(resolve=>setImmediate(resolve))
    data.applyPoint('first',{id:'first',collectorId:'collector',name:'Saved elsewhere',configuration:{address:2}})
    assert.equal(data.selectedPointId.value,'second','saving a different row never takes over the current selection')
    data.selectedPointId.value='';await vue.nextTick()
    const stale=deferred();api.loadWorkspacePoint=()=>stale.promise
    data.selectedPointId.value='first';await vue.nextTick()
    data.applyPoint('first',{id:'first',collectorId:'collector',configuration:{address:3}})
    stale.resolve({success:true,result:[{id:'first',collectorId:'collector',configuration:{address:1}}]})
    await new Promise(resolve=>setImmediate(resolve))
    assert.equal(data.selectedPoint.value.configuration.address,3,'the saved configuration wins over an earlier detail response')
  } finally {value.close()}
})

test('a newly saved draft replaces its temporary identity without duplicating or clearing other rows',async()=>{
  const value=await reconnectingWorkspace()
  try {
    const {data}=value
    const draft={id:'_new:test',collectorId:'collector',name:'New point',configuration:{address:3}}
    data.points.value=[draft,...data.points.value];data.unsavedPoints.value=[draft];data.filterPoints()
    data.selectedPointId.value=draft.id;await vue.nextTick()
    data.applyPoint(draft.id,{...draft,id:'saved-id'})
    assert.equal(data.points.value.length,3)
    assert.equal(data.filteredPoints.value[0].id,'saved-id')
    assert.equal(data.selectedPoint.value.id,'saved-id')
    assert.equal(data.selectedPoint.value.configuration.address,3)
    assert.deepEqual(data.unsavedPoints.value,[])
  } finally {value.close()}
})

test('scrolling cancels a failed range and its pending reconnect without carrying its error forward',async()=>{
  const value=await reconnectingWorkspace()
  try {
    value.observations[0].observer.next(value.snapshot())
    value.observations[0].observer.error(new TypeError('network error'))
    assert.equal(value.data.valueError.value,'network error')
    assert.equal(value.retries[0].delay,1000)
    assert.equal(value.retries[0].signal.observers.length,1)
    value.data.setVisiblePoints(['second'])
    assert.equal(value.data.valueError.value,'','a normal range switch clears the old range error')
    assert.equal(value.retries[0].signal.observers.length,0,'the old reconnect is cancelled immediately')
    await new Promise(resolve=>setTimeout(resolve,160))
    assert.deepEqual(value.observations.at(-1).pointIds,['second'])
    value.reconnect(0)
    assert.equal(value.observations.length,2,'a cancelled retry cannot resubscribe to offscreen points')
    value.observations.at(-1).observer.next(value.snapshot())
    assert.equal(value.data.valueError.value,'')
  } finally {value.close()}
})

test('summary failure retries its subscription while point updates continue without hiding the error',async()=>{
  const value=await reconnectingWorkspace()
  try {
    value.observations[0].observer.next(value.snapshot())
    value.monitors.at(-1).observer.error(new TypeError('network error'))
    value.observations[0].observer.next(value.snapshot())
    assert.equal(value.data.valueError.value,'network error','a healthy point stream cannot hide a summary failure')
    assert.equal(value.observations[0].observer.closed,false)
    value.reconnect(0)
    assert.deepEqual(value.monitors.at(-1).ids,['collector','other'])
    value.monitors.at(-1).observer.next({timestamp:Date.now(),collectors:[{id:'other',available:true}],channels:[]})
    assert.equal(value.data.valueError.value,'')
    assert.equal(value.observations.length,1,'summary reconnect does not replace visible points')
  } finally {value.close()}
})

test('scrolling and diagnostic changes preserve summary rates and isolate subscription cancellation',async()=>{
  const value=await reconnectingWorkspace(false,true)
  try {
    const summary=value.monitors[0],point=value.observations[0]
    const emit=(timestamp,count)=>summary.observer.next({timestamp,channels:[],collectors:[{
      id:'collector',serverId:'server',available:true,state:'running',
      metrics:{scope:'collector',instanceId:'instance',sampledAt:timestamp,values:{receivedSamples:{available:true,value:count}}},
    }]})
    emit(1000,100);emit(2000,120)
    assert.equal(value.data.collector.value.monitoring.sampleRate,20)
    value.data.recordingTarget.value={collectorId:'collector',serverId:'server',interval:1000};await vue.nextTick()
    assert.equal(value.recordings.length,1)
    assert.equal(point.observer.closed,false)
    value.data.setVisiblePoints(['second'])
    assert.equal(point.observer.closed,true)
    assert.equal(summary.observer.closed,false)
    assert.equal(value.recordings[0].observer.closed,false)
    emit(3000,150)
    assert.equal(value.data.collector.value.monitoring.sampleRate,30,'scrolling preserves the preceding summary baseline')
    await new Promise(resolve=>setTimeout(resolve,160))
    assert.equal(value.monitors.length,1)
    assert.deepEqual(value.observations.at(-1).pointIds,['second'])
    const request=value.requests.find(request=>request.observation)
    assert.deepEqual(request.monitoring,[])
    assert.deepEqual(request.observation.metrics,[])
    assert.deepEqual(request.observation.channelMetrics,[])
    value.data.recordingTarget.value=undefined;await vue.nextTick()
    assert.equal(value.recordings[0].observer.closed,true)
    assert.equal(summary.observer.closed,false)
    assert.equal(value.observations.at(-1).observer.closed,false)
  } finally {value.close()}
  assert.equal(value.monitors[0].observer.closed,true)
  assert.ok(value.observations.every(item=>item.observer.closed))
})

test('a point failure cannot interrupt summary or diagnostic updates or be hidden by them',async()=>{
  const value=await reconnectingWorkspace()
  try {
    value.data.recordingTarget.value={collectorId:'collector',serverId:'server',interval:1000};await vue.nextTick()
    value.observations[0].observer.error(new TypeError('point error'))
    value.monitors[0].observer.next({timestamp:1,collectors:[{id:'collector',available:true}],channels:[]})
    value.recordings[0].observer.next({collectorId:'collector',serverId:'server',active:true})
    assert.equal(value.data.valueError.value,'point error')
    assert.equal(value.data.collector.value.runtime.available,true)
    assert.equal(value.data.recording.value.active,true)
    assert.equal(value.monitors[0].observer.closed,false)
    value.data.setVisiblePoints(['second'])
    assert.equal(value.data.valueError.value,'')
    assert.equal(value.retries[0].signal.observers.length,0)
  } finally {value.close()}
})

test('unexpected stream end reconnects with capped backoff, resetting after a frame and cancelling on pause or unmount',async()=>{
  const value=await reconnectingWorkspace()
  try {
    for(const expected of [1000,2000,4000,8000,15000,15000]){
      value.observations.at(-1).observer.error(new TypeError('network error'))
      assert.equal(value.retries.at(-1).delay,expected)
      value.reconnect(value.retries.length-1)
    }
    value.observations.at(-1).observer.next(value.snapshot())
    assert.equal(value.data.valueError.value,'')
    value.observations.at(-1).observer.complete()
    assert.equal(value.data.valueError.value,'collectorWorkspace.streamEnded')
    assert.equal(value.retries.at(-1).delay,1000,'a successful frame resets the backoff')
    value.data.paused.value=true;await vue.nextTick()
    assert.equal(value.retries.at(-1).signal.observers.length,0)
    value.data.paused.value=false;await vue.nextTick()
    value.observations.at(-1).observer.error(new TypeError('network error'))
  } finally {value.close()}
  assert.equal(value.retries.at(-1).signal.observers.length,0)
})

test('authentication and parameter failures are surfaced without automatic retries',async()=>{
  const value=await reconnectingWorkspace()
  try {
    value.observations[0].observer.error({status:403})
    assert.notEqual(value.data.valueError.value,'')
    assert.equal(value.retries.length,0)
  } finally {value.close()}
})


test('runtime sorting and filtering follow statistic frames while data-only frames keep the ordered view',async()=>{
  const value=await reconnectingWorkspace(true),{data}=value
  const index=(duration,state='running')=>({state,priority:state === 'running' ? 3 : 0,duration})
  const finish=rows=>{value.queries.at(-1).observer.next(new Map(rows));value.queries.at(-1).observer.complete()}
  const push=(duration,runtimeState='running')=>{const frame=value.snapshot();frame.nodes[0].points=[{id:'first',available:true,state:'enabled',runtimeState,summary:{durationNanos:duration}}];value.observations.at(-1).observer.next(frame)}
  const ids=()=>data.filteredPoints.value.map(row=>row.id)
  try {
    data.pointSort.value='duration';data.filterPoints()
    finish([['first',index(10)],['second',index(20)]])
    assert.deepEqual(ids(),['second','first'])
    push(30);assert.deepEqual(ids(),['first','second'],'visible statistics reorder immediately')
    const ordered=data.filteredPoints.value
    value.observations.at(-1).observer.next({data:[{pointId:'first',timestamp:500,parsedData:42}]})
    assert.equal(data.filteredPoints.value,ordered,'frequent data frames never rebuild sort keys')

    data.pointState.value='attention';data.filterPoints()
    finish([['first',index(30)],['second',index(20)]])
    assert.deepEqual(ids(),[])
    push(30,'collectionError');assert.deepEqual(ids(),['first'])
    push(30);assert.deepEqual(ids(),[],'a recovered point leaves the attention filter')

    data.pointState.value='';data.filterPoints();finish([['first',index(30)],['second',index(20)]])
    data.orderHeld.value=true;await vue.nextTick()
    push(5);assert.deepEqual(ids(),['first','second'],'editing and selection hold the current order')
    data.orderHeld.value=false;await vue.nextTick()
    finish([['first',index(5)],['second',index(20)]])
    assert.deepEqual(ids(),['second','first'])
    data.filterPoints();push(50)
    finish([['first',index(5)],['second',index(20)]])
    assert.deepEqual(ids(),['first','second'],'a late query cannot overwrite a newer statistic frame')
  } finally {value.close()}
})

test('offscreen index refresh is bounded, uses no loading mask, and stops on pause, hide, leave or editing',async()=>{
  const value=await reconnectingWorkspace(true),{data}=value
  const finish=()=>{value.queries.at(-1).observer.next(new Map(['first','second'].map(id=>[id,{state:'running',priority:3}])));value.queries.at(-1).observer.complete()}
  const refresh=()=>value.retries.findLast(item=>item.delay === 5000)
  try {
    data.pointState.value='running';data.filterPoints();finish()
    assert.equal(refresh().delay,5000)
    const before=value.queries.length
    refresh().signal.next(0);refresh().signal.complete()
    assert.equal(value.queries.length,before+1)
    assert.equal(data.ordering.value,false,'background refresh never masks the list')
    assert.equal(value.queries.at(-1).rows.length,2)
    finish()
    data.paused.value=true;await vue.nextTick()
    assert.equal(refresh().signal.observed,false)
    data.paused.value=false;await vue.nextTick()
    assert.equal(refresh().signal.observed,true)
    document.hidden=true;value.visibility()
    assert.equal(refresh().signal.observed,false)
    document.hidden=false;value.visibility()
    assert.equal(refresh().signal.observed,true)
    data.orderHeld.value=true;await vue.nextTick()
    assert.equal(refresh().signal.observed,false)
    data.orderHeld.value=false;await vue.nextTick();finish()
    value.deactivated.forEach(callback=>callback())
    assert.equal(refresh().signal.observed,false)
    value.activated.forEach(callback=>callback())
    assert.equal(refresh().signal.observed,true)
  } finally {value.close()}
  assert.equal(refresh().signal.observed,false,'unmount releases the last refresh timer')
})
