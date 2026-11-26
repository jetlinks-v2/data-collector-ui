import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createRequire} from 'node:module'
import {transformSync} from 'esbuild'
import {Observable,of,lastValueFrom} from 'rxjs'
const require=createRequire(import.meta.url)

test('workspace uses the shared platform connection, cancels its business subscription, and retains NDJSON',()=>{
  const calls=[],closed=[],http=[],module={exports:{}}
  new Function('require','module','exports',transformSync(readFileSync(new URL('../api/data-collect/workspace.ts',import.meta.url),'utf8'),{loader:'ts',format:'cjs'}).code)(id=>{
    if(id==='@jetlinks-web/core')return {request:{},wsClient:{getWebSocket:(id,topic,query,options)=>new Observable(observer=>{
      calls.push({id,topic,query,options});observer.next({payload:{monitoring:{timestamp:1}}});return ()=>closed.push(id)
    })}}
    if(id==='@jetlinks-web-core/utils/ndjson')return {createRuntimeNdJson:()=>({post:(url,query)=>{http.push({url,query});return of({observation:{timestamp:2}})}})}
    if(id==='@jetlinks-web-core/utils/ndjson-precision')return {postRuntimeNdJson:()=>of({})}
    if(id==='@jetlinks-web-core/utils/json')return {parseJsonWithPrecision:text=>text}
    if(id.startsWith('../../utils/'))return {}
    return require(id)
  },module,module.exports)
  const query={monitoring:[{ids:['c'],channelIds:[],interval:2000,metrics:null}],observation:{id:'c',pointIds:['p'],interval:2000},recording:{collectorId:'c',serverId:'n',interval:1000}}
  const values=[],source=module.exports.observeCollectionWorkspace(query)
  assert.equal(calls.length,0,'subscription is lazy and does not send before being owned')
  const subscription=source.subscribe(value=>values.push(value))
  assert.equal(calls.length,1)
  assert.equal(calls[0].topic,'/collector-workspace/observe')
  assert.equal(calls[0].query,query)
  assert.equal(typeof calls[0].options.deserializer,'function')
  assert.equal(Object.hasOwn(query,'deserializer'),false)
  assert.deepEqual(values,[{monitoring:{timestamp:1}}])
  subscription.unsubscribe();assert.deepEqual(closed,[calls[0].id])
  source.subscribe().unsubscribe()
  assert.notEqual(calls[0].id,calls[1].id,'late frames cannot reach a replacement subscription')
  module.exports.observeCollectionWorkspace(query,'ndjson').subscribe()
  assert.equal(http[0].url,'/data-collect/collector/_workspace')
  assert.equal(http[0].query,query)
})

test('point index batches explicitly omit object summaries while legacy observations keep them',async()=>{
  const calls=[],module={exports:{}}
  new Function('require','module','exports',transformSync(readFileSync(new URL('../api/data-collect/workspace.ts',import.meta.url),'utf8'),{loader:'ts',format:'cjs'}).code)(id=>{
    if(id==='@jetlinks-web/core')return {request:{},wsClient:{}}
    if(id==='@jetlinks-web-core/utils/ndjson')return {createRuntimeNdJson:()=>({post:(url,query)=>{calls.push({url,query});return of({timestamp:1,nodes:[]})}})}
    if(id==='@jetlinks-web-core/utils/ndjson-precision')return {postRuntimeNdJson:()=>of({})}
    if(id==='@jetlinks-web-core/utils/json')return {parseJsonWithPrecision:text=>text}
    if(id.endsWith('/workspaceObservation'))return {observedPoints:rows=>rows}
    if(id.endsWith('/workspaceList'))return {workspaceRuntimeIndex:row=>({id:row.id})}
    if(id.startsWith('../../utils/'))return {}
    return require(id)
  },module,module.exports)
  const rows=Array.from({length:10000},(_,index)=>({id:`p${index}`}))
  const index=await lastValueFrom(module.exports.queryWorkspaceIndex(rows,'collector'))
  assert.equal(index.size,10000)
  assert.equal(calls.length,50)
  assert.ok(calls.every(({query})=>query.includeObjects===false && query.includeData===false && query.interval===0 && query.pointIds.length===200))
  module.exports.observeWorkspace('collector',[]).subscribe()
  assert.equal(calls.at(-1).query.includeObjects,true)
})
