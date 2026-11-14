import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createRequire} from 'node:module'
import {transformSync} from 'esbuild'
import {Observable,lastValueFrom} from 'rxjs'
import * as observation from '../utils/workspaceObservation.ts'
import * as monitoring from '../utils/runtimeMonitoring.ts'
import * as list from '../utils/workspaceList.ts'
const require=createRequire(import.meta.url)
const source=readFileSync(new URL('../api/data-collect/workspace.ts',import.meta.url),'utf8')

test('global index requests are finite, value-free, and limited to two batches of 200 at once',async()=>{
  const calls=[]
  let active=0,maximum=0
  const module={exports:{}}
  new Function('require','module','exports',transformSync(source,{loader:'ts',format:'cjs'}).code)(id=>{
    if(id === '@jetlinks-web/core')return {request:{}}
    if(id === '@jetlinks-web-core/utils/ndjson')return {createRuntimeNdJson:()=>({post:(url,body)=>new Observable(subscriber=>{
      calls.push(body);active++;maximum=Math.max(maximum,active)
      const timer=setTimeout(()=>{
        subscriber.next({timestamp:100,nodes:[{serverId:'n',collector:{id:'collector',available:true},points:body.pointIds.map(id=>({id,runtime:{id,serverId:'n',available:true,state:'running',currentFailure:id === '1199' ? {code:1,reason:'test'} : undefined}}))}]})
        subscriber.complete()
      },1)
      return ()=>{clearTimeout(timer);active--}
    })})}
    if(id.endsWith('/utils/workspaceObservation'))return observation
    if(id.endsWith('/utils/runtimeMonitoring'))return monitoring
    if(id.endsWith('/utils/workspaceList'))return list
    return require(id)
  },module,module.exports)
  const rows=Array.from({length:1200},(_,i)=>({id:String(i),name:String(i),configuration:{}}))
  const index=await lastValueFrom(module.exports.queryWorkspaceIndex(rows,'collector'))
  assert.equal(index.size,1200)
  assert.equal(calls.length,6)
  assert.equal(maximum,2)
  assert.equal(active,0)
  for(const call of calls){
    assert.equal(call.interval,0)
    assert.equal(call.includeData,false)
    assert.equal(call.includeRawData,false)
    assert.ok(call.pointIds.length <= 200)
    assert.deepEqual(call.metrics,[])
  }
  assert.deepEqual(list.workspaceOrder(rows,'name','','attention',index),['1199'])
})
