import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import * as vue from 'vue'
import { transformSync } from 'esbuild'

test('unrestricted points share one codec catalog while explicit empty restrictions remain empty', async () => {
  let requests = 0
  const source = readFileSync(new URL('../views/data-collect/hook/usePointCodecs.ts', import.meta.url), 'utf8')
  const module = { exports: {} }
  new Function('require', 'module', 'exports', transformSync(source, { loader: 'ts', format: 'cjs' }).code)(id => {
    if (id === 'vue') return { ...vue, onBeforeUnmount() {} }
    if (id.endsWith('/api/data-collect/collector')) return { queryCodecProvider: async () => {
      ++requests
      return { success: true, result: [{ id: 'int16', name: 'Int16' }, { id: 'ieee754_float64', name: 'Float64' }] }
    } }
    throw new Error(`Unexpected import: ${id}`)
  }, module, module.exports)
  const scopes = [vue.effectScope(), vue.effectScope(), vue.effectScope()]
  try {
    const first = scopes[0].run(() => module.exports.usePointCodecs(vue.ref({})))
    const second = scopes[1].run(() => module.exports.usePointCodecs(vue.ref({ supportCodecs: null })))
    const restricted = vue.ref({ supportCodecs: [] })
    const third = scopes[2].run(() => module.exports.usePointCodecs(restricted))
    await new Promise(resolve => setImmediate(resolve))
    assert.equal(requests, 1)
    assert.equal(first.codecs.value.length, 2)
    assert.equal(second.codecs.value.length, 2)
    assert.deepEqual(third.codecs.value, [])
    restricted.value = { supportCodecs: [{ id: 'bool', name: 'Boolean' }] }
    await vue.nextTick()
    assert.deepEqual(third.codecs.value.map(item => item.id), ['bool'])
    assert.equal(requests, 1)
  } finally { scopes.forEach(scope => scope.stop()) }
})
