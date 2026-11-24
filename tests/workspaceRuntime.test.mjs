import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createRequire} from 'node:module'
import {fileURLToPath} from 'node:url'
import {resolve,dirname} from 'node:path'
import {transformSync} from 'esbuild'
import * as vue from 'vue'
import {Subject,Observable} from 'rxjs'

const require=createRequire(import.meta.url)
const root=fileURLToPath(new URL('../',import.meta.url))
const sample=(id,value,time)=>({id,serverId:'node',available:true,state:'running',metrics:{scope:'channel',instanceId:`${id}-instance`,sampledAt:time,values:{readBytes:{available:true,value}}}})

function fixture(){
  const lifecycle=[],summary=new Subject(),fallback=[]
  const api={
    listWorkspaceChannels:async()=>({success:true,result:[{id:'channel',name:'Channel'}]}),
    listWorkspaceProviders:async()=>({success:true,result:[]}),
    listWorkspaceCollectors:async()=>({success:true,result:[{id:'collector',name:'Collector',channelId:'channel'}]}),
    observeCollectionWorkspace:()=>summary,
    observeRuntime:(kind,id,interval)=>new Observable(observer=>{
      const call={kind,id,interval,observer,closed:false};fallback.push(call)
      return ()=>{call.closed=true}
    }),
  }
  const cache=new Map()
  function load(path){
    if(cache.has(path))return cache.get(path).exports
    const module={exports:{}};cache.set(path,module)
    new Function('require','module','exports',transformSync(readFileSync(path,'utf8'),{loader:'ts',format:'cjs'}).code)(id=>{
      if(id==='vue')return {...vue,onActivated(){},onDeactivated(){},onBeforeUnmount:fn=>lifecycle.push(fn)}
      if(id==='vue-i18n')return {useI18n:()=>({t:key=>key,locale:vue.ref('zh')})}
      if(id.endsWith('/api/data-collect/workspace'))return api
      if(id==='./usePointTrial')return {usePointTrial:()=>({state:vue.ref({}),reset(){},stop(){},run:async()=>{}})}
      if(id==='./useRuntimeMetricMetadata')return {loadRuntimeMetricMetadata:async()=>[]}
      return id.startsWith('.')?load(resolve(dirname(path),`${id}.ts`)):require(id)
    },module,module.exports)
    return module.exports
  }
  const oldDocument=globalThis.document
  globalThis.document={hidden:false,addEventListener(){},removeEventListener(){}}
  const scope=vue.effectScope()
  const data=scope.run(()=>load(`${root}/views/data-collect/hook/useWorkspaceData.ts`).useWorkspaceData())
  const runtime=scope.run(()=>load(`${root}/views/data-collect/hook/useWorkspaceRuntime.ts`).useWorkspaceRuntime(data.collector,data.paused,data.observation,data.recording,data.recordingTarget,data))
  return {data,runtime,fallback,
    emit:(id,value,time)=>summary.next({monitoring:{timestamp:time,collectors:id==='collector'?[sample(id,value,time)]:[],channels:id==='channel'?[sample(id,value,time)]:[]}}),
    close(){for(const close of lifecycle)close();scope.stop();globalThis.document=oldDocument},
  }
}

test('channel diagnostics follow shared summaries without selecting a collector or opening another stream',async()=>{
  const value=fixture()
  try{
    await value.data.initialize();value.data.select(undefined,'channel');await vue.nextTick()
    value.emit('channel',10,1000);await vue.nextTick()
    value.runtime.inspect('channel','channel');await vue.nextTick()
    assert.equal(value.runtime.snapshot.value.metrics.values.readBytes.value,10)
    value.emit('channel',20,2000);await vue.nextTick()
    assert.equal(value.data.channel.value.runtime.metrics.values.readBytes.value,20)
    assert.equal(value.runtime.snapshot.value.metrics.values.readBytes.value,20)
    assert.equal(value.data.observation.value,undefined)
    assert.deepEqual(value.fallback,[])
    value.data.recording.value={collectorId:'other',serverId:'node',executions:[]};await vue.nextTick()
    value.data.recording.value=undefined;await vue.nextTick()
    assert.equal(value.runtime.recording.value,undefined)
    value.data.paused.value=true;await vue.nextTick()
    value.emit('channel',30,3000);await vue.nextTick()
    assert.equal(value.runtime.snapshot.value.metrics.values.readBytes.value,20)
  }finally{value.close()}
})

test('a pending one-shot lookup is replaced by shared summaries and closed diagnostics stop updating',async()=>{
  const value=fixture()
  try{
    await value.data.initialize()
    value.runtime.inspect('collector','collector');await vue.nextTick()
    assert.equal(value.fallback.length,1)
    assert.equal(value.fallback[0].interval,0)
    value.emit('collector',10,1000);await vue.nextTick()
    assert.equal(value.fallback[0].closed,true)
    assert.equal(value.runtime.snapshot.value.metrics.values.readBytes.value,10)
    value.fallback[0].observer.next(sample('collector',0,0));await vue.nextTick()
    assert.equal(value.runtime.snapshot.value.metrics.values.readBytes.value,10)
    value.emit('collector',20,2000);await vue.nextTick()
    assert.equal(value.runtime.snapshot.value.metrics.values.readBytes.value,20)
    value.runtime.close();await vue.nextTick()
    value.emit('collector',30,3000);await vue.nextTick()
    assert.equal(value.runtime.snapshot.value.metrics.values.readBytes.value,20)
    assert.equal(value.fallback.length,1)
  }finally{value.close()}
})

test('a shared summary clears a failed one-shot lookup without creating another connection',async()=>{
  const value=fixture()
  try{
    await value.data.initialize()
    value.runtime.inspect('channel','channel');await vue.nextTick()
    value.fallback[0].observer.error(new Error('temporarily unavailable'));await vue.nextTick()
    assert.equal(value.runtime.error.value,'temporarily unavailable')
    value.emit('channel',10,1000);await vue.nextTick()
    assert.equal(value.runtime.error.value,'')
    assert.equal(value.runtime.snapshot.value.metrics.values.readBytes.value,10)
    assert.equal(value.fallback.length,1)
  }finally{value.close()}
})
