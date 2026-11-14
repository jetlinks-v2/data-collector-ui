import assert from 'node:assert/strict'
import test from 'node:test'
import { monitoredObjects,runtimeIndicators,runtimePrimaryMetrics,runtimeIntervalComparison } from '../utils/runtimeMonitoring.ts'
import { observedPoints } from '../utils/workspaceObservation.ts'
import { objectDisplayState, objectStateText } from '../types/workspace.ts'

const object={id:'collector',name:'Collector',provider:'test',configuration:{},pointNumber:1}

test('interval comparison uses the same zero and scale without clipping slow reads or inventing missing values',()=>{
  const slow=runtimeIntervalComparison(100,108)
  assert.equal(slow.actualPercent,100)
  assert.equal(slow.expectedPercent/slow.actualPercent,100/108)
  assert.deepEqual(runtimeIntervalComparison(100,50),{expectedPercent:100,actualPercent:50})
  assert.deepEqual(runtimeIntervalComparison(60000,undefined),{expectedPercent:100,actualPercent:undefined})
  assert.deepEqual(runtimeIntervalComparison(0,undefined),{expectedPercent:0,actualPercent:undefined})
  assert.equal(runtimeIntervalComparison(100,10000).expectedPercent,1)
})

test('an intentionally inactive object remains inactive without a runtime instance',()=>{
  const runtime={id:'collector',serverId:'node',available:false,runtimeState:'running'}
  for(const state of ['disabled','stopped','paused']){
    assert.equal(objectDisplayState({...object,state,runtime}),state)
    assert.equal(objectStateText({...object,state,runtime},value=>value === state ? 'inactive' : undefined),'inactive')
  }
  assert.equal(objectDisplayState({...object,state:'enabled',runtime}),'unavailable')
})

test('card and navigation attention uses current errors, protection, unavailable instances and queue counts only',()=>{
  const base={...object,runtime:{id:'collector',serverId:'node',available:true,state:'running',runtimeState:'running'},monitoring:{nodeCount:1,pointSummary:{total:9,available:8,states:{running:3,collectionError:2,retrying:1,halfOpen:1,paused:1,unavailable:1}},pending:4}}
  assert.deepEqual(runtimeIndicators(base,'collector').map(({id,count})=>({id,count})),[
    {id:'errors',count:2},{id:'warnings',count:2},{id:'unavailable',count:1},{id:'pending',count:4},
  ])
  assert.deepEqual(runtimeIndicators({...base,runtime:{...base.runtime,available:false}},'collector'),[])
  assert.deepEqual(runtimeIndicators({...base,monitoring:{pending:0},runtime:{...base.runtime,lastFailure:{code:1},currentFailure:null}},'collector'),[])
  assert.equal(runtimeIndicators({...base,runtime:{...base.runtime,protectionState:'retrying'}},'point')[0].tone,'warn')
})
function snapshot(serverId,count,sampledAt,extra={}) {
  return {id:'collector',serverId,available:true,state:'running',runtimeState:'running',
    metrics:{instanceId:serverId,scope:'collector',sampledAt,values:Object.fromEntries(Object.entries({completedTasks:count,failedTasks:0,receivedSamples:count*2,pending:1,lastTaskTimeNanos:serverId === 'a' ? 1e6 : 3e6,lastCollectionTimeNanos:serverId === 'a' ? 1e6 : 3e6}).map(([key,value])=>[key,{available:true,value}]))},
    pointSummary:{total:1,available:1,states:{running:1}},...extra}
}

test('all cluster instances contribute rates and queue counts without changing logical point totals',()=>{
  const earlier={timestamp:1000,snapshots:[snapshot('a',5,1000),snapshot('b',10,1000)]}
  const current={timestamp:3000,snapshots:[snapshot('a',7,3000),snapshot('b',14,3000)]}
  const item=monitoredObjects([object],current,earlier)[0]
  assert.equal(item.pointNumber,1)
  assert.equal(item.monitoring.nodeCount,2)
  assert.equal(item.monitoring.nodes.length,2)
  assert.equal(item.monitoring.nodes[0],current.snapshots[0])
  assert.equal(item.monitoring.pointSummary.total,2)
  assert.equal(item.monitoring.taskRate,3)
  assert.equal(item.monitoring.sampleRate,6)
  assert.equal(item.monitoring.pending,2)
  assert.equal(item.monitoring.durationNanos,3e6)
})

