import assert from 'node:assert/strict'
import test from 'node:test'
import { workspaceSorts, workspaceOrder, workspaceRuntimeIndex, batchTargets, pointBatchQuery, savedPointIds } from '../utils/workspaceList.ts'

const points = [{ id: 'a', state: { value: 'enabled' } }, { id: 'b', state: 'disabled' }, { id: '_new:1', state: 'disabled' }]
test('every server sort has an ID tie-breaker', () => {
  for (const sort of ['newest', 'name', 'pointKey']) {
    assert.equal(workspaceSorts(sort).at(-1).name, 'id')
    assert.equal(workspaceSorts(sort)[0].name, sort === 'newest' ? 'createTime' : sort)
  }
})
test('batch actions exclude drafts, invisible IDs and already matching states', () => {
  assert.deepEqual(savedPointIds(points), ['a', 'b'])
  assert.deepEqual(batchTargets(points, ['a','b','_new:1','hidden'], 'enable'), ['b'])
  assert.deepEqual(batchTargets(points, ['a','b'], 'disable'), ['a'])
  assert.deepEqual(batchTargets(points, ['a','b'], 'read'), ['a','b'])
})
test('batch query requires a nonempty collector and explicit IDs', () => {
  assert.throws(() => pointBatchQuery('collector', []))
  assert.throws(() => pointBatchQuery('', ['a']))
  assert.deepEqual(pointBatchQuery('collector', ['a']).terms, [{ column:'collectorId',value:'collector' }, { column:'id',termType:'in',value:['a'] }])
})

test('global runtime sorting finds an error at the end of a 1200-point directory', () => {
  const directory=Array.from({length:1200},(_,i)=>({id:String(i).padStart(4,'0'),name:'Point '+i,state:'enabled',configuration:{}}))
  const index=new Map(directory.map(row=>[row.id,{state:'running',priority:3,duration:100,gap:1,filtered:0}]))
  index.set('1199',{state:'collectionError',priority:0,duration:5000,gap:5,filtered:12})
  for(const sort of ['attention','duration','gap','filtered'])assert.equal(workspaceOrder(directory,sort,'','',index)[0],'1199')
  assert.deepEqual(workspaceOrder(directory,'name','','attention',index),['1199'])
  assert.equal(workspaceOrder(directory,'name','','running',index).length,1199)
  assert.equal(workspaceOrder(directory,'name','','enabled',new Map()).length,1200)
  assert.equal(workspaceOrder(directory,'name','Point 1199','',index).length,1)
})

test('unknown measurements sort after measured zero, and protection can be filtered separately', () => {
  const rows=['a','b','c'].map(id=>({id,name:id,configuration:{}}))
  const index=new Map([['a',{state:'running',priority:3}],['b',{state:'open',priority:0,duration:0}],['c',{state:'retrying',priority:1,duration:5}]])
  assert.deepEqual(workspaceOrder(rows,'duration','','',index),['c','b','a'])
  assert.deepEqual(workspaceOrder(rows,'name','','protection',index),['b','c'])
  const summary=workspaceRuntimeIndex({...rows[0],runtime:{id:'a',available:true,runtimeState:'running'},latest:{parsedData:new Array(10000)},monitoring:{durationNanos:0,expectedIntervalMillis:100,receivedIntervalNanos:200e6,receivedAgeNanos:300e6}})
  assert.equal(summary.gap,3)
  assert.equal(summary.duration,0)
  assert.equal('latest' in summary,false)
  assert.equal('runtime' in summary,false)
})
