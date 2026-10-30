import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import test from 'node:test'
import { transformSync } from 'esbuild'
import * as vue from 'vue'
import { compileScript, parse } from 'vue/compiler-sfc'
import axios from 'axios'

const require = createRequire(import.meta.url)
const moduleRoot = resolve(import.meta.dirname, '..')
const coreRoot = resolve(moduleRoot, '../../jetlinks-web-core')
const coreRequire = createRequire(resolve(coreRoot, 'package.json'))
const lodash = await import('lodash-es')
const uint64 = '18446744073709551615'
const missing = '未上报'

const loadCode = (source, mocks = {}) => {
  const module = { exports: {} }
  const { code } = transformSync(source, { loader: 'ts', format: 'cjs' })
  new Function('require', 'module', 'exports', 'window', 'navigator', 'setTimeout', code)(
    id => id in mocks ? mocks[id] : id === 'lodash-es' ? lodash : require(id),
    module, module.exports, { addEventListener() {} }, { onLine: true }, () => 0,
  )
  return module.exports
}
const loadFile = (file, mocks) => loadCode(readFileSync(file, 'utf8'), mocks)
const json = loadFile(resolve(coreRoot, 'src/utils/json/index.ts'), {
  'lossless-json': coreRequire('lossless-json'),
})
const { deserializeCollectorMessage } = loadFile(resolve(coreRoot, 'src/utils/json/collector.ts'), {
  './index': json,
})
const values = loadFile(resolve(moduleRoot, 'utils/pointValue.ts'))

test('raw JSON preserves unsafe integers, decimal digits, exponents and nested values', () => {
  for (const literal of [uint64, '-9007199254740992', '9007199254740993', '9007199254740992.0',
    '0.1234567890123456789', '-0.1234567890123456789', '1.8446744073709551615e19', '1e400', '1e-400']) {
    assert.equal(json.parseJsonWithPrecision(literal), literal)
  }
  const result = json.parseJsonWithPrecision(`{"parsedData":[${uint64},{"value":0.1234567890123456789}],"parseData":${uint64},"timestamp":1793097242592,"zero":0,"enabled":false}`)
  assert.equal(result.parsedData[0], uint64)
  assert.equal(result.parsedData[1].value, '0.1234567890123456789')
  assert.equal(result.parseData, uint64)
  assert.equal(result.timestamp, 1793097242592)
  assert.equal(result.zero, 0)
  assert.equal(result.enabled, false)
  assert.equal(JSON.parse(uint64), 18446744073709552000)
})

test('safe numbers and strings retain their existing types; HTTP empty/error responses remain usable', () => {
  for (const literal of ['0', '-0', '1.25', '1e3', '1e-3', '9007199254740991', '-9007199254740991']) {
    assert.equal(json.parseJsonWithPrecision(literal), JSON.parse(literal))
  }
  assert.equal(json.parseJsonWithPrecision(`"${uint64}"`), uint64)
  for (const value of ['', ' ', null, { status: 200 }, '<html>Bad Gateway</html>']) {
    assert.equal(json.parseJsonResponseWithPrecision(value), value)
  }
  assert.deepEqual(json.parseJsonResponseWithPrecision('{"status":403,"message":"forbidden"}'),
    { status: 403, message: 'forbidden' })
  assert.throws(() => deserializeCollectorMessage({ data: 'invalid JSON' }), SyntaxError)
})

const createApi = (response) => {
  const configs = []
  const instance = axios.create({
    adapter: async config => {
      configs.push(config)
      return { data: response(config), status: 200, statusText: 'OK', headers: {}, config }
    },
  })
  instance.interceptors.response.use(({ data }) => ({ ...data, success: data.status === 200 }))
  const api = loadFile(resolve(moduleRoot, 'api/data-collect/collector.ts'), {
    '@jetlinks-web/core': { request: { post: (...args) => instance.post(...args) } },
    '@jetlinks-web-core/utils': { getBaseApi: () => '/api' },
    '@jetlinks-web-core/utils/json': json,
  })
  return { api, configs }
}

