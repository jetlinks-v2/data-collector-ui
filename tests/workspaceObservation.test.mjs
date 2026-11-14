import test from 'node:test'
import assert from 'node:assert/strict'
import { observedPoints,observedRuntime } from '../utils/workspaceObservation.ts'
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
