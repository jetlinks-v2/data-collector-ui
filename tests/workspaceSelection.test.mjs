import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import * as vue from 'vue'
import { transformSync } from 'esbuild'

const require = createRequire(import.meta.url)
const directory = new URL('../views/data-collect/hook/', import.meta.url)
function load(name, mocks) {
  const module = { exports: {} }
  const source = readFileSync(new URL(name + '.ts', directory), 'utf8')
  new Function('require', 'module', 'exports', transformSync(source, { loader: 'ts', format: 'cjs' }).code)(id => id in mocks ? mocks[id] : require(id), module, module.exports)
  return module.exports
}
const translations = { useI18n: () => ({ t: key => key }) }

test('selection is explicit, stable across telemetry, scoped to filtered points and cleared on exit', async () => {
  const { batchTargets, pointBatchQuery, savedPointIds } = await import('../utils/workspaceList.ts')
  const calls = []
  const { useWorkspaceActions } = load('useWorkspaceActions', {
    'vue-i18n': translations,
    '../../../api/data-collect/collector': { enablePoints: async query => { calls.push(query); return { success: true, result: 2 } } },
    '../../../utils/workspaceList': { batchTargets, pointBatchQuery, savedPointIds },
  })
  const points = vue.ref([{ id: 'a', state: 'disabled' }, { id: 'b', state: 'disabled' }, { id: '_new:1' }])
  const data = { trialState:vue.ref({running:false,error:''}), filteredPoints: points, points, collector: vue.ref({ id: 'collector' }), pointSort: vue.ref('name'), pointState: vue.ref(''), pointSearch: vue.ref(''), loadPoints: async () => {} }
  const dirty = vue.ref(false), scope = vue.effectScope()
  const batch = scope.run(() => useWorkspaceActions(data, dirty))
  try {
    batch.toggle('a')
    assert.deepEqual(batch.state.value.keys, [], 'browsing cannot silently select points')
    batch.start(); batch.toggle('a')
    assert.equal(batch.state.value.selecting, true)
    assert.deepEqual(batch.state.value.keys, ['a'])
    points.value = points.value.map(point => ({ ...point, latest: { parsedData: 42 } }))
    await vue.nextTick()
    assert.deepEqual(batch.state.value.keys, ['a'], 'live values preserve selection')
    batch.all()
    assert.deepEqual(batch.state.value.keys, ['a', 'b'], 'all includes filtered saved points only')
    assert.deepEqual(calls, [], 'selection never executes an action')
    await batch.run('enable')
    assert.deepEqual(calls[0].terms, [{ column: 'collectorId', value: 'collector' }, { column: 'id', termType: 'in', value: ['a', 'b'] }])
    batch.toggle('a'); data.pointSearch.value = 'b'; await vue.nextTick()
    assert.equal(batch.state.value.selecting, false)
    assert.deepEqual(batch.state.value.keys, [])
    dirty.value = true; batch.start()
    assert.equal(batch.state.value.selecting, false, 'a dirty draft must be applied before batch mode')
    dirty.value = false; batch.start(); batch.toggle('b'); batch.clear()
    assert.equal(batch.state.value.selecting, false)
    assert.deepEqual(batch.state.value.keys, [])
  } finally { scope.stop() }
})

test('point clicks browse normally and select in batch mode without opening or replacing the editor', async () => {
  const selecting = vue.ref(false), toggled = []
  const batch = { busy: vue.ref(false), state: vue.computed(() => ({ selecting: selecting.value })), start: () => { selecting.value = true }, toggle: id => toggled.push(id) }
  const data = { orderHeld: vue.ref(false), collector: vue.ref(), points: vue.ref([]), selectedPointId: vue.ref(''), selectedPoint: vue.ref(), paused: vue.ref(false), observation: vue.ref() }
  const lifecycle = { ...vue, provide() {}, onMounted() {}, onBeforeUnmount() {} }
  const { useCollectionWorkspace } = load('useCollectionWorkspace', {
    vue: lifecycle, 'vue-i18n': translations, 'vue-router': { onBeforeRouteLeave() {} }, 'ant-design-vue': { Modal: {} },
    './useWorkspaceData': { useWorkspaceData: () => data }, './useWorkspaceRuntime': { useWorkspaceRuntime: () => ({ close() {} }) },
    './usePointDraft': { usePointDraft: () => ({ hasChanges: vue.ref(false), saving: vue.ref(false), model: vue.ref(), dirty: vue.ref(false) }) }, './useWorkspaceActions': { useWorkspaceActions: () => batch }, '../data': {},
    './useWorkspaceRoute': { useWorkspaceRoute: (_data, apply, canSelect) => async (...args) => { if (await canSelect()) apply(...args) } },
  })
  const previous = globalThis.window
  globalThis.window = { addEventListener() {}, removeEventListener() {} }
  const scope = vue.effectScope()
  try {
    const workspace = scope.run(() => useCollectionWorkspace())
    workspace.selectPoint('a')
    assert.equal(workspace.editingId.value, 'a')
    workspace.selectPoint('a')
    assert.equal(workspace.editingId.value, '', 'wide-screen cards toggle the same inline editor')
    workspace.selectPoint('a')
    assert.equal(workspace.editingId.value, 'a')
    workspace.startBatch()
    assert.equal(workspace.editingId.value, '')
    workspace.selectPoint('b'); await vue.nextTick()
    assert.deepEqual(toggled, ['b'])
    assert.equal(workspace.editingId.value, '')
    assert.equal(data.selectedPointId.value, 'a', 'batch selection leaves the detail model intact')
    batch.busy.value = true; workspace.selectPoint('c')
    assert.deepEqual(toggled, ['b'], 'executing actions cannot change selection')
  } finally { scope.stop(); globalThis.window = previous }
})