test('actual HTTP APIs parse before Axios rounds values, with opt-in limited to point data', async () => {
  const { api, configs } = createApi(() => `{"status":200,"result":[{"parsedData":${uint64},"parseData":${uint64},"value":0.1234567890123456789,"numberValue":${uint64}}]}`)
  for (const call of [() => api.readPoint('collector', ['point']),
    () => api.queryPointHistory('collector', { pageSize: 10 }),
    () => api.queryPointAggregation('collector', { columns: [] })]) {
    const result = await call()
    assert.equal(result.success, true)
    assert.equal(result.result[0].parsedData, uint64)
    assert.equal(result.result[0].numberValue, uint64)
    assert.equal(result.result[0].value, '0.1234567890123456789')
  }
  assert.deepEqual(JSON.parse(configs[0].data), ['point'])
  const other = await api.queryPointCount({ terms: [] })
  assert.equal(typeof other.result[0].parsedData, 'number')
})

class FakeSocket {
  static instances = []
  readyState = 0
  constructor() { FakeSocket.instances.push(this) }
  send() {}
  open() { this.readyState = 1; this.onopen?.({ target: this }) }
  receive(data) { this.onmessage?.({ data }) }
  close() { this.readyState = 3; this.onclose?.({ wasClean: true, code: 1000 }) }
}

for (const [artifact, filename] of [
  ['source', coreRequire.resolve('@jetlinks-web/core/src/websocket.ts')],
  ['published entry', coreRequire.resolve('@jetlinks-web/core')],
]) {
  test(`real WebSocket client ${artifact}: precise collector frames, native sibling frames and default parser`, () => {
    const originalSocket = globalThis.WebSocket
    globalThis.WebSocket = FakeSocket
    const clients = []
    try {
      const { WebSocketClient } = loadFile(filename, {
        'ant-design-vue': { notification: { error() {} } },
        '@jetlinks-web/constants': { BASE_API: '/api', TOKEN_KEY: 'X-Access-Token' },
        '@jetlinks-web/utils': { getToken: () => '', randomString: () => 'test' },
      })
      for (const enabled of [true, false]) {
        const client = new WebSocketClient()
        clients.push(client)
        if (enabled) client.setOptions({ deserializer: deserializeCollectorMessage })
        client.initWebSocket('ws://localhost/test')
        client.connect()
        const socket = FakeSocket.instances.at(-1)
        socket.open()
        for (const id of ['collector-channel-id-data-point', 'collector-log-channel', 'device-properties']) {
          let received
          const subscription = client.getWebSocket(id, '/collector/channel/id/data').subscribe(message => { received = message })
          socket.receive(`{"type":"result","requestId":"${id}","payload":{"pointId":"point","parsedData":${uint64},"parseData":${uint64},"dataType":"ULong","timestamp":1793097242592}}`)
          assert.equal(received.payload.parsedData, enabled && id === 'collector-channel-id-data-point' ? uint64 : Number(uint64))
          assert.equal(received.payload.timestamp, 1793097242592)
          subscription.unsubscribe()
        }
      }
    } finally {
      for (const client of clients) client.disconnect()
      globalThis.WebSocket = originalSocket
    }
  })
}

const renderer = vue.createRenderer({
  createElement: tag => ({ tag, children: [], props: {} }),
  createText: text => ({ text }), createComment: () => ({ text: '' }),
  setText: (node, text) => { node.text = text },
  setElementText: (node, text) => { node.children = [{ text, parent: node }] },
  parentNode: node => node.parent,
  nextSibling: node => node.parent?.children[node.parent.children.indexOf(node) + 1] ?? null,
  patchProp: (node, key, previous, value) => { node.props[key] = value },
  insert(node, parent, anchor) {
    if (node.parent) node.parent.children.splice(node.parent.children.indexOf(node), 1)
    node.parent = parent
    const index = anchor ? parent.children.indexOf(anchor) : -1
    parent.children.splice(index < 0 ? parent.children.length : index, 0, node)
  },
  remove(node) {
    if (node.parent) {
      node.parent.children.splice(node.parent.children.indexOf(node), 1)
      node.parent = undefined
    }
  },
})
const textOf = node => node.text ?? node.children?.map(textOf).join('') ?? ''
const findRead = node => node.tag === 'a' ? node : node.children?.map(findRead).find(Boolean)

