import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { transformSync } from 'esbuild'

const source = readFileSync(new URL('../utils/batchPointPatch.ts', import.meta.url), 'utf8')
const module = { exports: {} }
new Function('module', 'exports', transformSync(source, { loader:'ts', format:'cjs' }).code)(module, module.exports)
const { buildBatchPointPatch, applyBatchPointPatch } = module.exports

test('period-only query updates never clear access modes, including a disabled scheduled read', () => {
  for (const interval of [0, 10, 1000]) {
    assert.deepEqual(buildBatchPointPatch({ accessModes:[], interval }), { configuration:{ interval } })
  }
  assert.deepEqual(buildBatchPointPatch({accessModes:[],interval:null}), {})
  assert.deepEqual(buildBatchPointPatch({accessModes:[]}), {})
})

test('selected and query-wide edits share patch semantics and retain unrelated settings', () => {
  const point = { id:'a', interval:1000, accessModes:[{value:'subscribe'}], configuration:{nodeId:'ns=2;s=value', interval:1000}, managedConfiguration:{codec:'int16'}, features:['changedOnly'] }
  const patch = buildBatchPointPatch({accessModes:[],interval:250})
  const result = applyBatchPointPatch(point, patch)
  assert.deepEqual(result.accessModes, ['subscribe'])
  assert.deepEqual(result.configuration, {nodeId:'ns=2;s=value',interval:250})
  assert.deepEqual(result.managedConfiguration, point.managedConfiguration)
  assert.deepEqual(result.features, ['changedOnly'])
  assert.equal(result.id, 'a')
  assert.equal('interval' in result, false)
  assert.equal(point.configuration.interval, 1000)
  assert.deepEqual(applyBatchPointPatch(point, buildBatchPointPatch({accessModes:['read']})).accessModes, ['read'])
})
