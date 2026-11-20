import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { transformSync } from 'esbuild'
import { effectScope, nextTick, ref } from 'vue'
import * as vue from 'vue'

function setup() {
  const locale=ref('zh'),provider=ref('plugin'),active=ref(false),algorithm=ref('ema'),calls=[]
  const module={exports:{}}
  const source=readFileSync(new URL('../views/data-collect/hook/useProcessorDocumentation.ts',import.meta.url),'utf8')
  const {code}=transformSync(source,{loader:'ts',format:'cjs'})
  new Function('require','module','exports',code)(id=>{
    if(id === 'vue')return vue
    if(id === 'vue-i18n')return {useI18n:()=>({locale})}
    return {getProcessorDocumentations:(provider,signal)=>new Promise((resolve,reject)=>calls.push({provider,signal,resolve,reject}))}
  },module,module.exports)
  const scope=effectScope()
  const state=scope.run(()=>module.exports.useProcessorDocumentation(()=>provider.value,()=>algorithm.value,()=>active.value))
  return {locale,provider,active,algorithm,calls,state,scope}
}
const settle=async()=>{await Promise.resolve();await nextTick();await Promise.resolve()}
const catalog={ema:{name:'Smooth',formula:'y=x'},median:{name:'Median',formula:'y=median(x)'}}

test('the first open loads one catalog shared by algorithm switching and reopening',async()=>{
  const value=setup()
  try {
    assert.equal(value.calls.length,0)
    value.active.value=true;await settle()
    assert.equal(value.calls.length,1)
    value.calls[0].resolve({success:true,result:catalog});await settle()
    assert.equal(value.state.documentation.value,catalog.ema)
    value.algorithm.value='median';await settle()
    assert.equal(value.state.documentation.value,catalog.median)
    value.active.value=false;await settle();value.active.value=true;await settle()
    assert.equal(value.calls.length,1)
    value.algorithm.value='unknown';await settle()
    assert.equal(value.state.documentation.value,undefined)
    assert.equal(value.state.catalog.value,catalog)
  } finally {value.scope.stop()}
})

test('a changed language or provider invalidates the catalog and ignores stale responses',async()=>{
  const value=setup()
  try {
    value.active.value=true;await settle()
    value.locale.value='en';await settle()
    assert.equal(value.calls[0].signal.aborted,true)
    value.calls[1].resolve({success:true,result:catalog});await settle()
    value.calls[0].resolve({success:true,result:{ema:{name:'Stale'}}});await settle()
    assert.equal(value.state.documentation.value,catalog.ema)
    value.provider.value='other';await settle()
    assert.equal(value.calls[2].provider,'other')
    assert.deepEqual(value.state.catalog.value,{})
    value.calls[2].resolve({success:true,result:{}});await settle()
    assert.equal(value.state.documentation.value,undefined)
  } finally {value.scope.stop()}
})

test('returning to the prior key after an unfinished switch reloads an empty catalog',async()=>{
  const value=setup()
  try {
    value.active.value=true;await settle()
    value.calls[0].resolve({success:true,result:catalog});await settle()
    value.locale.value='ja';await settle()
    value.locale.value='zh';await settle()
    assert.equal(value.calls[1].signal.aborted,true)
    assert.equal(value.calls.length,3)
    value.calls[2].resolve({success:true,result:catalog});await settle()
    assert.equal(value.state.documentation.value,catalog.ema)
  } finally {value.scope.stop()}
})

test('closing and disposal cancel pending work without exposing cancellation as an error',async()=>{
  const value=setup()
  try {
    value.active.value=true;await settle()
    value.active.value=false;await settle()
    assert.equal(value.calls[0].signal.aborted,true)
    value.calls[0].reject(new Error('aborted'));await settle()
    assert.equal(value.state.error.value,false)
    assert.equal(value.state.loading.value,false)
    value.active.value=true;await settle()
    value.scope.stop()
    assert.equal(value.calls[1].signal.aborted,true)
  } finally {value.scope.stop()}
})

test('a failed catalog can be retried and refreshed content is reused',async()=>{
  const value=setup()
  try {
    value.active.value=true;await settle()
    value.calls[0].resolve({success:false});await settle()
    assert.equal(value.state.error.value,true)
    value.state.retry();await settle()
    assert.equal(value.state.error.value,false)
    value.calls[1].resolve({success:true,result:catalog});await settle()
    assert.equal(value.state.documentation.value,catalog.ema)
    value.active.value=false;await settle();value.active.value=true;await settle()
    assert.equal(value.calls.length,2)
  } finally {value.scope.stop()}
})
