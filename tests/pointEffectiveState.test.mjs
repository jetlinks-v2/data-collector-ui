import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { transformSync } from 'esbuild'
import { cloneDeep } from 'lodash-es'
import * as vue from 'vue'

function loadPointModule(name, imports) {
  const file = new URL(`../views/data-collect/components/Point/${name}.ts`, import.meta.url)
  const source = readFileSync(file, 'utf8')
  const { code } = transformSync(source, { loader: 'ts', format: 'cjs' })
  const module = { exports: {} }
  new Function('require', 'module', 'exports', code)(id => imports[id], module, module.exports)
  return module.exports
}

const { buildPointListQuery, pointStateTerm } = loadPointModule('pointQuery', {
  '@jetlinks-web-core/components/ConditionFilter': { buildQueryFilter: () => ({ terms: [] }) },
  '../../utils': { buildPointQueryFilterTerms: () => [] },
  './columns': { pointSearchFields: [] },
})

test('stopped list and counts share an exact effective state condition', async () => {
  const state = { scopeType: 'collector', scopeId: 'collector-a', pointType: 'stopped' }
  const list = await buildPointListQuery(state)
  const count = await buildPointListQuery(state, false)
  assert.deepEqual(list.terms, [
    ...count.terms,
    { column: 'id', termType: 'point-effective-state', value: 'stopped', type: 'and' },
  ])
  assert.deepEqual(list.terms.at(-1), pointStateTerm('stopped'))
})

test('selected points use ID-only enable and disable requests, while all uses the accepted filter', async () => {
  const state = { scopeType: 'collector', scopeId: 'collector-a', pointType: 'running' }
  const query = await buildPointListQuery(state)
  const calls = []
  const send = action => async body => {
    calls.push({ action, body })
    return { success: true }
  }
  const { usePointActions } = loadPointModule('usePointActions', {
    vue: { ...vue, provide() {} },
    'vue-router': { useRoute: () => ({}), useRouter: () => ({}) },
    'vue-i18n': { useI18n: () => ({ t: key => key }) },
    'lodash-es': { cloneDeep },
    '@jetlinks-web/utils': { onlyMessage() {} },
    '@jetlinks-web-core/store': { useMenuStore: () => ({}) },
    '@data-collector-ui/api/data-collect/collector': {
      queryCodecProvider: async () => ({ success: true, result: [] }),
      enablePoints: send('enable'),
      disablePoints: send('disable'),
    },
    '@data-collector-ui/utils/utils': {},
    '../../hook/context': { useCollectContext: () => ({ state, current: vue.ref({}), refreshAll: async () => {} }) },
    '../../hook/useCollectRouteState': {},
  })
  const rows = vue.ref([{ id: 'point-a', runningState: { value: 'running' } }])
  const selection = {
    all: vue.ref(false),
    selectedRows: rows,
    selectedKeys: vue.ref(['point-a']),
    clear() {},
  }
  const scope = vue.effectScope()
  try {
    const { batchActions } = scope.run(() => usePointActions(selection, vue.shallowRef(query), rows))
    const run = key => batchActions.value.find(action => action.key === key).popConfirm.onConfirm()
    await run('disable')
    await run('enable')
    selection.all.value = true
    await run('disable')
    const selected = { terms: [{ column: 'id', termType: 'in', value: ['point-a'] }] }
    assert.deepEqual(calls, [
      { action: 'disable', body: selected },
      { action: 'enable', body: selected },
      { action: 'disable', body: query },
    ])
  } finally {
    scope.stop()
  }
})

test('older backend results cannot authorize a filtered batch operation', async () => {
  const state = { scopeType: 'collector', scopeId: 'collector-a', pointType: 'stopped' }
  const row = { id: 'point-a', runningState: { value: 'running' } }
  let data = [row]
  let fetchPage
  const { usePointList } = loadPointModule('usePointList', {
    vue: { ...vue, watch() {}, onActivated() {}, onDeactivated() {} },
    '@data-collector-ui/api/data-collect/collector': {
      queryPoint: async () => ({ success: true, result: { data, total: data.length } }),
    },
    'lodash-es': { cloneDeep },
    '../../hook/context': { useCollectContext: () => ({ state, ready: vue.ref(true) }) },
    './usePointTablePagination': {
      usePointTablePagination: fetch => {
        fetchPage = fetch
        return { rows: vue.ref([]) }
      },
    },
    './pointQuery': { buildPointListQuery },
    './usePointValues': { usePointValues() {} },
  })
  const list = usePointList()
  await assert.rejects(() => fetchPage(0, 10), /Point effective state filter unavailable/)
  assert.equal(list.acceptedQuery.value, undefined)

  data = [{ ...row, effectiveRunningState: { value: 'stopped' } }]
  const response = await fetchPage(0, 10)
  assert.equal(response.result.total, 1)
  assert.deepEqual(list.acceptedQuery.value.terms.at(-1), pointStateTerm('stopped'))
})

