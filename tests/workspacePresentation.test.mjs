import assert from 'node:assert/strict'
import test from 'node:test'
import { objectDisplayState, objectStateText, objectTone, pointAddress } from '../types/workspace.ts'

const point = { id:'point-1', name:'Temperature', provider:'plugin', configuration:{} }
const translate = value => ({ running:'运行中', failed:'已熔断', disabled:'已停用', stopped:'已停止' })[value]

test('enum text and raw runtime states share one localized presentation', () => {
  assert.equal(objectStateText({...point,runningState:'running'},translate), '运行中')
  assert.equal(objectStateText({...point,runningState:{value:'running',text:'Provider state'}},translate), 'Provider state')
  assert.equal(objectStateText({...point,runningState:{value:'failed'}},translate), '已熔断')
  for (const state of ['disabled','stopped']) {
    const value={...point,state,runningState:'running'}
    assert.equal(objectStateText(value,translate), translate(state))
    assert.equal(objectTone(value), 'gray')
  }
  assert.equal(objectStateText({...point,runningState:'plugin-state'},translate), 'plugin-state')
  assert.equal(objectStateText(point,translate), '')
})

test('point labels preserve provider-formatted addresses without reading configuration', () => {
  for (const address of ['40001','0','ns=2;s=Temperature','DB1.DBW0']) {
    assert.equal(pointAddress({...point,address,configuration:{parameter:{address:0},nodeId:'other'}}), address)
  }
  assert.equal(pointAddress({...point,pointKey:'temperature',configuration:{parameter:{address:0}}}), 'temperature')
  assert.equal(pointAddress(point), 'point-1')
  assert.equal(pointAddress({...point,id:'_new:1'}), '—')
})

test('current errors, recovery and old-server history are distinct from running', () => {
  const failure={timestamp:100,stage:'collect',code:0x800A0000,reason:'Bad_Timeout'}
  const runtime={id:point.id,serverId:'local',available:true,state:'running',runtimeState:'running',lastFailure:failure}
  assert.equal(objectDisplayState({...point,runtime}), 'recentError')
  assert.equal(objectTone({...point,runtime}), 'warn')
  assert.equal(objectDisplayState({...point,runtime:{...runtime,currentFailure:failure}}), 'collectionError')
  assert.equal(objectTone({...point,runtime:{...runtime,currentFailure:failure}}), 'bad')
  assert.equal(objectDisplayState({...point,runtime:{...runtime,currentFailure:null}}), 'recovered')
  assert.equal(objectTone({...point,runtime:{...runtime,currentFailure:null}}), 'ok')
  assert.equal(objectTone({...point,runtime:{...runtime,available:false,currentFailure:failure}}), 'gray')
})

test('native protection overrides running and errors, while explicit pause remains neutral', () => {
  for (const [protectionState,tone] of [['retrying','warn'],['open','bad'],['halfOpen','warn']]) {
    const runtime={id:point.id,serverId:'local',available:true,state:'running',runtimeState:'running',protectionState}
    assert.equal(objectDisplayState({...point,runtime}), protectionState)
    assert.equal(objectTone({...point,runtime}), tone)
    assert.equal(objectTone({...point,state:'disabled',runtime}), 'gray')
    assert.equal(objectDisplayState({...point,runtime:{...runtime,state:'paused'}}), 'paused')
  }
  assert.equal(objectDisplayState({...point,runtime:{id:point.id,serverId:'local',available:true,state:'running',runtimeState:'failed'}}), 'failed')
})
