import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { transformSync } from 'esbuild'
import * as vue from 'vue'
import * as lodash from 'lodash-es'
import { accessValues, stateValue } from '../types/workspace.ts'
import { processingDraft, processingPending } from '../utils/processingDraft.ts'
import { batchTargets, pointBatchQuery, savedPointIds } from '../utils/workspaceList.ts'

const require = createRequire(import.meta.url)
function load(name, mocks) {
  const module = { exports: {} }
  const source = readFileSync(new URL(`../views/data-collect/hook/${name}.ts`, import.meta.url), 'utf8')
  new Function('require', 'module', 'exports', transformSync(source, { loader: 'ts', format: 'cjs' }).code)(id => id in mocks ? mocks[id] : require(id), module, module.exports)
  return module.exports
}

function environment() {
  const previous = globalThis.window, events = new Map(), calls = [], saved = []
  globalThis.window = { addEventListener: (name, handler) => events.set(name, handler), removeEventListener: name => events.delete(name) }
  const translations = { useI18n: () => ({ t: key => key }) }
  const api = { updatePoint: async (id, payload) => { calls.push({ id, payload }); return { success: true } } }
  const { usePointDraft } = load('usePointDraft', {
    vue: { ...vue, onBeforeUnmount: vue.onScopeDispose }, 'vue-i18n': translations, 'lodash-es': lodash,
    '@jetlinks-web/utils': { onlyMessage() {} }, '../../../api/data-collect/collector': api,
    '../../../types/workspace': { accessValues, stateValue }, '../../../utils/processingDraft': { processingPending },
  })
  const { useWorkspaceActions } = load('useWorkspaceActions', {
    'vue-i18n': translations, '../../../api/data-collect/collector': api,
    '../../../utils/workspaceList': { batchTargets, pointBatchQuery, savedPointIds },
  })
  const points = new Map(['a', 'b'].map(owner => [owner, { id: `${owner}:point`, collectorId: owner, name: `Point ${owner}`, provider: 'example', configuration: {}, state: 'disabled', accessModes: ['read'] }]))
  const collector = vue.ref({ id: 'a' }), point = vue.ref(points.get('a')), directory = vue.ref([points.get('a')])
  const data = { collector, points: directory, filteredPoints: directory, trialState: vue.ref({ running: false }), pointSort: vue.ref('name'), pointState: vue.ref(''), pointSearch: vue.ref('') }
  const scope = vue.effectScope()
  const draft = scope.run(() => usePointDraft(point, collector, async (oldId,value) => {saved.push({oldId,value})}))
  const batch = scope.run(() => useWorkspaceActions(data, draft.hasCurrentChanges))
  return {
    draft, batch, point, events, calls, api, saved,
    async select(owner, editing = true) {
      collector.value = { id: owner }; directory.value = [points.get(owner)]
      point.value = editing ? points.get(owner) : undefined
      await vue.nextTick()
    },
    close() { scope.stop(); globalThis.window = previous },
  }
}

test('another collector draft does not block batch editing, while page exit still protects it', async () => {
  const state = environment()
  try {
    state.draft.model.value.name = 'Unapplied A'
    await state.select('b')
    assert.equal(state.draft.hasChanges.value, true)
    assert.equal(state.draft.hasCurrentChanges.value, false)
    state.batch.start(); assert.equal(state.batch.state.value.selecting, true)
    let prevented = false
    state.events.get('beforeunload')({ preventDefault() { prevented = true } })
    assert.equal(prevented, true, 'background drafts still prevent accidental page loss')
    await state.select('a', false)
    assert.equal(state.draft.hasCurrentChanges.value, true, 'a collapsed draft belongs to its collector')
    state.batch.start(); assert.equal(state.batch.state.value.selecting, false)
    await state.select('a')
    assert.equal(state.draft.model.value.name, 'Unapplied A')
    state.draft.restore()
    assert.equal(state.draft.hasChanges.value, false)
    state.batch.start(); assert.equal(state.batch.state.value.selecting, true)
    assert.deepEqual(state.calls, [], 'opening batch mode never saves a single-point draft')
  } finally { state.close() }
})

test('save completion carries the edited row for count-only updates and the server identity for new points',async()=>{
  const state=environment()
  try {
    state.api.updatePoint=async()=>({success:true,result:1})
    state.draft.model.value.name='Saved point'
    state.draft.model.value.configuration={address:42}
    await state.draft.apply(async()=>{})
    assert.equal(state.saved[0].value.id,'a:point')
    assert.equal(state.saved[0].value.name,'Saved point')
    assert.deepEqual(state.saved[0].value.configuration,{address:42})
    state.point.value={...state.point.value,id:'_new:test'};await vue.nextTick()
    state.api.savePoint=async()=>({success:true,result:{id:'assigned-id'}})
    await state.draft.apply(async()=>{})
    assert.equal(state.saved[1].oldId,'_new:test')
    assert.equal(state.saved[1].value.id,'assigned-id')
    assert.equal(state.saved[1].value.collectorId,'a')
  } finally {state.close()}
})

test('revisiting a cached draft and reverting its values releases the batch lock', async () => {
  const state = environment()
  try {
    state.draft.model.value.name = 'Temporary'
    await state.select('b'); await state.select('a')
    assert.equal(state.draft.model.value.name, 'Temporary')
    state.draft.model.value.name = 'Point a'
    assert.equal(state.draft.dirty.value, false)
    assert.equal(state.draft.hasChanges.value, false, 'an active clean model must not remain as a cached dirty draft')
    assert.equal(state.draft.hasCurrentChanges.value, false)
    await state.select('b'); await state.select('a')
    assert.equal(state.draft.hasChanges.value, false)
    assert.equal(state.draft.model.value.name, 'Point a')
  } finally { state.close() }
})

test('restoring or applying the current draft keeps other collectors drafts intact', async () => {
  const state = environment()
  try {
    state.draft.model.value.name = 'Keep A'
    await state.select('b'); state.draft.model.value.name = 'Restore B'
    state.draft.restore()
    assert.equal(state.draft.hasCurrentChanges.value, false)
    assert.equal(state.draft.hasChanges.value, true)
    state.draft.model.value.name = 'Save B'
    await state.draft.apply(async () => {})
    assert.equal(state.draft.hasCurrentChanges.value, false)
    assert.equal(state.draft.hasChanges.value, true)
    assert.equal(state.calls.length, 1)
    assert.equal(state.calls[0].id, 'b:point')
    await state.select('a')
    assert.equal(state.draft.model.value.name, 'Keep A')
    assert.equal(state.draft.hasCurrentChanges.value, true)
  } finally { state.close() }
})

test('unfinished processing edits remain protected within their collector without blocking others', async () => {
  const state = environment()
  try {
    processingDraft(state.draft.model.value).outlier.editing = true
    assert.equal(state.draft.hasCurrentChanges.value, true)
    await state.select('b')
    assert.equal(state.draft.hasChanges.value, true)
    assert.equal(state.draft.hasCurrentChanges.value, false)
    await state.select('a')
    assert.equal(processingDraft(state.draft.model.value).outlier.editing, true)
    processingDraft(state.draft.model.value).outlier.editing = false
    assert.equal(state.draft.hasChanges.value, false)
    assert.equal(state.draft.hasCurrentChanges.value, false)
  } finally { state.close() }
})
