import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import * as vue from 'vue'
import { Subject, throwError } from 'rxjs'
import { transformSync } from 'esbuild'

const require = createRequire(import.meta.url)
const filename = new URL('../views/data-collect/hook/useWorkspaceRuntime.ts', import.meta.url)

test('a disconnected recording reconnects on the next shared snapshot and clears its old error', async () => {
  const stream = new Subject()
  let requests = 0
  const module = { exports: {} }
  const mocks = {
    vue: {...vue, onBeforeUnmount() {}, onDeactivated() {}, onActivated() {}},
    'vue-i18n': {useI18n: () => ({t: key => key, locale: vue.ref('zh')})},
    '../../../api/data-collect/workspace': {observeLatestRecording: () => ++requests === 1 ? throwError(() => new Error('network error')) : stream},
    './useRuntimeMetricMetadata': {loadRuntimeMetricMetadata: async () => []},
    '../../../utils/workspaceObservation': {observedRuntime: frame => frame?.snapshot},
  }
  new Function('require', 'module', 'exports', transformSync(readFileSync(filename, 'utf8'), {loader:'ts',format:'cjs'}).code)(id => id in mocks ? mocks[id] : require(id), module, module.exports)
  const original = globalThis.document
  globalThis.document = {hidden:false, addEventListener(){}, removeEventListener(){}}
  const scope = vue.effectScope()
  try {
    const snapshot = {id:'point',serverId:'server',available:true}
    const observation = vue.shallowRef({snapshot})
    const runtime = scope.run(() => module.exports.useWorkspaceRuntime(vue.ref({id:'collector'}), vue.ref(false), observation))
    runtime.inspect('point', 'point')
    await vue.nextTick()
    assert.equal(requests, 1)
    assert.equal(runtime.error.value, 'network error')
    observation.value = {snapshot:{...snapshot}}
    await vue.nextTick()
    assert.equal(requests, 2)
    stream.next({executions:[],active:true})
    assert.equal(runtime.error.value, '')
    assert.equal(runtime.recording.value.active, true)
    observation.value = {snapshot:{...snapshot}}
    await vue.nextTick()
    assert.equal(requests, 2, 'a healthy stream is retained')
    runtime.close()
    assert.equal(stream.observers.length, 0)
    observation.value = {snapshot:{...snapshot}}
    await vue.nextTick()
    assert.equal(requests, 2, 'a closed panel does not reconnect')
  } finally {
    scope.stop()
    globalThis.document = original
  }
})