test('actual ValueItem renders live, structured and manual-read values, including zero and false', async () => {
  let literal = uint64
  const { api } = createApi(() => `{"status":200,"result":[{"parsedData":${literal},"parseData":${literal},"dataType":"ULong"}]}`)
  const filename = resolve(moduleRoot, 'views/data-collect/components/Point/components/ValueItem.vue')
  const { descriptor } = parse(readFileSync(filename, 'utf8'))
  const { content } = compileScript(descriptor, { id: 'precision-value', inlineTemplate: true })
  const ValueItem = loadCode(content, {
    '@data-collector-ui/views/data-collect/components/Point/data': { getAccessModes: () => ['read'] },
    '@data-collector-ui/api/data-collect/collector': api,
    '@data-collector-ui/utils/pointValue': values,
    '@jetlinks-web/utils': { onlyMessage() {} },
    'vue-i18n': { useI18n: () => ({ t: () => missing }) },
    './WritePoint.vue': { default: {} },
  }).default
  for (const live of [{ parsedData: uint64, dataType: 'ULong' },
    { parseData: [uint64, false, 0], dataType: 'Array' }, undefined]) {
    const container = { children: [] }
    const app = renderer.createApp(ValueItem, { value: live, data: { collectorId: 'collector', id: 'point' }, type: 'detail' })
    const passthrough = { setup: (_, { slots }) => () => vue.h('span', slots.default?.()) }
    app.component('j-ellipsis', passthrough).component('a-space', passthrough).component('AIcon', { render: () => null })
    app.mount(container)
    try {
      if (live) assert.ok(textOf(container).includes(values.formatPointData(live, missing)))
      else {
        assert.ok(textOf(container).includes(missing))
        for (const raw of [uint64, '0', 'false']) {
          literal = raw
          await findRead(container).props.onClick({ stopPropagation() {} })
          await vue.nextTick()
          assert.ok(textOf(container).includes(`${raw}(ULong)`))
        }
      }
    } finally { app.unmount() }
  }
})

test('display compatibility keeps false, zero and parsedData precedence without number coercion', () => {
  for (const value of [0, false, uint64, '0.1234567890123456789']) {
    assert.equal(values.formatPointData({ parsedData: value, dataType: 'Value' }, missing), `${value}(Value)`)
  }
  assert.equal(values.formatPointData({ parsedData: null, parseData: 42, dataType: 'Value' }, missing), missing)
  assert.equal(values.formatPointValue({ value: uint64 }, missing), `{"value":"${uint64}"}`)
  for (const value of [undefined, null, '']) assert.equal(values.formatPointValue(value, missing), missing)
})

test('actual ECharts retains exact text while converting coordinates, and zero remains visible', () => {
  const echarts = require('echarts')
  const chart = echarts.init(null, null, { renderer: 'svg', ssr: true, width: 400, height: 200 })
  try {
    const data = [uint64, '0.1234567890123456789', 0].map(values.toPointChartValue)
    chart.setOption({ xAxis: { type: 'category', data: ['a', 'b', 'c'] }, yAxis: {}, series: [{ type: 'line', data }] })
    const series = chart.getModel().getSeriesByIndex(0)
    for (const [index, exact] of [uint64, '0.1234567890123456789', '0'].entries()) {
      const params = series.getDataParams(index)
      assert.equal(values.formatPointChartTooltip([{ ...params, axisValueLabel: 'time' }], missing), `time\n${exact}`)
      assert.equal(typeof params.value, 'number')
    }
    assert.equal(values.toPointChartValue('1e400').value, null)
    assert.equal(values.toPointChartValue('1e400').exactValue, '1e400')
  } finally { chart.dispose() }
})