test('migration, counter resets, first samples and missing metrics never invent a zero or a rate spike',()=>{
  const earlier={timestamp:1000,snapshots:[snapshot('a',5,1000)]}
  for(const next of [snapshot('a',7,3000,{metrics:{...snapshot('a',7,3000).metrics,instanceId:'replacement'}}),snapshot('a',1,3000),snapshot('a',7,1000),snapshot('b',10,3000)]){
    assert.equal(monitoredObjects([object],{timestamp:3000,snapshots:[next]},earlier)[0].monitoring.taskRate,undefined)
  }
  assert.equal(monitoredObjects([object],earlier)[0].monitoring.sampleRate,undefined)
  const missing=monitoredObjects([object],{timestamp:3000,snapshots:[]},earlier)[0]
  assert.equal(missing.runtime.available,false)
  assert.equal(missing.monitoring.pending,undefined)
})

test('a faulty node cannot be hidden by a healthy replica and departed nodes do not remain in totals',()=>{
  const failure={timestamp:1,stage:'collect',code:0x800A0000,reason:'Bad_Timeout'}
  const item=monitoredObjects([object],{timestamp:1000,snapshots:[snapshot('a',1,1000),snapshot('b',2,1000,{currentFailure:failure})]})[0]
  assert.equal(item.runtime.serverId,'b')
  assert.equal(item.runtime.currentFailure,failure)
  const next=monitoredObjects([item],{timestamp:2000,snapshots:[snapshot('a',2,2000)]})[0]
  assert.equal(next.monitoring.nodeCount,1)
  assert.equal(next.monitoring.pointSummary.total,1)
  assert.equal(next.runtime.serverId,'a')
})

test('point cards take the newest data independently from the worst state and aggregate all node sample rates',()=>{
  const point={...object,id:'point'}
  const failure={timestamp:1,stage:'collect',code:0x800A0000,reason:'Bad_Timeout'}
  function observation(at,a,b){return {timestamp:at,nodes:[a,b].map((runtime,index)=>({serverId:runtime.serverId,collector:{},points:[{id:'point',runtime:{...runtime,id:'point'},lastData:{pointId:'point',timestamp:at+index,parsedData:index}}]}))}}
  const previous=observation(1000,snapshot('a',1,1000),snapshot('b',2,1000))
  const current=observation(3000,snapshot('a',3,3000,{currentFailure:failure}),snapshot('b',5,3000))
  const item=observedPoints([point],current,previous)[0]
  assert.equal(item.latest.parsedData,1)
  assert.equal(item.runtime.serverId,'a')
  assert.equal(item.monitoring.sampleRate,5)
  assert.equal(item.monitoring.durationNanos,3e6)
})

function measured(counts,at=1000,instanceId='a'){
  const base=snapshot('a',1,at)
  base.metrics.instanceId=instanceId
  Object.assign(base.metrics.values,Object.fromEntries(Object.entries(counts).map(([key,value])=>[key,{available:true,value}])))
  return base
}
const boundaries={collectionAttempts:10,receivedSamples:100,outputSamples:30,filteredOutlierSamples:10,filteredUnchangedSamples:20,filteredDeadbandSamples:30,filteredConversionSamples:10,failedSamples:0,cancelledSamples:0,discardedOutOfOrderSamples:0,rejectedSamples:0,outputFailures:0,processingSamples:1,pendingSubscriptionSamples:2,expectedIntervalMillis:100,lastCollectionIntervalNanos:120e6,lastReceivedIntervalNanos:150e6,lastOutputIntervalNanos:500e6,receivedAgeNanos:200e6,outputAgeNanos:700e6}

test('collection, arrivals, output and exclusive outcomes retain distinct boundaries',()=>{
  const previous={timestamp:1000,snapshots:[measured(boundaries)]}
  const current={timestamp:3000,snapshots:[measured({...boundaries,collectionAttempts:14,receivedSamples:120,outputSamples:32,filteredOutlierSamples:13,filteredUnchangedSamples:24,filteredDeadbandSamples:32,filteredConversionSamples:11,failedSamples:2,cancelledSamples:1,discardedOutOfOrderSamples:1,rejectedSamples:1,outputFailures:1},3000)]}
  const {monitoring}=monitoredObjects([object],current,previous)[0]
  assert.equal(monitoring.collectionRate,2)
  assert.equal(monitoring.sampleRate,10)
  assert.equal(monitoring.outputRate,1)
  assert.equal(monitoring.filteredRate,5)
  assert.deepEqual(monitoring.filterRates,{outlier:1.5,unchanged:2,deadband:1,conversion:.5})
  assert.deepEqual(monitoring.outcomes,{output:1,filtered:5,failed:1,cancelled:.5,outOfOrder:.5,rejected:.5})
  assert.equal(monitoring.processing,3)
  assert.equal(monitoring.outputFailures,.5)
  const point=monitoredObjects([object],current,previous,'point')[0].monitoring
  assert.equal(point.expectedIntervalMillis,100)
  assert.equal(point.receivedIntervalNanos,150e6)
  assert.equal(point.collectionIntervalNanos,120e6)
  assert.equal(point.outputIntervalNanos,500e6)
  assert.equal(point.receivedAgeNanos,200e6)
  assert.equal(point.processing,1)
})

