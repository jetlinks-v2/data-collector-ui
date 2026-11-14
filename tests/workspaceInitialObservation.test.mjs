import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import * as vue from 'vue'
import { throttle, debounce } from 'lodash-es'
import * as workspaceList from '../utils/workspaceList.ts'
import { Observable } from 'rxjs'
import { transformSync } from 'esbuild'

const require = createRequire(import.meta.url)
const source = readFileSync(new URL('../views/data-collect/hook/useWorkspaceData.ts', import.meta.url), 'utf8')
const deferred = () => {
  let resolve
  const promise = new Promise(done => { resolve = done })
  return { promise, resolve }
}

test('initial queries run together and one stream paints the first snapshot immediately', async () => {
  const channels = deferred(), providers = deferred(), collectors = deferred()
  const calls = [], monitors = [], observations = [], closed = []
  const collector = { id: 'collector', channelId: 'channel', name: 'Collector' }
  const runtime = id => ({ id, serverId: 'server', available: true, state: 'running' })
  const api = {
    listWorkspaceChannels: () => { calls.push('channels'); return channels.promise },
    listWorkspaceProviders: () => { calls.push('providers'); return providers.promise },
    listWorkspaceCollectors: () => { calls.push('collectors'); return collectors.promise },
    listWorkspacePoints: async () => ({ success: true, result: ['point', 'second', 'third'].map(id => ({ id, collectorId: collector.id })) }),
    monitorCollectors: (ids, interval, channelIds) => new Observable(observer => {
      monitors.push({ ids, interval, channelIds })
      observer.next({ timestamp: 100, collectors: [runtime('collector')], channels: [runtime('channel')] })
    }),
    observeWorkspace: (id, pointIds) => new Observable(observer => {
      observations.push({ id, pointIds })
      observer.next({ timestamp: 101, nodes: [{ collector: runtime(id), channel: runtime('channel'), points: [] }] })
      return () => closed.push(pointIds)
    }),
  }
  const module = { exports: {} }
  new Function('require', 'module', 'exports', transformSync(source, { loader: 'ts', format: 'cjs' }).code)(id => {
    if (id === 'vue') return { ...vue, onActivated() {}, onDeactivated() {}, onBeforeUnmount() {} }
    if (id === 'vue-i18n') return { useI18n: () => ({ t: key => key }) }
    if (id === 'lodash-es') return { throttle, debounce }
    if (id.endsWith('/api/data-collect/workspace')) return api
    if (id.endsWith('/utils/runtimeMonitoring')) return { monitoredObjects: (values, round) => values.map(value => ({ ...value, runtime: round.snapshots.find(item => item.id === value.id) })) }
    if (id.endsWith('/utils/workspaceObservation')) return { observedPoints: values => values.map(value => ({ ...value, latest: { parsedData: 0, timestamp: 101 } })) }
    if (id.endsWith('/api/data-collect/collector')) return {}
    if (id.endsWith('/utils/workspaceList')) return workspaceList
    return require(id)
  }, module, module.exports)
  const oldDocument = globalThis.document
  globalThis.document = { hidden: false, addEventListener() {}, removeEventListener() {} }
  const scope = vue.effectScope()
  try {
    const data = scope.run(() => module.exports.useWorkspaceData())
    assert.equal(data.initializing.value, true)
    const initialization = data.initialize()
    assert.deepEqual(calls, ['channels', 'providers', 'collectors'])
    collectors.resolve({ success: true, result: [collector] })
    providers.resolve({ success: true, result: [] })
    channels.resolve({ success: true, result: [{ id: 'channel', name: 'Channel' }] })
    await initialization
    assert.equal(data.initializing.value, false)
    assert.equal(monitors.length, 1)
    assert.deepEqual(monitors[0].ids, ['collector'])
    assert.deepEqual(monitors[0].channelIds, ['channel'])
    assert.equal(data.collectors.value[0].runtime.state, 'running')
    assert.equal(data.channels.value[0].runtime.state, 'running')
    data.select(data.collectors.value[0])
    await new Promise(resolve => setImmediate(resolve))
    assert.deepEqual(observations, [{ id: 'collector', pointIds: [] }])
    assert.equal(data.points.value[0].latest, undefined)
    data.setVisiblePoints(['point'])
    await new Promise(resolve => setTimeout(resolve, 160))
    assert.deepEqual(observations.at(-1), { id: 'collector', pointIds: ['point'] })
    assert.equal(data.points.value[0].latest.parsedData, 0)
    // Scrolling releases old values and cancels their stream without rebuilding navigation monitoring.
    data.setVisiblePoints(['second'])
    await new Promise(resolve => setTimeout(resolve, 160))
    assert.deepEqual(closed.at(-1), ['point'])
    assert.deepEqual(observations.at(-1).pointIds, ['second'])
    assert.equal(data.points.value[0].latest, undefined)
    assert.equal(data.points.value[1].latest.parsedData, 0)
    assert.equal(monitors.length, 1)
    // An open editor retains exactly its selected point while other off-screen values are released.
    data.selectedPointId.value = 'second'
    data.setVisiblePoints(['third'])
    await new Promise(resolve => setTimeout(resolve, 160))
    assert.deepEqual(new Set(observations.at(-1).pointIds), new Set(['second', 'third']))
    data.selectedPointId.value = ''
    await new Promise(resolve => setTimeout(resolve, 160))
    assert.equal(data.points.value[1].latest, undefined)
    assert.deepEqual(observations.at(-1).pointIds, ['third'])
    data.paused.value = true
    await vue.nextTick()
    assert.deepEqual(closed.at(-1), ['third'])
  } finally {
    scope.stop()
    if (oldDocument === undefined) delete globalThis.document
    else globalThis.document = oldDocument
  }
})
