import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createRequire} from 'node:module'
import {transformSync} from 'esbuild'
import {compileScript,parse} from 'vue/compiler-sfc'
import {ref} from 'vue'

const require=createRequire(import.meta.url)
const source=readFileSync(new URL('../views/data-collect/components/Point/components/WritePoint.vue',import.meta.url),'utf8')
const {content}=compileScript(parse(source).descriptor,{id:'point-write-feedback'})
function fixture(write,validate=async()=>({value:'18446744073709551615'})){
  const events=[],messages=[],calls=[],module={exports:{}}
  const mocks={
    '@data-collector-ui/api/data-collect/collector':{writePoint:async(...args)=>{calls.push(args);return write(...args)}},
    'vue-i18n':{useI18n:()=>({t:key=>key})},
    '@jetlinks-web/utils':{onlyMessage:value=>messages.push(value)},
  }
  new Function('require','module','exports','ref',transformSync(content,{loader:'ts',format:'cjs'}).code)(id=>mocks[id] || require(id),module,module.exports,ref)
  const state=module.exports.default.setup({data:{id:'point',collectorId:'collector',name:'Point',provider:'generic'}},{expose(){},emit:(...args)=>events.push(args)})
  state.formRef.value={validate}
  return {state,events,messages,calls}
}

test('request failures preserve input and never report completion or close',async()=>{
  for(const write of [()=>Promise.reject(new Error('offline')),()=>({success:false,message:'denied'})]){
    const {state,events,messages}=fixture(write)
    state.formData.value.value='18446744073709551615'
    await state.handleOk()
    assert.equal(state.formData.value.value,'18446744073709551615')
    assert.equal(state.loading.value,false)
    assert.ok(state.writeError.value)
    assert.deepEqual(events,[])
    assert.deepEqual(messages,[])
  }
})

test('pending writes cannot submit twice or dismiss; successful requests retain exact values',async()=>{
  let finish
  const {state,events,messages,calls}=fixture(()=>new Promise(resolve=>{finish=resolve}))
  const pending=state.handleOk()
  await Promise.resolve()
  await state.handleOk();state.handleCancel()
  assert.equal(calls.length,1)
  assert.equal(calls[0][1][0].value,'18446744073709551615')
  assert.deepEqual(events,[])
  finish({success:true,result:[]});await pending
  assert.equal(state.loading.value,false)
  assert.deepEqual(events,[['save']])
  assert.deepEqual(messages,['collectorWrite.completed'])
})

test('invalid forms do not send writes or show a misleading transport failure',async()=>{
  const {state,calls,events}=fixture(()=>{throw new Error('not called')},async()=>{throw {errorFields:[{name:'value'}]}})
  await state.handleOk()
  assert.deepEqual(calls,[]);assert.deepEqual(events,[])
  assert.equal(state.writeError.value,'');assert.equal(state.loading.value,false)
})
