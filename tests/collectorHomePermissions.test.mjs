import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { transformSync } from 'esbuild'
import * as vue from 'vue'
import { compileScript, parse } from 'vue/compiler-sfc'

const root = new URL('../views/data-collect/', import.meta.url)
function load(path, imports) {
  const filename = new URL(path, root)
  let source = readFileSync(filename, 'utf8')
  if (path.endsWith('.vue')) {
    const {descriptor} = parse(source, {filename: filename.pathname})
    source = compileScript(descriptor, {id: path, inlineTemplate: true}).content
  }
  const {code} = transformSync(source, {loader: 'ts', format: 'cjs'})
  const module = {exports: {}}
  new Function('require', 'module', 'exports', code)(id => {
    if (!(id in imports)) throw new Error(`Unexpected dependency ${id}`)
    return imports[id]
  }, module, module.exports)
  return module.exports
}
const renderer = vue.createRenderer({
  createElement: tag => ({tag, props: {}, children: []}),
  createText: text => ({text}), createComment: () => ({text: ''}),
  setText: (node, text) => {node.text = text},
  setElementText: (node, text) => {node.children = [{text, parent: node}]},
  parentNode: node => node.parent,
  nextSibling: node => node.parent?.children[node.parent.children.indexOf(node) + 1] ?? null,
  patchProp: (node, key, old, value) => {node.props[key] = value},
  insert(node, parent, anchor) {
    if (node.parent) node.parent.children.splice(node.parent.children.indexOf(node), 1)
    node.parent = parent
    const index = anchor ? parent.children.indexOf(anchor) : -1
    parent.children.splice(index < 0 ? parent.children.length : index, 0, node)
  },
  remove(node) {
    if (node.parent) node.parent.children.splice(node.parent.children.indexOf(node), 1)
    node.parent = undefined
  },
})
const find = (node, match) => match(node) ? node : node.children?.map(child => find(child, match)).find(Boolean)
const passthrough = {setup(_, {slots}) {return () => vue.h('span', slots.default?.())}}
const i18n = {useI18n: () => ({t: key => key})}

test('channel and collector title details require view authorization, filters remain local', () => {
  const grants = vue.ref(new Set(['data-collect:update']))
  const type = vue.ref('channel'), data = vue.ref({id: 'channel', name: 'channel'})
  const visible = vue.reactive({point: false, channel: false, collector: false})
  const state = vue.reactive({page: 3, filters: {channel: false, collector: false, point: false}})
  const injections = {type, data, 'detail-visible': visible}
  const {useCollectHeader} = load('components/useCollectHeader.ts', {
    vue: {...vue, inject: (key, fallback) => injections[key] ?? fallback},
    'vue-i18n': i18n,
    '@jetlinks-web-core/store': {useAuthStore: () => ({hasPermission: key => grants.value.has(key)})},
    '../hook/context': {useCollectContext: () => ({state})},
    '@data-collector-ui/views/data-collect/data': {COLLECTOR_TYPE: 'type', COLLECTOR_DATA: 'data', REFRESH_HANDLER: 'refresh'},
    '@data-collector-ui/views/data-collect/utils': {getCountList: async () => []},
  })
  const scope = vue.effectScope()
  try {
    const header = scope.run(() => useCollectHeader())
    header.onDetail()
    assert.equal(visible.channel, false)
    grants.value.add('data-collect:view')
    assert.equal(header.canView.value, true)
    header.onDetail()
    assert.equal(visible.channel, true)
    type.value = 'collector'
    header.onDetail()
    assert.equal(visible.channel, false)
    assert.equal(visible.collector, true)
    visible.collector = false
    grants.value.clear()
    header.onDetail()
    assert.equal(visible.collector, false)
    header.onClick({type: 'point'})
    assert.equal(state.page, 1)
    assert.equal(state.filters.point, true)
    type.value = 'all'
    grants.value.add('data-collect:view')
    header.onDetail()
    assert.equal(visible.collector, false)
  } finally {scope.stop()}
})

