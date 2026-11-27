import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createRequire} from 'node:module'
import {resolve,dirname} from 'node:path'
import {fileURLToPath} from 'node:url'
import {transformSync} from 'esbuild'
const require=createRequire(import.meta.url),cache=new Map()
function load(path){
  if(cache.has(path))return cache.get(path).exports
  const module={exports:{}};cache.set(path,module)
  new Function('require','module','exports',transformSync(readFileSync(path,'utf8'),{loader:'ts',format:'cjs'}).code)(
    id=>id.startsWith('.')?load(resolve(dirname(path),id+'.ts')):require(id),module,module.exports)
  return module.exports
}
const root=fileURLToPath(new URL('../',import.meta.url))
const {newerPointSample,compareOwnerEpoch}=load(root+'utils/pointValue.ts')
const {applyObservedValues}=load(root+'utils/workspaceObservation.ts')
const {selectRuntime,executingRuntimes,monitoredObjects}=load(root+'utils/runtimeMonitoring.ts')

test('new owner wins after device clock resets and late old frames cannot replace it',()=>{
  const old={pointId:'point',timestamp:9000,ownerEpoch:'9007199254740993',channelId:'channel'}
  const current={pointId:'point',timestamp:1000,ownerEpoch:'9007199254740994',channelId:'channel'}
  assert.equal(compareOwnerEpoch(current.ownerEpoch,old.ownerEpoch),1)
  assert.equal(newerPointSample(current,old),true)
  assert.equal(newerPointSample(old,current),false)
  const row={id:'point',channelId:'channel',latest:old}
  const index=new Map([['point',row]])
  applyObservedValues(index,[current,old,{pointId:'point',timestamp:99999}])
  assert.equal(row.latest,current)
  applyObservedValues(index,[{...current,channelId:'other',ownerEpoch:'9007199254740995'}])
  assert.equal(row.latest,current)
})

test('standby and previous epochs do not inflate counts or mask the current owner',()=>{
  const node=(serverId,role,ownerEpoch,state='running')=>({id:'collector',serverId,available:true,state,
    execution:{role,ownerEpoch},pointSummary:{total:2,available:2,states:{running:2}},
    metrics:{instanceId:serverId,sampledAt:2000,values:{receivedSamples:{available:true,value:10}}}})
  const old=node('old','active','1','failed'),active=node('new','active','2'),standby=node('backup','standby',undefined)
  const values=[old,active,standby]
  assert.equal(selectRuntime(values),active)
  assert.deepEqual(executingRuntimes(values),[active])
  const [object]=monitoredObjects([{id:'collector'}],{timestamp:2000,snapshots:values})
  assert.equal(object.monitoring.nodeCount,1)
  assert.equal(object.monitoring.pointSummary.total,2)
})
