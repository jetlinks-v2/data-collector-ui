import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import test from 'node:test'
import { transformSync } from 'esbuild'
import { effectScope, nextTick, reactive } from 'vue'

const require = createRequire(import.meta.url)
const configDir = resolve(import.meta.dirname, '../views/data-collect/components/Config')
const modules = new Map()
const load = filename => {
  if (modules.has(filename)) return modules.get(filename).exports
  const module = { exports: {} }
  modules.set(filename, module)
  const { code } = transformSync(readFileSync(filename, 'utf8'), { loader: 'ts', format: 'cjs' })
  const imports = id => id.startsWith('.') ? load(resolve(dirname(filename), `${id}.ts`)) : require(id)
  new Function('require', 'module', 'exports', code)(imports, module, module.exports)
  return module.exports
}
const { toDisplayTerms, toPassConfiguration } = load(resolve(configDir, 'deadbandTerms.ts'))
const { useDeadbandTerms } = load(resolve(configDir, 'useDeadbandTerms.ts'))
const term = (termType, value, type = 'and') => ({ column: 'currentValue', termType, value, type })

const matchesLeaf = (item, value) => {
  switch (item.termType) {
    case 'neq': return value !== item.value
    case 'lte': return value <= item.value
    case 'gte': return value >= item.value
    case 'lt': return value < item.value
    case 'gt': return value > item.value
    default: throw new Error(`Unexpected comparison ${item.termType}`)
  }
}

// 后端普通条件按 AND 优先于 OR 求值；页面比较符对应的是相反的死区含义。
const matches = (terms, value, display = false) => {
  const groups = []
  terms.forEach((item, index) => {
    const result = item.terms ? matches(item.terms, value) : display ? !matchesLeaf(item, value) : matchesLeaf(item, value)
    if (index === 0 || item.type === 'or') groups.push(result)
    else groups[groups.length - 1] = groups[groups.length - 1] && result
  })
  return groups.some(Boolean)
}

const fixture = (configuration = {}) => {
  const state = reactive({ configuration })
  const writes = []
  const scope = effectScope()
  const editor = scope.run(() => useDeadbandTerms(() => state.configuration, next => {
    writes.push(next)
    state.configuration = next
  }))
  return { state, writes, editor, scope }
}

test('100 < x AND x < 150 submits an OR pass condition and preserves strict boundaries', () => {
  const configuration = toPassConfiguration([term('lte', 100), term('gte', 150)])
  assert.equal(configuration.terms[0].terms[1].type, 'or')
  for (const value of [99, 100, 101, 149, 150, 151]) {
    assert.equal(matches(configuration.terms, value), !(value > 100 && value < 150), `value ${value}`)
  }
})

test('x < 100 OR x > 150 submits an AND pass condition', () => {
  const configuration = toPassConfiguration([term('gte', 100), term('lte', 150, 'or')])
  assert.equal(configuration.terms.length, 2)
  assert.equal(configuration.terms[1].type, 'and')
  for (const value of [99, 100, 101, 149, 150, 151]) {
    assert.equal(matches(configuration.terms, value), value >= 100 && value <= 150)
  }
})

test('mixed AND/OR preserves precedence, round-trips, and does not mutate the input', () => {
  for (const second of ['and', 'or']) {
    for (const third of ['and', 'or']) {
      const input = [term('lte', 100), term('gte', 150, second), term('neq', 101, third)]
      const snapshot = structuredClone(input)
      const configuration = toPassConfiguration(input)
      const restored = toDisplayTerms(configuration)
      assert.deepEqual(input, snapshot)
      assert.deepEqual(restored.map(item => item.type), ['and', second, third])
      for (const value of [0, 99, 100, 101, 102, 149, 150, 151]) {
        assert.equal(matches(configuration.terms, value), !matches(input, value, true), `${second}/${third}/${value}`)
        assert.equal(matches(restored, value, true), matches(input, value, true))
      }
    }
  }
})

test('keeps zero and stable keys while excluding condition-editor display metadata', () => {
  const configuration = toPassConfiguration([{ ...term('neq', 0), key: 'zero', fullName: 'display metadata' }])
  assert.deepEqual(configuration.terms[0].terms[0], {
    column: 'currentValue', termType: 'neq', type: 'and', value: 0, key: 'zero',
  })
})

test('loading and inherited replacement display the actual saved logic without writing', async () => {
  const original = { terms: [{ terms: [term('lte', 100), term('gte', 150)] }] }
  const { state, writes, editor, scope } = fixture(original)
  try {
    assert.deepEqual(editor.terms.value.map(item => item.type), ['and', 'or'])
    assert.equal(writes.length, 0)
    state.configuration = toPassConfiguration([term('lte', 100), term('gte', 150)])
    await nextTick()
    assert.deepEqual(editor.terms.value.map(item => item.type), ['and', 'and'])
    assert.equal(writes.length, 0)
    assert.deepEqual(original.terms[0].terms.map(item => item.type), ['and', 'and'])
  } finally { scope.stop() }
})

test('changing the connector preserves display logic after save and reload', async () => {
  const { state, editor, scope } = fixture()
  try {
    editor.onChange([term('gte', 100), term('lte', 150, 'or')])
    await nextTick()
    assert.deepEqual(editor.terms.value.map(item => item.type), ['and', 'or'])
    const firstSave = structuredClone(JSON.parse(JSON.stringify(state.configuration)))
    for (let index = 0; index < 3; index++) {
      editor.onChange(editor.terms.value)
      await nextTick()
      assert.deepEqual(JSON.parse(JSON.stringify(state.configuration)), firstSave)
    }
    editor.onChange(editor.terms.value.map(item => ({ ...item, type: 'and' })))
    await nextTick()
    assert.deepEqual(editor.terms.value.map(item => item.type), ['and', 'and'])
    assert.equal(state.configuration.terms[0].terms[1].type, 'or')
  } finally { scope.stop() }
})

test('percentage configuration and completeness checks keep their existing behavior', async () => {
  const { state, editor, scope } = fixture()
  try {
    editor.type.value = "this['currentValue'] - this['lastValue']"
    editor.percent.value = 5
    editor.onValueChange()
    await nextTick()
    assert.deepEqual(state.configuration, { terms: [{ terms: [{
      column: "this['currentValue'] - this['lastValue']", value: 5, termType: 'neq',
    }] }] })
    assert.equal(editor.hasCompleteTerms(), true)
    editor.type.value = 'currentValue'
    editor.onChange([term('neq', 0), term('lte', 100, 'or')])
    await nextTick()
    assert.equal(editor.hasCompleteTerms(), true)
    state.configuration.terms[1].terms[0].value = ''
    assert.equal(editor.hasCompleteTerms(), false)
    editor.resetTerms()
    await nextTick()
    assert.equal(editor.hasCompleteTerms(), false)
    assert.deepEqual(state.configuration, {})
  } finally { scope.stop() }
})
