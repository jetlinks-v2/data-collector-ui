import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {transformSync} from 'esbuild'
import * as vue from 'vue'

function environment() {
  const calls=[],revealed=[],collectors=[{id:'a',name:'Collector A'},{id:'b',name:'Collector B'}]
  const data={collectors:vue.ref(collectors),collector:vue.ref(collectors[0]),pointSearch:vue.ref('old search'),pointState:vue.ref('attention'),pointLoading:vue.ref(false),ordering:vue.ref(false),filteredPoints:vue.ref([]),error:vue.ref(''),filterPoints(){}}
  const module={exports:{}},scope=vue.effectScope()
  const code=transformSync(readFileSync(new URL('../views/data-collect/hook/useWorkspacePointLookup.ts',import.meta.url),'utf8'),{loader:'ts',format:'cjs'}).code
  new Function('require','module','exports',code)(id=>id==='vue'?{...vue,onBeforeUnmount:vue.onScopeDispose}:id==='vue-i18n'?{useI18n:()=>({t:key=>key})}:{findWorkspacePoints:(keyword,signal)=>new Promise((resolve,reject)=>calls.push({keyword,signal,resolve,reject}))},module,module.exports)
  let allow=true
  const collection=vue.shallowRef({reveal:async id=>{revealed.push(id);return true}})
  const state=scope.run(()=>module.exports.useWorkspacePointLookup(data,async target=>{if(allow){data.collector.value=target;data.pointLoading.value=true}},collection))
  return {state,data,calls,revealed,scope,allow:value=>{allow=value}}
}
const flush=async()=>{await vue.nextTick();await vue.nextTick();await vue.nextTick()}
test('lookup aborts prior requests and ignores late responses and errors',async()=>{
  const {state,calls,scope}=environment()
  try {
    state.open.value=true;state.keyword.value='old';await flush();const old=state.search()
    state.keyword.value='new';await flush();assert.equal(calls[0].signal.aborted,true);const latest=state.search()
    calls[1].resolve({success:true,result:{data:[{id:'new'}],total:45}});await latest
    calls[0].reject(new Error('late error'));await old
    assert.deepEqual(state.results.value,[{id:'new'}]);assert.equal(state.total.value,45);assert.equal(state.error.value,'')
    state.open.value=false;await flush();assert.equal(state.results.value.length,0)
  } finally {scope.stop()}
})
test('lookup waits for the new collector directory, clears local list filters and reveals the point',async()=>{
  const {state,data,revealed,scope}=environment()
  try {
    state.open.value=true;await flush()
    const point={id:'target',collectorId:'b',name:'Temperature'}
    await state.choose(point);await flush();assert.equal(state.open.value,true);assert.equal(state.locating.value,true);assert.deepEqual(revealed,[])
    assert.equal(data.collector.value.id,'b');assert.equal(data.pointSearch.value,'');assert.equal(data.pointState.value,'')
    data.filteredPoints.value=[point];data.pointLoading.value=false;await flush()
    assert.equal(state.open.value,false);assert.deepEqual(revealed,[])
    await state.finishLocate();assert.deepEqual(revealed,['target'])
  } finally {scope.stop()}
})
test('cancelled draft navigation does not reveal a point or clear the original filters',async()=>{
  const {state,data,revealed,scope,allow}=environment()
  try {
    allow(false);state.open.value=true;await flush();await state.choose({id:'target',collectorId:'b'});await flush()
    assert.equal(state.open.value,true);assert.equal(state.locating.value,false);assert.equal(data.pointSearch.value,'old search');assert.deepEqual(revealed,[])
    await state.choose({id:'missing',collectorId:'deleted'});assert.match(state.error.value,/notFound/)
  } finally {scope.stop()}
})
test('missing points after directory loading show feedback and disposal aborts requests',async()=>{
  const {state,data,calls,revealed,scope}=environment()
  state.open.value=true;state.keyword.value='test';await flush();const request=state.search()
  await state.choose({id:'gone',collectorId:'b'});data.pointLoading.value=false;await flush()
  assert.match(state.error.value,/notFound/);assert.equal(state.locating.value,false);assert.deepEqual(revealed,[])
  scope.stop();assert.equal(calls[0].signal.aborted,true);calls[0].resolve({success:true,result:{data:[],total:0}});await request
})
