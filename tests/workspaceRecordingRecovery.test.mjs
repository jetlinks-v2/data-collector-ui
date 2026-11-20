import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import * as vue from 'vue'
import { transformSync } from 'esbuild'
import * as presentation from '../utils/runtimePresentation.ts'

const require=createRequire(import.meta.url)
test('diagnostics share recording and update the target only when the node changes',async()=>{
  const module={exports:{}},recording=vue.shallowRef(),target=vue.shallowRef()
  const mocks={
    vue:{...vue,onBeforeUnmount(){},onDeactivated(){},onActivated(){}},
    'vue-i18n':{useI18n:()=>({t:key=>key,locale:vue.ref('zh')})},
    '../../../api/data-collect/workspace':{},
    './useRuntimeMetricMetadata':{loadRuntimeMetricMetadata:async()=>[]},
    '../../../utils/workspaceObservation':{observedRuntime:frame=>frame?.snapshot},
    '../../../utils/runtimePresentation':presentation,
  }
  new Function('require','module','exports',transformSync(readFileSync(new URL('../views/data-collect/hook/useWorkspaceRuntime.ts',import.meta.url),'utf8'),{loader:'ts',format:'cjs'}).code)(id=>mocks[id] || require(id),module,module.exports)
  const original=globalThis.document
  globalThis.document={hidden:false,addEventListener(){},removeEventListener(){}}
  const scope=vue.effectScope()
  try{
    const observation=vue.shallowRef({snapshot:{id:'point',serverId:'a',available:true}})
    const runtime=scope.run(()=>module.exports.useWorkspaceRuntime(vue.ref({id:'collector'}),vue.ref(false),observation,recording,target))
    runtime.inspect('point','point');await vue.nextTick()
    assert.deepEqual(target.value,{collectorId:'collector',serverId:'a',interval:1000})
    const retained=target.value
    observation.value={snapshot:{id:'point',serverId:'a',available:true}};await vue.nextTick()
    assert.equal(target.value,retained)
    recording.value={collectorId:'collector',serverId:'a',active:true,executions:[
      {id:1,status:'completed',actions:[{id:0,parentId:-1,tags:{pointId:'point'},status:'completed'}]},
      {id:2,status:'failed',failure:{pointId:'other',reason:'Bad_Timeout'},actions:[{id:0,parentId:-1,tags:{pointId:'other'},status:'failed'}]},
    ]};await vue.nextTick()
    assert.equal(runtime.recording.value.active,true)
    assert.deepEqual(runtime.recording.value.executions.map(item=>item.id),[1])
    assert.equal(recording.value.executions.length,2)
    assert.equal(target.value,retained)
    observation.value={snapshot:{id:'point',serverId:'b',available:true}};await vue.nextTick()
    assert.equal(target.value.serverId,'b')
    assert.equal(runtime.recording.value,undefined)
    recording.value={collectorId:'collector',serverId:'a',active:false,executions:[]};await vue.nextTick()
    assert.equal(runtime.recording.value,undefined)
    runtime.close();assert.equal(target.value,undefined)
  }finally{scope.stop();globalThis.document=original}
})