test('left import hooks and the real menu require add plus import, including after revocation', async () => {
  for (const initialGrants of [[], ['add'], ['import'], ['add', 'import']]) {
    const grants = vue.ref(new Set(initialGrants.map(key => `data-collect:${key}`)))
    const imports = {
      vue: {...vue, inject: () => undefined}, 'vue-i18n': i18n,
      '@jetlinks-web-core/store': {useAuthStore: () => ({hasPermission: key => grants.value.has(key)})},
      '@data-collector-ui/api/data-collect/channel': {},
      '@data-collector-ui/api/data-collect/collector': {},
      '@data-collector-ui/hooks': {useCollectorProvider: () => ({providers: vue.ref([])})},
      '../../data': {REFRESH_HANDLER: 'refresh'},
    }
    const {useCollectImport} = load('Left/components/useCollectImport.ts', imports)
    let hook
    const ActionButtons = load('Left/components/ActionButtons.vue', {
      vue,
      './useCollectImport': {useCollectImport: props => {hook = useCollectImport(props); return hook}},
      '../../components/Import/index.vue': {__esModule: true, default: {render: () => vue.h('div', {'data-import': true})}},
    }).default
    let additions = 0
    const app = renderer.createApp(ActionButtons, {onAdd: () => additions++})
    app.component('ADropdown', {props: ['disabled'], setup(props, {slots}) {return () => vue.h('div', {'data-dropdown-disabled': props.disabled}, [slots.default?.(), slots.overlay?.()])}})
    app.component('JPermissionButton', {props: ['hasPermission'], setup(props, {slots}) {return () => vue.h('button', {disabled: !props.hasPermission, 'data-create': true}, slots.default?.())}})
    app.component('AMenuItem', {props: ['disabled'], setup(props, {slots}) {
      const key = vue.getCurrentInstance().vnode.key
      return () => vue.h('button', {disabled: props.disabled, 'data-menu': key}, slots.default?.())
    }})
    for (const name of ['AMenu', 'AForm', 'AFormItem', 'ASelect', 'AIcon']) app.component(name, passthrough)
    app.config.globalProperties.$t = key => key
    const container = {children: []}
    app.mount(container)
    try {
      const menu = key => find(container, node => node.props?.['data-menu'] === key)
      const allowed = initialGrants.includes('add') && initialGrants.includes('import')
      assert.equal(find(container, node => 'data-dropdown-disabled' in (node.props ?? {})).props['data-dropdown-disabled'], !initialGrants.includes('add'))
      menu('add').props.onClick()
      assert.equal(additions, initialGrants.includes('add') ? 1 : 0)
      for (const key of ['importChannel', 'importCollector']) {
        assert.equal(menu(key).props.disabled, !allowed)
        menu(key).props.onClick()
        assert.equal(hook.importVisible.value, allowed)
        if (allowed) assert.equal(hook.activeKey.value, key)
      }
      const capturedAdd = menu('add').props.onClick
      const capturedImport = menu('importChannel').props.onClick
      hook.importVisible.value = false
      grants.value.clear()
      const previousAdditions = additions
      capturedAdd(); capturedImport()
      assert.equal(additions, previousAdditions)
      assert.equal(hook.importVisible.value, false)
      await vue.nextTick()
      assert.equal(menu('importChannel').props.disabled, true)
      assert.equal(find(container, node => node.props?.['data-create']).props.disabled, true)
    } finally {app.unmount()}
  }
})

