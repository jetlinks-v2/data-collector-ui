import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import test from 'node:test'
import * as vue from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import { transformSync } from 'esbuild'

const require = createRequire(import.meta.url)
function load(name, mocks = {}) {
  const module = { exports: {} }
  const source = readFileSync(new URL(`../views/data-collect/hook/${name}.ts`, import.meta.url), 'utf8')
  new Function('require', 'module', 'exports', transformSync(source, { loader: 'ts', format: 'cjs' }).code)(id => id in mocks ? mocks[id] : require(id), module, module.exports)
  return module.exports
}
const codec = load('collectScopeRoute')
const settle = async () => { for (let i = 0; i < 12; i++) { await Promise.resolve(); await vue.nextTick() } }
async function workspace(url = '/collectors', canSelect = () => true) {
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/collectors', component: {} }, { path: '/other', component: {} }] })
  await router.push(url)
  const route = vue.reactive(Object.fromEntries(['path', 'fullPath', 'query'].map(key => [key, vue.computed(() => router.currentRoute.value[key])])))
  const data = { initializing: vue.ref(true), collector: vue.ref(), selectedChannelId: vue.ref(''), collectors: vue.ref([]), channels: vue.ref([]), error: vue.ref('') }
  const changes = [], scope = vue.effectScope()
  let guard
  const { useWorkspaceRoute } = load('useWorkspaceRoute', {
    './collectScopeRoute': codec,
    'vue-router': { useRoute: () => route, useRouter: () => router, onBeforeRouteUpdate: callback => { guard = callback } },
  })
  const navigation = scope.run(() => useWorkspaceRoute(data, (collector, channel) => {
    changes.push(collector?.id || channel?.id || 'all')
    data.collector.value = collector
    data.selectedChannelId.value = channel?.id || ''
  }, canSelect))
  const removeGuard = router.beforeEach((to, from) => from.path === '/collectors' && to.path === from.path ? guard(to, from) : undefined)
  function ready() {
    data.collectors.value = [{ id: 'a', channelId: 'c' }, { id: 'b', channelId: 'c' }]
    data.channels.value = [{ id: 'c' }]
    data.initializing.value = false
  }
  return { router, data, changes, ...navigation, ready, stop() { removeGuard(); scope.stop() } }
}

test('scope codec accepts supported links and normalizes malformed scope parameters', () => {
  for (const query of [{}, { scopeType: 'collector' }, { scopeType: 'unknown', scopeId: 'a' }, { scopeType: ['collector'], scopeId: 'a' }, { scopeType: 'channel', scopeId: ['c'] }]) {
    assert.deepEqual(codec.readCollectScope(query), { scopeType: 'all', scopeId: '' })
  }
  for (const scopeType of ['collector', 'channel']) {
    const scope = { scopeType, scopeId: '设备 / a' }
    assert.deepEqual(codec.readCollectScope(codec.collectScopeQuery(scope)), scope)
  }
})

test('a direct collector link waits for the catalog and restores exactly once', async () => {
  const state = await workspace('/collectors?scopeType=collector&scopeId=a&keep=external')
  try {
    assert.deepEqual(state.changes, [])
    state.ready(); await settle()
    assert.equal(state.data.collector.value.id, 'a')
    assert.deepEqual(state.changes, ['a'])
    state.data.collectors.value = state.data.collectors.value.map(row => ({ ...row, runtime: { state: 'running' } }))
    await settle()
    assert.deepEqual(state.changes, ['a'], 'telemetry must not reload the selected collector')
    assert.equal(state.router.currentRoute.value.query.keep, 'external')
  } finally { state.stop() }
})

test('navigation writes shareable scope links and a fresh workspace restores them', async () => {
  const state = await workspace('/collectors?keep=external')
  let restored
  try {
    state.ready()
    await state.select(state.data.collectors.value[0]); await settle()
    assert.equal(state.router.currentRoute.value.query.scopeType, 'collector')
    assert.equal(state.router.currentRoute.value.query.scopeId, 'a')
    restored = await workspace(state.router.currentRoute.value.fullPath)
    restored.ready(); await settle()
    assert.equal(restored.data.collector.value.id, 'a')
    await state.select(undefined, state.data.channels.value[0]); await settle()
    assert.equal(state.data.collector.value, undefined)
    assert.equal(state.data.selectedChannelId.value, 'c')
    assert.equal(state.router.currentRoute.value.query.scopeType, 'channel')
    await state.select(); await settle()
    assert.deepEqual({ ...state.router.currentRoute.value.query }, { keep: 'external' })
    assert.deepEqual(state.changes, ['a', 'c', 'all'])
  } finally { state.stop(); restored?.stop() }
})

test('back and forward restore scopes, while selecting the current collector preserves its editor', async () => {
  const state = await workspace()
  try {
    state.ready()
    await state.select(state.data.collectors.value[0])
    await state.select(state.data.collectors.value[1]); await settle()
    await state.select(state.data.collectors.value[1]); await settle()
    assert.deepEqual(state.changes, ['a', 'b'])
    const navigated = () => new Promise(resolve => { const stop = state.router.afterEach(() => { stop(); resolve() }) })
    let next = navigated(); state.router.back(); await next; await settle()
    assert.equal(state.data.collector.value.id, 'a')
    next = navigated(); state.router.forward(); await next; await settle()
    assert.equal(state.data.collector.value.id, 'b')
    assert.deepEqual(state.changes, ['a', 'b', 'a', 'b'])
  } finally { state.stop() }
})