test('old backend duplicate status counts are not displayed as valid totals', async () => {
  const state = { scopeType: 'collector', scopeId: 'collector-a', pointType: 'total' }
  let useLegacyBackend = true
  const { usePointCounts } = loadPointModule('usePointCounts', {
    vue: { ...vue, watch() {}, onScopeDispose() {} },
    'lodash-es': { cloneDeep },
    '@data-collector-ui/api/data-collect/dashboard': {
      queryCount: async (_type, query) => {
        const status = query.terms.find(term => term.termType === 'point-effective-state')
        return { success: true, result: useLegacyBackend || !status ? 12 : 6 }
      },
    },
    './pointQuery': { buildPointListQuery, pointStateTerm },
    '../../hook/context': { useCollectContext: () => ({ state }) },
  })
  const { counts, loadData } = usePointCounts()
  await loadData()
  assert.deepEqual({ ...counts }, { total: undefined, running: undefined, stopped: undefined })

  useLegacyBackend = false
  await loadData()
  assert.deepEqual({ ...counts }, { total: 12, running: 6, stopped: 6 })
})

test('parent action reloads the workspace and overwrites the displayed collector state', async () => {
  const state = { ready: true, scopeType: 'collector', scopeId: 'collector-a', page: 1, treeSearch: '', filters: {} }
  let parentState = 'disabled'
  let lastSelected
  let reloads = 0
  let tree
  const { useCollectTree } = loadPointModule('../../Left/useCollectTree', {
    vue,
    'vue-i18n': { useI18n: () => ({ t: () => '已停止' }) },
    '@data-collector-ui/api/data-collect/channel': {
      queryNoPaging: async () => ({ success: true, result: [{ id: 'channel-a', state: { value: parentState } }] }),
    },
    '@data-collector-ui/api/data-collect/collector': {
      queryCollectorTree: async () => ({
        success: true,
        result: [{ id: 'collector-a', channelId: 'channel-a', state: { value: 'enabled' }, runningState: { value: 'running' } }],
      }),
    },
    '../hook/context': {
      useCollectContext: () => ({
        state, ready: vue.ref(true),
        refreshAll: async () => { reloads++; await tree.loadAllData() },
      }),
    },
    '../utils': {
      getChannelActions: (_data, callback) => callback,
      getCollectorActions: (_data, callback) => callback,
    },
  })
  const scope = vue.effectScope()
  try {
    tree = scope.run(() => useCollectTree((_type, node) => { lastSelected = node }))
    await tree.loadAllData()
    assert.equal(lastSelected.state.value, 'enabled')
    assert.equal(lastSelected.effectiveRunningState.value, 'stopped')

    parentState = 'enabled'
    await tree.channelActions({ id: 'channel-a' })('action', { id: 'channel-a' })
    assert.equal(reloads, 1)
    assert.equal(lastSelected.effectiveRunningState, undefined)
    assert.equal(lastSelected.runningState.value, 'running')

    await tree.collectorActions({ id: 'collector-a' })('action', { id: 'collector-a' })
    assert.equal(reloads, 2)
  } finally {
    scope.stop()
  }
})

test('stopping a point drops the current sample and ignores late subscription frames', async () => {
  const row = { id: 'point-a', collectorId: 'collector-a', channelId: 'channel-a', runningState: { value: 'running' } }
  const rows = vue.ref([row])
  const subscriptions = []
  const data = loadPointModule('data', {})
  const { usePointValues } = loadPointModule('usePointValues', {
    vue: { ...vue, onActivated() {}, onDeactivated() {} },
    './data': data,
    '@jetlinks-web/core': {
      wsClient: {
        getWebSocket: (_key, _topic, options) => ({
          subscribe(handler) {
            const entry = { handler, options, closed: false }
            subscriptions.push(entry)
            return { unsubscribe() { entry.closed = true } }
          },
        }),
      },
    },
  })
  const scope = vue.effectScope()
  try {
    const samples = scope.run(() => usePointValues(rows))
    const incoming = (entry, parsedData) => entry.handler({ payload: { pointId: row.id, parsedData } })
    incoming(subscriptions[0], 110)
    assert.equal(samples.value.get(row.id).parsedData, 110)

    rows.value = [{ ...row, effectiveRunningState: { value: 'stopped' } }]
    await vue.nextTick()
    assert.equal(subscriptions.length, 1)
    assert.equal(subscriptions[0].closed, true)
    incoming(subscriptions[0], 111)
    assert.equal(samples.value.get(row.id), undefined)

    rows.value = [row]
    await vue.nextTick()
    assert.equal(subscriptions.length, 2)
    incoming(subscriptions[1], 112)
    assert.equal(samples.value.get(row.id).parsedData, 112)
  } finally {
    scope.stop()
  }
})