function mountValue(props, request = async () => ({success: true, result: [{parsedData: 42}]})) {
  const calls = [], messages = [], refreshes = []
  const ValueItem = load('components/Point/components/ValueItem.vue', {
    vue, 'vue-i18n': i18n, dayjs: {__esModule: true, default: () => ({format: () => ''})},
    '../data': load('components/Point/data.ts', {}),
    '@data-collector-ui/utils/pointValue': load('../../utils/pointValue.ts', {}),
    '@data-collector-ui/api/data-collect/collector': {readPoint: (...args) => {calls.push(args); return request()}},
    '@jetlinks-web/utils': {onlyMessage: text => messages.push(text)},
    './WritePoint.vue': {__esModule: true, default: {render: () => vue.h('div', {'data-writer': true})}},
  }).default
  const app = renderer.createApp({setup: () => () => vue.h(ValueItem, {...props, onRefresh: () => refreshes.push(true)})})
  for (const name of ['JEllipsis', 'ASpace']) app.component(name, passthrough)
  app.component('AIcon', {props: ['type'], setup: props => () => vue.h('i', {'data-icon': props.type})})
  const container = {children: []}
  app.mount(container)
  const action = icon => find(container, node => node.tag === 'a' && find(node, child => child.props?.['data-icon'] === icon))
  return {container, calls, messages, refreshes, action, unmount: () => app.unmount()}
}
const valueProps = (options = {}) => vue.reactive({
  data: {id: 'point', collectorId: 'collector', accessModes: [{value: 'read'}, {value: 'write'}]},
  ...options,
})

test('live-value read and write grants are independent and retain access-mode and stopped restrictions', async () => {
  for (const [canRead, canWrite] of [[false, false], [true, false], [false, true], [true, true]]) {
    const props = valueProps({canRead, canWrite}), f = mountValue(props)
    try {
      assert.equal(Boolean(f.action('RedoOutlined')), canRead)
      assert.equal(Boolean(f.action('EditOutlined')), canWrite)
      if (canRead) await f.action('RedoOutlined').props.onClick({stopPropagation() {}})
      if (canWrite) f.action('EditOutlined').props.onClick({stopPropagation() {}})
      await vue.nextTick()
      assert.deepEqual(f.calls, canRead ? [['collector', ['point']]] : [])
      assert.equal(Boolean(find(f.container, node => node.props?.['data-writer'])), canWrite)
      props.data.accessModes = []
      await vue.nextTick()
      assert.equal(Boolean(f.action('RedoOutlined')), false)
      assert.equal(Boolean(f.action('EditOutlined')), false)
      props.data.accessModes = [{value: 'read'}, {value: 'write'}]
      props.data.state = {value: 'disabled'}
      await vue.nextTick()
      assert.equal(Boolean(f.action('RedoOutlined')), false)
      assert.equal(Boolean(f.action('EditOutlined')), false)
    } finally {f.unmount()}
  }
})

test('revoked live-value grants reject captured clicks and discard a pending read response', async () => {
  let resolve
  const props = valueProps({canRead: true, canWrite: true})
  const f = mountValue(props, () => new Promise(done => {resolve = done}))
  try {
    const read = f.action('RedoOutlined').props.onClick, write = f.action('EditOutlined').props.onClick
    const event = {stopPropagation() {}}
    write(event)
    await vue.nextTick()
    assert.ok(find(f.container, node => node.props?.['data-writer']))
    const pending = read(event)
    props.canRead = false; props.canWrite = false
    await vue.nextTick()
    await read(event); write(event)
    resolve({success: true, result: [{parsedData: 42}]})
    await pending
    await vue.nextTick()
    assert.equal(Boolean(find(f.container, node => node.props?.['data-writer'])), false)
    assert.equal(f.calls.length, 1)
    assert.deepEqual(f.messages, [])
    assert.deepEqual(f.refreshes, [])
    props.canWrite = true
    await vue.nextTick()
    assert.equal(Boolean(find(f.container, node => node.props?.['data-writer'])), false, 'restoring permission must not reopen a dismissed writer')
  } finally {f.unmount()}
})

test('existing detail callers retain their read and write behavior without homepage props', () => {
  const f = mountValue(valueProps({type: 'detail'}))
  try {
    assert.ok(f.action('RedoOutlined'))
    assert.ok(f.action('EditOutlined'))
  } finally {f.unmount()}
})