test('refused navigation preserves both URL and scope; unrelated query changes do not ask or reload', async () => {
  let allowed = false, checks = 0
  const state = await workspace('/collectors?scopeType=collector&scopeId=a', () => { checks++; return allowed })
  try {
    state.ready(); await settle()
    await state.select(state.data.collectors.value[1]); await settle()
    assert.equal(state.data.collector.value.id, 'a')
    assert.equal(state.router.currentRoute.value.query.scopeId, 'a')
    assert.equal(checks, 1)
    await state.router.push({ query: { ...state.router.currentRoute.value.query, keep: 'updated' } }); await settle()
    assert.equal(checks, 1)
    assert.deepEqual(state.changes, ['a'])
    allowed = true
    await state.select(state.data.collectors.value[1]); await settle()
    assert.equal(state.data.collector.value.id, 'b')
  } finally { state.stop() }
})

test('only the latest scope is restored if the route changes while the catalog is loading', async () => {
  const state = await workspace('/collectors?scopeType=collector&scopeId=a')
  try {
    await state.router.push('/collectors?scopeType=collector&scopeId=b')
    state.ready(); await settle()
    assert.deepEqual(state.changes, ['b'])
    await state.router.push('/other?scopeType=collector&scopeId=a'); await settle()
    assert.deepEqual(state.changes, ['b'], 'leaving this page must not apply another page query')
  } finally { state.stop() }
})

test('missing objects fall back to all after a successful catalog query, preserving external query', async () => {
  const state = await workspace('/collectors?scopeType=collector&scopeId=deleted&keep=external')
  try {
    const normalized = new Promise(resolve => { const stop = state.router.afterEach(() => { stop(); resolve() }) })
    state.ready(); await normalized; await settle()
    assert.equal(state.data.collector.value, undefined)
    assert.deepEqual({ ...state.router.currentRoute.value.query }, { keep: 'external' })
  } finally { state.stop() }
})

test('catalog errors keep the requested link available for retry', async () => {
  const state = await workspace('/collectors?scopeType=collector&scopeId=a')
  try {
    state.data.error.value = 'unavailable'; state.data.initializing.value = false; await settle()
    assert.equal(state.router.currentRoute.value.query.scopeId, 'a')
    assert.deepEqual(state.changes, [])
    state.data.initializing.value = true; state.data.error.value = ''; state.ready(); await settle()
    assert.equal(state.data.collector.value.id, 'a')
  } finally { state.stop() }
})

test('collector return scope follows its source list, route history and direct-link fallback', async () => {
  const state = await workspace('/collectors?scopeType=channel&scopeId=c&keep=external')
  let linked
  try {
    state.ready(); await settle()
    await state.select(state.data.collectors.value[0]); await settle()
    assert.deepEqual(state.parentScope.value, {scopeType:'channel',scopeId:'c'})
    assert.equal(state.router.currentRoute.value.query.keep, 'external')
    assert.equal(state.router.currentRoute.value.query.collectorReturnId, undefined, 'return context does not change shareable URLs')
    await state.select(); await settle()
    await state.select(state.data.collectors.value[0]); await settle()
    assert.deepEqual(state.parentScope.value, {scopeType:'all',scopeId:''}, 'opening from all collectors returns to all')
    const back = () => new Promise(resolve => { const stop=state.router.afterEach(()=>{stop();resolve()});state.router.back() })
    await back(); await back(); await settle()
    assert.deepEqual(state.parentScope.value, {scopeType:'channel',scopeId:'c'}, 'history restores the original entry context')
    await state.select(undefined, state.data.channels.value[0]); await settle()
    assert.equal(state.data.selectedChannelId.value, 'c')
    linked = await workspace('/collectors?scopeType=collector&scopeId=b')
    linked.ready(); await settle()
    assert.deepEqual(linked.parentScope.value, {scopeType:'channel',scopeId:'c'})
    linked.data.channels.value=[]; await settle()
    assert.deepEqual(linked.parentScope.value, {scopeType:'all',scopeId:''}, 'missing parent channels retain a usable return')
  } finally { state.stop(); linked?.stop() }
})

test('returning to a parent uses the existing leave guard and preserves context when cancelled', async () => {
  let allowed=true,checks=0
  const state=await workspace('/collectors?scopeType=channel&scopeId=c',()=>{checks++;return allowed})
  try {
    state.ready();await settle();await state.select(state.data.collectors.value[0]);await settle()
    allowed=false
    await state.select(undefined,state.data.channels.value[0]);await settle()
    assert.equal(state.data.collector.value.id,'a')
    assert.deepEqual(state.parentScope.value,{scopeType:'channel',scopeId:'c'})
    assert.equal(checks,2)
    allowed=true
    await state.select(undefined,state.data.channels.value[0]);await settle()
    assert.equal(state.data.selectedChannelId.value,'c')
  } finally {state.stop()}
})