test('new metrics require a complete valid baseline and missing outcomes do not become filtering',()=>{
  const previous={timestamp:1000,snapshots:[measured(boundaries)]}
  const next={...boundaries,collectionAttempts:12,receivedSamples:110,outputSamples:35}
  for(const value of [measured(next,3000,'replacement'),measured({...next,filteredDeadbandSamples:null},3000),measured({...next,filteredDeadbandSamples:1},3000)]){
    const monitoring=monitoredObjects([object],{timestamp:3000,snapshots:[value]},previous)[0].monitoring
    assert.equal(monitoring.outcomes,undefined)
  }
  assert.equal(monitoredObjects([object],previous)[0].monitoring.outputRate,undefined)
})

function timed(count,at,interval=100,extra={}){
  return measured({...boundaries,scheduledHere:true,scheduledSamples:count,expectedIntervalMillis:interval,lastScheduledIntervalNanos:interval*1e6,scheduledAgeNanos:10e6,...extra},at)
}
function pointBetween(before,after){
  return monitoredObjects([object],{timestamp:after.metrics.sampledAt,snapshots:[after]},before ? {timestamp:before.metrics.sampledAt,snapshots:[before]} : undefined,'point')[0]
}

test('low frequency reads retain real counts and periods without a pulsing percentage or rate',()=>{
  for(const count of [10,11]){
    const point=pointBetween(timed(10,1000,60_000),timed(count,3000,60_000))
    assert.equal(point.monitoring.cadence.quantityRatio,undefined)
    assert.equal(point.monitoring.cadence.expectedMillis,60_000)
    assert.equal(point.monitoring.cadence.intervalNanos,60e9)
    const primary=runtimePrimaryMetrics(point,'point')
    assert.equal(primary[0].value,count)
    assert.equal(primary[0].unit,'')
    assert.equal(primary[1].value,boundaries.outputSamples)
    assert.equal(primary[1].unit,'')
  }
})

test('dense point windows compare scheduled successful volume independently of attempts and filtering',()=>{
  const point=pointBetween(timed(10,1000),timed(29,3000,100,{collectionAttempts:100,receivedSamples:1000,outputSamples:31,filteredOutlierSamples:28,lastScheduledIntervalNanos:108e6}))
  assert.equal(point.monitoring.cadence.quantityRatio,.95)
  assert.equal(point.monitoring.cadence.rate,9.5)
  assert.equal(point.monitoring.cadence.intervalNanos,108e6)
  assert.equal(point.monitoring.rateWindowMillis,2000)
  assert.equal(runtimePrimaryMetrics(point,'point')[0].value,9.5)
  assert.equal(runtimePrimaryMetrics(point,'point')[1].value,.5)
  assert.equal(point.monitoring.cadence.ageNanos,10e6)
})

test('first observations, changed ownership, changed periods and resets establish a fresh scheduled baseline',()=>{
  const current=timed(30,3000)
  for(const previous of [undefined,timed(10,1000,100,{scheduledHere:false}),timed(10,1000,200),timed(50,1000)]){
    const cadence=pointBetween(previous,current).monitoring.cadence
    assert.equal(cadence.quantityRatio,undefined)
    assert.equal(cadence.rate,undefined)
    assert.equal(cadence.count,30)
  }
  assert.equal(pointBetween(timed(10,1000),timed(30,3000,100,{scheduledHere:false})).monitoring.cadence,undefined)
})

test('standby instances do not inflate targets or ages and cluster gap counts remain visible',()=>{
  const a=timed(10,1000),b={...timed(0,1000,100,{scheduledHere:false,scheduledAgeNanos:1e12}),serverId:'b'}
  const nextA=timed(30,3000),nextB={...b,metrics:{...b.metrics,sampledAt:3000}}
  const point=monitoredObjects([object],{timestamp:3000,snapshots:[nextA,nextB]},{timestamp:1000,snapshots:[a,b]},'point')[0]
  assert.equal(point.monitoring.cadence.quantityRatio,1)
  assert.equal(point.monitoring.cadence.ageNanos,10e6)
  const nodes=[a,b].map((value,index)=>({...value,pointSummary:{...value.pointSummary,scheduled:2,awaitingFirst:1,longGap:index}}))
  const collector=monitoredObjects([object],{timestamp:1000,snapshots:nodes})[0]
  assert.equal(collector.monitoring.pointSummary.scheduled,4)
  assert.equal(collector.monitoring.pointSummary.awaitingFirst,2)
  assert.equal(collector.monitoring.pointSummary.longGap,1)
  assert.equal(runtimeIndicators(collector,'collector').find(item=>item.id === 'longGap').count,1)
})
