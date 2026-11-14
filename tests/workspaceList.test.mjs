import assert from 'node:assert/strict'
import test from 'node:test'
import { workspaceSorts, batchTargets, pointBatchQuery, savedPointIds } from '../utils/workspaceList.ts'

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
