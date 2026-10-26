import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import test from 'node:test'
import { effectScope, ref } from 'vue'
import { transformSync } from 'esbuild'

const require = createRequire(import.meta.url)
const filename = resolve(import.meta.dirname, '../views/data-collect/components/Point/usePointTablePagination.ts')
const module = { exports: {} }
const { code } = transformSync(readFileSync(filename, 'utf8'), { loader: 'ts', format: 'cjs' })
new Function('require', 'module', 'exports', code)(
  id => id === '@vueuse/core' ? { useResizeObserver: () => {} } : require(id), module, module.exports,
)
const { usePointTablePagination } = module.exports
const page = (start, count = 12, total) => ({
  success: true, result: { data: Array.from({ length: count }, (_, i) => ({ id: `${start + i}` })), total },
})
const deferred = () => {
  let resolve, reject
  const promise = new Promise((a, b) => { resolve = a; reject = b })
  return { promise, resolve, reject }
}
const fixture = request => {
  const scope = effectScope()
  const state = scope.run(() => usePointTablePagination(request, ref()))
  return { state, scope }
}

test('appends pages 0/1/2 and stops at the last page', async () => {
  const requests = []
  const { state, scope } = fixture(async (index, size) => {
    requests.push({ index, size })
    return page(index * size, Math.min(size, 25 - index * size), 25)
  })
  try {
    await state.reload()
    await state.loadMore()
    assert.equal(state.rows.value.length, 24)
    assert.equal(state.rows.value[0].id, '0')
    await state.loadMore()
    await state.loadMore()
    assert.equal(state.rows.value.length, 25)
    assert.equal(state.hasMore.value, false)
    assert.deepEqual(requests, [{ index: 0, size: 12 }, { index: 1, size: 12 }, { index: 2, size: 12 }])
  } finally { scope.stop() }
})

test('repeated bottom events share the in-flight page request', async () => {
  const pending = deferred()
  let calls = 0
  const { state, scope } = fixture(() => { calls++; return pending.promise })
  try {
    const first = state.reload()
    await Promise.all([state.loadMore(), state.loadMore(), state.loadMore()])
    assert.equal(calls, 1)
    pending.resolve(page(0))
    await first
    assert.equal(state.rows.value.length, 12)
  } finally { scope.stop() }
})

test('a failed next page keeps loaded rows and retries the same page index', async () => {
  const indices = []
  let fail = true
  const { state, scope } = fixture(async index => {
    indices.push(index)
    if (index === 1 && fail) throw new Error('network failure')
    return page(index * 12)
  })
  try {
    await state.reload()
    await state.loadMore()
    assert.equal(state.failed.value, true)
    assert.equal(state.rows.value.length, 12)
    fail = false
    await state.loadMore()
    assert.deepEqual(indices, [0, 1, 1])
    assert.equal(state.failed.value, false)
    assert.equal(state.rows.value.length, 24)
  } finally { scope.stop() }
})

test('query reset ignores stale responses and restarts at page zero', async () => {
  const old = deferred(), current = deferred()
  const indices = []
  const { state, scope } = fixture(index => {
    indices.push(index)
    return indices.length === 1 ? old.promise : current.promise
  })
  try {
    const previous = state.reload()
    const next = state.reload()
    old.resolve(page(100))
    await previous
    assert.equal(state.rows.value.length, 0)
    assert.equal(state.loading.value, true)
    current.resolve(page(200))
    await next
    assert.equal(state.rows.value[0].id, '200')
    assert.deepEqual(indices, [0, 0])
  } finally { scope.stop() }
})

test('full last pages stop by total, and duplicate IDs do not create duplicate rows', async () => {
  const { state, scope } = fixture(async index => page(index * 11, 12, 24))
  try {
    await state.reload()
    await state.loadMore()
    assert.equal(state.rows.value.length, 23)
    assert.equal(new Set(state.rows.value.map(row => row.id)).size, 23)
    assert.equal(state.hasMore.value, false)
  } finally { scope.stop() }
})

test('unsuccessful responses remain retryable, and disposed scopes ignore late results', async () => {
  const pending = deferred()
  let count = 0
  const { state, scope } = fixture(() => ++count === 1 ? Promise.resolve({ success: false }) : pending.promise)
  await state.reload()
  assert.equal(state.failed.value, true)
  assert.equal(state.hasMore.value, true)
  const retry = state.loadMore()
  scope.stop()
  pending.resolve(page(0))
  await retry
  assert.equal(state.rows.value.length, 0)
})
