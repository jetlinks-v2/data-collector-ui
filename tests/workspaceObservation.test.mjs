import test from 'node:test'
import assert from 'node:assert/strict'
import { computed, shallowReactive, shallowRef } from 'vue'
import { applyObservedValues,observedPoints,observedRuntime,observedValues } from '../utils/workspaceObservation.ts'
const runtime=(id,available=true)=>({id,serverId:'node',available,state:available ? 'running' : undefined})
const frame=points=>({timestamp:100,nodes:[{serverId:'node',collector:runtime('collector'),channel:runtime('channel'),points}]})

test('one observation preserves zero, false and precise numeric text with the matching runtime',()=>{
  for(const value of [0,false,'9007199254740993','123.1234567890123456789']) {
    const observation=frame([{id:'point',runtime:runtime('point'),lastData:{parsedData:value,timestamp:100}}])
    const points=observedPoints([{id:'point',configuration:{},name:'point',provider:'test'}],observation)
    assert.equal(points[0].latest.parsedData,value)
    assert.equal(points[0].runningState,'running')
    assert.equal(observedRuntime(observation,'collector','collector').available,true)
    assert.equal(observedRuntime(observation,'point','point').available,true)
  }
})

test('a complete new round replaces node availability without discarding the last known value',()=>{
  const point={id:'point',configuration:{},name:'point',provider:'test',latest:{parsedData:42,timestamp:99}}
  const observation=frame([{id:'point',runtime:runtime('point',false)}])
  const points=observedPoints([point],observation)
  assert.equal(points[0].latest.parsedData,42)
  assert.equal(points[0].runtime.available,false)
  assert.equal(observedRuntime(observation,'point','missing').available,false)
  assert.equal(observedPoints([],observation).length,0)
})

test('removing a collector or node clears stale availability and preserves the last sample',()=>{
  const point={id:'point',configuration:{},runtime:runtime('point'),runningState:'running',latest:{parsedData:42,timestamp:99}}
  for(const observation of [frame([]),{timestamp:101,nodes:[]}]) {
    const value=observedPoints([point],observation)[0]
    assert.equal(value.runtime.available,false)
    assert.equal(value.latest.parsedData,42)
    assert.equal(observedRuntime(observation,'channel','channel').available,observation.nodes.length > 0)
    assert.equal(observedRuntime(observation,'point','point').available,false)
  }
  assert.equal(observedRuntime(undefined,'point','point'),undefined)
})

test('data frames update only values and old snapshots cannot rewind a newer event',()=>{
  const point={id:'point',configuration:{},name:'point',provider:'test',runtime:runtime('point'),monitoring:{sampleRate:10},latest:{timestamp:100,parsedData:1}}
  const other={...point,id:'other'}
  const next=observedPoints([point,other],{timestamp:200,nodes:[],data:[{pointId:'point',timestamp:200,parsedData:false}]})
  assert.equal(next[0].latest.parsedData,false)
  assert.equal(next[0].runtime,point.runtime)
  assert.equal(next[0].monitoring,point.monitoring)
  assert.equal(next[1],other)
  const stale=frame([{id:'point',runtime:runtime('point'),lastData:{timestamp:150,parsedData:2}}])
  assert.equal(observedPoints(next,stale)[0].latest.parsedData,false)
  assert.equal(observedValues(next,[{pointId:'point',timestamp:199,parsedData:3}])[0],next[0])
  assert.equal(observedValues(next,[{pointId:'point',timestamp:201,parsedData:0}])[0].latest.parsedData,0)
})

test('high-frequency values invalidate only the affected row, not a thousand-point catalog',()=>{
  const points=shallowRef(Array.from({length:1200},(_,i)=>shallowReactive({id:'p'+i,name:'Point '+i,configuration:{}})))
  let builds=0
  const catalog=computed(()=>{builds++;return new Map(points.value.map(point=>[point.id,point]))})
  const values=computed(()=>points.value[0].latest?.parsedData)
  const initial=points.value,index=catalog.value
  for(let i=1;i<=10000;i++)applyObservedValues(catalog.value,[{pointId:'p0',timestamp:i,parsedData:i}])
  assert.equal(values.value,10000)
  assert.equal(points.value,initial)
  assert.equal(catalog.value,index)
  assert.equal(builds,1)
  assert.equal(points.value[1].latest,undefined)
  applyObservedValues(index,[{pointId:'p0',timestamp:9999,parsedData:-1},{pointId:'missing',timestamp:10001,parsedData:1}])
  assert.equal(values.value,10000)
  applyObservedValues(index,[{pointId:'p0',timestamp:10001,parsedData:false}])
  assert.equal(values.value,false)
})
