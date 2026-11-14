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
  const details = []
  const collector = { id: 'collector', channelId: 'channel', name: 'Collector' }
  const runtime = id => ({ id, serverId: 'server', available: true, state: 'running' })
  const api = {
    listWorkspaceChannels: () => { calls.push('channels'); return channels.promise },
    listWorkspaceProviders: () => { calls.push('providers'); return providers.promise },
    listWorkspaceCollectors: () => { calls.push('collectors'); return collectors.promise },
    listWorkspacePoints: async () => ({ success: true, result: ['point', 'second', 'third'].map(id => ({ id, collectorId: collector.id })) }),
    loadWorkspacePoint: (collectorId, id, signal) => {
      const result=deferred();details.push({collectorId,id,signal,...result});return result.promise
    },
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
    assert.deepEqual(observations, [])
    assert.equal(data.points.value[0].latest, undefined)
    data.setVisiblePoints(['point'])
    // The first visible range starts synchronously, with no empty request or debounce delay.
    assert.deepEqual(observations.at(-1), { id: 'collector', pointIds: ['point'] })
    assert.equal(data.points.value[0].latest.parsedData, 0)
    // Scrolling releases old values and cancels their stream without rebuilding navigation monitoring.
    data.setVisiblePoints(['second'])
    assert.deepEqual(closed.at(-1), ['point'])
    assert.equal(observations.length, 1)
    await new Promise(resolve => setTimeout(resolve, 160))
    assert.deepEqual(closed.at(-1), ['point'])
    assert.deepEqual(observations.at(-1).pointIds, ['second'])
    assert.equal(data.points.value[0].latest, undefined)
    assert.equal(data.points.value[1].latest.parsedData, 0)
    assert.equal(monitors.length, 1)
    // An open editor retains exactly its selected point while other off-screen values are released.
    data.selectedPointId.value = 'second'
    await vue.nextTick()
    assert.equal(data.selectedLoading.value, true)
    assert.equal(data.selectedPoint.value, undefined, 'a directory row must never become a saveable form')
    details.at(-1).resolve({success:true,result:[{id:'second',configuration:{address:2},managedConfiguration:{filters:['test']}}]})
    await new Promise(resolve => setImmediate(resolve))
    assert.deepEqual(data.selectedPoint.value.configuration,{address:2})
    assert.equal(data.points.value[1].configuration,undefined, 'full configuration is held only for the selected point')
    data.setVisiblePoints(['third'])
    await new Promise(resolve => setTimeout(resolve, 160))
    assert.deepEqual(new Set(observations.at(-1).pointIds), new Set(['second', 'third']))
    data.selectedPointId.value = ''
    await new Promise(resolve => setTimeout(resolve, 160))
    assert.equal(data.points.value[1].latest, undefined)
    assert.deepEqual(observations.at(-1).pointIds, ['third'])
    assert.equal(data.selectedPoint.value,undefined)
    // Continuous scrolling cancels the old stream immediately and waits until scrolling settles.
    const before=observations.length
    for(const id of ['point','second','third','point']){
      data.setVisiblePoints([id])
      await new Promise(resolve => setTimeout(resolve,80))
      assert.equal(observations.length,before)
    }
    await new Promise(resolve => setTimeout(resolve,80))
    assert.deepEqual(observations.at(-1).pointIds,['point'])
    // Rapid selection aborts the previous detail request; its late response cannot replace the editor.
    data.selectedPointId.value='point';await vue.nextTick()
    const stale=details.at(-1)
    data.selectedPointId.value='third';await vue.nextTick()
    assert.equal(stale.signal.aborted,true)
    stale.resolve({success:true,result:[{id:'point',configuration:{address:1}}]})
    details.at(-1).resolve({success:true,result:[{id:'third',configuration:{address:3}}]})
    await new Promise(resolve => setImmediate(resolve))
    assert.equal(data.selectedPoint.value.id,'third')
    assert.equal(data.selectedPoint.value.configuration.address,3)
    const requests=details.length
    data.setVisiblePoints(['second'])
    await new Promise(resolve => setTimeout(resolve,160))
    assert.equal(details.length,requests,'scrolling does not reload protocol configuration')
    data.paused.value = true
    await vue.nextTick()
    assert.deepEqual(new Set(closed.at(-1)),new Set(['second','third']))
  } finally {
    scope.stop()
    if (oldDocument === undefined) delete globalThis.document
    else globalThis.document = oldDocument
  }
})
