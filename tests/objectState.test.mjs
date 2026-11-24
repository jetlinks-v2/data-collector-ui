import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { transformSync } from 'esbuild'
import * as vue from 'vue'

function fixture(update) {
  const calls = [], applied = []
  const channel = { id:'channel', name:'Connection', state:{value:'enabled'}, runtime:{runtimeState:'failed'} }
  const collector = { id:'collector', name:'Collector', state:'disabled', channelId:'channel', runtime:{runtimeState:'stopped'} }
  const data = { collector:vue.shallowRef(collector), channel:vue.shallowRef(channel), collectors:vue.shallowRef([collector]), channels:vue.shallowRef([channel]),
    applyObject(kind, value) { applied.push({kind,value}); if (kind === 'collector' && data.collector.value?.id === value.id) data.collector.value=value; else if (kind === 'channel' && data.channel.value?.id === value.id) data.channel.value=value } }
  const mocks = { vue, 'vue-i18n':{useI18n:()=>({t:key=>key})}, '../../../types/workspace':{stateValue:value=>typeof value === 'string' ? value : value?.value || ''} }
  for (const kind of ['collector','channel']) mocks[`../../../api/data-collect/${kind}`] = {update:async(id,payload)=>{calls.push({kind,id,payload});return update?.() || {success:true}}}
  const module = {exports:{}}
  new Function('require','module','exports',transformSync(readFileSync(new URL('../views/data-collect/hook/useObjectState.ts',import.meta.url),'utf8'),{loader:'ts',format:'cjs'}).code)(id=>mocks[id],module,module.exports)
  const scope=vue.effectScope(), action=scope.run(()=>module.exports.useObjectState(data))
  return {data,action,calls,applied,scope}
}

test('enablement updates use the existing contract and preserve observed runtime',async()=>{
  const f=fixture()
  try {
    await f.action.toggle()
    assert.deepEqual(f.calls[0],{kind:'collector',id:'collector',payload:{state:'enabled',runningState:'running'}})
    assert.equal(f.applied[0].value.runtime.runtimeState,'stopped')
    f.data.collector.value=undefined
    await f.action.toggle()
    assert.deepEqual(f.calls[1],{kind:'channel',id:'channel',payload:{state:'disabled',runningState:'stopped'}})
    assert.equal(f.applied[1].value.runtime.runtimeState,'failed')
  } finally {f.scope.stop()}
})

test('pending mutations reject duplicate submits and remain attached to the original object',async()=>{
  let finish
  const f=fixture(()=>new Promise(resolve=>{finish=resolve}))
  try {
    const pending=f.action.toggle()
    await f.action.toggle()
    f.data.collector.value={id:'other',name:'Other',state:'enabled'}
    finish({success:true}); await pending
    assert.equal(f.calls.length,1)
    assert.equal(f.applied[0].value.id,'collector')
    assert.equal(f.data.collector.value.id,'other')
    assert.equal(f.action.busy.value,false)
  } finally {f.scope.stop()}
})

test('failed mutations retain configuration; unknown enablement cannot be toggled',async()=>{
  const f=fixture(()=>({success:false,message:'Denied'}))
  try {
    await f.action.toggle()
    assert.equal(f.action.error.value,'Denied')
    assert.equal(f.applied.length,0)
    assert.equal(f.data.collector.value.state,'disabled')
    f.data.collector.value={id:'unknown',name:'Unknown'}
    await vue.nextTick(); await f.action.toggle()
    assert.equal(f.action.error.value,'')
    assert.equal(f.calls.length,1)
  } finally {f.scope.stop()}
})
