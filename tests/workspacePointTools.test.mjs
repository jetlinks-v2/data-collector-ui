import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createRequire} from 'node:module'
import * as vue from 'vue'
import {transformSync} from 'esbuild'
const require=createRequire(import.meta.url)
const source=readFileSync(new URL('../views/data-collect/hook/useWorkspacePointTools.ts',import.meta.url),'utf8')
test('telemetry updates preserve the browse panel and do not reload plugin capabilities',async()=>{
  let calls=0
  const module={exports:{}}
  const code=transformSync(source,{loader:'ts',format:'cjs'}).code
  new Function('require','module','exports',code)(id=>id==='vue'?{...vue,provide(){}}:id.includes('/utils/utils')?{devGetProtocol:async()=>{calls++;return '<template />'}}:id.includes('/api/data-collect/collector')?{exportTemplate(){},pointImport(){}}:require(id),module,module.exports)
  const scope=vue.effectScope(),collector=vue.ref({id:'a',provider:'plugin'})
  const tools=scope.run(()=>module.exports.useWorkspacePointTools(collector))
  try {
    await vue.nextTick();tools.scanOpen.value=true
    for(let i=0;i<3;i++){collector.value={...collector.value,monitoring:{timestamp:i}};await vue.nextTick()}
    assert.equal(calls,1);assert.equal(tools.scanOpen.value,true)
    collector.value={id:'b',provider:'other'};await vue.nextTick()
    assert.equal(calls,2);assert.equal(tools.scanOpen.value,false)
  }finally{scope.stop()}
})
