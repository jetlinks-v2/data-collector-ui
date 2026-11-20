import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { isDeepStrictEqual } from 'node:util'
import { transformSync } from 'esbuild'
const require = createRequire(import.meta.url)
const cache = new Map()
function load(relative) {
  if(cache.has(relative))return cache.get(relative)
  const module={exports:{}},code=transformSync(readFileSync(new URL(relative,import.meta.url),'utf8'),{loader:'ts',format:'cjs'}).code
  new Function('require','module','exports',code)(id=>id==='lodash-es'?{cloneDeep:structuredClone,isEqual:isDeepStrictEqual}:id.endsWith('/types/workspace')?{accessValues:p=>(p.accessModes||[]).map(v=>typeof v==='string'?v:v.value),stateValue:v=>typeof v==='string'?v:v?.value||''}:id==='./pointBatchDraft'?load('../utils/pointBatchDraft.ts'):id==='./configOptions'?load('../utils/configOptions.ts'):require(id),module,module.exports)
  cache.set(relative,module.exports);return module.exports
}
const draft=load('../utils/pointBatchDraft.ts'),clipboard=load('../utils/pointBatchClipboard.ts')
const point={id:'persisted',name:'温度',provider:'plugin',collectorId:'c',pointKey:'temp',interval:1000,accessModes:[{value:'read',text:'读取'}],configuration:{interval:1000,address:'0012',custom:{keep:true}},managedConfiguration:{codec:'int16',conversion:{formula:'value*10'}},latest:{value:10},runtime:{available:true}}
test('Excel pasted headers map independently of order and preserve zeroes, blanks, Unicode and quoted cells',()=>{
  const parsed=clipboard.mapPointClipboard('类型\t地址\t名称\t标识\t周期（ms）\t采集方式\r\nFloat32\t40001\t"温度\tA\nB"\t0012\t0.1 s\t读取\r\n')
  assert.deepEqual(parsed.fields,['codec','address','name','pointKey','interval','accessModes'])
  assert.deepEqual(parsed.rows,[['Float32','40001','温度\tA\nB','0012','0.1 s','读取']])
  assert.deepEqual(clipboard.readPointClipboard('"a""b"\t\t0012\n'),[['a"b','','0012']])
  assert.deepEqual(clipboard.mapPointClipboard('40001\tInt16', 'address').fields,['address','codec','accessModes','interval'])
  assert.throws(()=>clipboard.mapPointClipboard('名称\t地址\t未知列\n温度\t40001\tx'),/clipboardColumns/)
  assert.throws(()=>clipboard.readPointClipboard('"missing\tvalue'),/clipboardQuotes/)
  assert.deepEqual(clipboard.mapPointClipboard('address','name').rows,[['address']])
  assert.equal(clipboard.mapPointClipboard('名称','name').header,false)
})
test('display codec names and human readable intervals use the shared catalog',()=>{
  const codecs=[{id:'ieee754_float32',name:'IEEE754 32位浮点数'},{id:'int16',name:'16位整数'}]
  assert.equal(clipboard.normalizeClipboardValue('codec','Float32',codecs),'ieee754_float32')
  assert.equal(clipboard.normalizeClipboardValue('codec','Int16',codecs),'int16')
  assert.equal(clipboard.normalizeClipboardValue('interval','0.1 秒',codecs),'100')
  assert.equal(clipboard.normalizeClipboardValue('accessModes','读取',codecs),'read')
})
test('changing only the period preserves access, processing, identity and unrelated remote edits',()=>{
  const row=draft.batchRow(point)
  draft.setBatchField(row,'interval','100')
  const current={...structuredClone(point),name:'远端新名称',modifyTime:999,configuration:{...point.configuration,custom:{keep:true,newField:42}}}
  const result=draft.mergeBatchPoint(row,current)
  assert.equal(result.id,'persisted');assert.equal(result.name,'远端新名称')
  assert.equal(result.interval,100);assert.equal(result.configuration.interval,100)
  assert.deepEqual(result.accessModes,['read']);assert.deepEqual(result.managedConfiguration.conversion,{formula:'value*10'})
  assert.equal(result.configuration.custom.newField,42);assert.equal(result.latest,undefined);assert.equal(result.runtime,undefined)
  assert.throws(()=>draft.mergeBatchPoint(row,{...structuredClone(point),interval:2000,configuration:{...point.configuration,interval:2000}}),/remoteConflict/)
})
test('invalid period survives JSON draft restore and legacy duplicated keys do not block unrelated edits',()=>{
  for(const value of ['abc','']) {
    const row=draft.batchRow(point);draft.setBatchField(row,'interval',value)
    const restored=JSON.parse(JSON.stringify(row))
    assert.ok(draft.batchIssues([restored],[point]).get(row.key).includes('invalidInterval'))
  }
  const row=draft.batchRow(point);draft.setBatchField(row,'interval','100')
  assert.deepEqual(draft.batchIssues([row],[point,{...point,id:'other'}]).get(row.key),[])
  const created=draft.batchRow({...point,id:'new'},undefined,false)
  assert.ok(draft.batchIssues([created],[point]).get('new').includes('duplicateKey'))
})
test('new rows keep stable identities and plugin drafts are isolated from running values',()=>{
  const created=draft.newBatchPoint({id:'c',provider:'plugin',configuration:{template:{interval:500,managedConfiguration:{codec:'int16'}}}},'stable123456789')
  const row=draft.batchRow(created,undefined,false),payload=draft.batchPayload(row)
  assert.equal(payload.id,'stable123456789');assert.equal(payload.interval,500);assert.equal(payload.pointKey,'point_stable123456')
  const copied=draft.batchRow(point);copied.point.configuration.custom.keep=false
  assert.equal(point.configuration.custom.keep,true)
  const remote={...structuredClone(payload),name:'Concurrent new name'}
  assert.throws(()=>draft.mergeBatchPoint(row,remote),/remoteConflict/)
  const existing=draft.batchRow(point);draft.setBatchField(existing,'pointKey','')
  assert.ok(draft.batchIssues([existing],[point]).get(existing.key).includes('keyRequired'))
})
