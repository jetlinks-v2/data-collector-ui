import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { transformSync } from 'esbuild'
import { cloneDeep } from 'lodash-es'
import * as vue from 'vue'
import { renderToString } from 'vue/server-renderer'
import { compileScript, parse } from 'vue/compiler-sfc'

const root = new URL('../views/data-collect/components/Point/', import.meta.url)
function load(source, imports) {
  const { code } = transformSync(source, { loader: 'ts', format: 'cjs' })
  const module = { exports: {} }
  new Function('require', 'module', 'exports', code)(id => {
    if (!(id in imports)) throw new Error(`Unexpected dependency ${id}`)
    return imports[id]
  }, module, module.exports)
  return module.exports
}
function fixture(initialGrants = [], apiOverrides = {}) {
  const grants = vue.ref(new Set(initialGrants)), calls = [], messages = []
  const state = vue.reactive({scopeType: 'collector', scopeId: 'collector', pointType: 'all', sort: '', order: '', page: 1})
  const current = vue.ref({id: 'collector', provider: 'COLLECTOR_GATEWAY', configuration: {collectorProvider: 'modbus'}})
  const rows = vue.ref([{id: 'point', collectorId: 'collector', name: 'point-name'}])
  const query = vue.ref({terms: [{column: 'collectorId', value: 'collector'}]})
  const selection = {all: vue.ref(false), selectedRows: rows, selectedKeys: vue.ref(['point']), clear: () => calls.push(['clear'])}
  const send = name => async value => {calls.push([name, value]); return {success: true}}
  const auth = {hasPermission: code => grants.value.has(code)}
  const imports = {
    vue: {...vue, provide() {}},
    'vue-router': {useRoute: () => ({path: '/resources/collectors', query: {scope: 'collector'}}),
      useRouter: () => ({resolve: () => ({fullPath: '/resources/collectors?scope=collector'})})},
    'vue-i18n': {useI18n: () => ({t: key => key})},
    'lodash-es': {cloneDeep},
    '@jetlinks-web/utils': {onlyMessage: text => messages.push(text), downloadFileByUrl: () => calls.push(['download'])},
    '@jetlinks-web-core/store': {useMenuStore: () => ({jumpPage: (...args) => calls.push(['jump', ...args])}), useAuthStore: () => auth},
    '@data-collector-ui/api/data-collect/collector': {
      queryCodecProvider: async () => ({success: true, result: []}),
      enablePoints: send('enable'), disablePoints: send('disable'),
      deletePoints: send('delete-all'), batchDeletePoint: send('delete-selected'),
      removePoint: send('delete-point'),
      pointDetail: async id => {calls.push(['point-detail', id]); return {success: true, result: {id}}},
      detail: async id => {calls.push(['collector-detail', id]); return {success: true, result: {id}}},
      exportPoint: async (...args) => {calls.push(['export', ...args]); return new Uint8Array([1])},
      ...apiOverrides,
    },
    '@data-collector-ui/utils/utils': {},
    '../../hook/context': {useCollectContext: () => ({state, current, refreshAll: async () => calls.push(['refresh'])})},
    '../../hook/useCollectRouteState': {collectRouteQuery: () => ({scope: 'collector'})},
  }
  const {usePointActions} = load(readFileSync(new URL('usePointActions.ts', root), 'utf8'), imports)
  const scope = vue.effectScope()
  const actions = scope.run(() => usePointActions(selection, query, rows))
  actions.pointActions.batchAdd = true
  return {grants, calls, state, rows, query, selection, actions, usePointActions, stop: () => scope.stop()}
}
const keys = f => f.actions.batchActions.value.map(action => action.key)

test('view-only grant exposes no batch writes or export', async () => {
  const f = fixture(['data-collect:view'])
  try {
    assert.deepEqual(keys(f), [])
    assert.equal(f.actions.canExport.value, false)
    f.actions.batchAdd()
    await f.actions.exportData()
    assert.deepEqual(f.calls, [])
  } finally {f.stop()}
})

test('each existing batch operation requires its own current menu grant', () => {
  const expected = {add: ['batchAdd'], import: ['import'], update: ['update'], action: ['enable', 'disable'], delete: ['delete'], export: []}
  for (const [id, visible] of Object.entries(expected)) {
    const f = fixture([`data-collect:${id}`])
    try {
      assert.deepEqual(keys(f), visible, id)
      assert.equal(f.actions.canExport.value, id === 'export')
      for (const action of f.actions.batchActions.value) assert.ok(action.permission.startsWith('data-collect:'))
      f.actions.pointActions.batchAdd = false
      assert.ok(!keys(f).includes('batchAdd'), 'permission must not introduce an unsupported protocol capability')
    } finally {f.stop()}
  }
})

test('revoked grants cannot execute captured batch confirmations or open editors', async () => {
  const f = fixture(['add', 'import', 'update', 'action', 'delete', 'export'].map(id => `data-collect:${id}`))
  try {
    const captured = [...f.actions.batchActions.value]
    f.grants.value.clear()
    assert.deepEqual(keys(f), [])
    for (const action of captured) {
      if (action.onClick) await action.onClick()
      else await action.popConfirm.onConfirm()
    }
    await f.actions.exportData()
    assert.equal(f.actions.visible.import, false)
    assert.equal(f.actions.visible.batchUpdate, false)
    assert.deepEqual(f.calls, [])
  } finally {f.stop()}
})

test('authorized selected and all-query deletes keep their original request scopes', async () => {
  const f = fixture(['data-collect:delete'])
  try {
    await f.actions.batchActions.value[0].popConfirm.onConfirm()
    f.selection.all.value = true
    await f.actions.batchActions.value[0].popConfirm.onConfirm()
    assert.deepEqual(f.calls.filter(([action]) => action.startsWith('delete')), [
      ['delete-selected', ['point']], ['delete-all', f.query.value],
    ])
  } finally {f.stop()}
})

test('import, batch edit and export remain independently executable when granted', async () => {
  const f = fixture(['data-collect:import', 'data-collect:update', 'data-collect:export'])
  try {
    f.actions.batchActions.value.find(action => action.key === 'import').onClick()
    f.actions.batchActions.value.find(action => action.key === 'update').onClick()
    assert.equal(f.actions.visible.import, true)
    assert.equal(f.actions.visible.batchUpdate, true)
    await f.actions.exportData()
    assert.deepEqual(f.calls, [['export', 'collector', 'modbus'], ['download']])
    assert.deepEqual(f.selection.selectedKeys.value, ['point'])
  } finally {f.stop()}
})

test('import and export menu definitions preserve the existing write and read authorization sets', () => {
  const menus = JSON.parse(readFileSync(new URL('../baseMenu.json', import.meta.url), 'utf8'))
  const menu = menus.flatMap(item => item.children ?? []).find(item => item.code === 'data-collect')
  const buttons = Object.fromEntries(menu.buttons.map(button => [button.id, button]))
  assert.equal(Object.keys(buttons).length, menu.buttons.length)
  assert.deepEqual(buttons.import.permissions, buttons.add.permissions)
  assert.deepEqual(buttons.export.permissions, buttons.view.permissions)
  assert.ok(buttons.export.permissions.every(permission => permission.actions.every(action => action === 'query')))
})

test('each homepage operation requires its own grant and preserves its original parameters', async () => {
  for (const grant of ['', 'view', 'add', 'update', 'delete', 'import']) {
    const f = fixture(grant ? [`data-collect:${grant}`] : [])
    try {
      f.actions.add()
      assert.equal(f.actions.visible.save, grant === 'add', grant)
      if (grant === 'add') {
        assert.deepEqual(f.actions.current.value, {collectorId: 'collector', provider: 'COLLECTOR_GATEWAY'})
        assert.equal(f.actions.formCollector.value.id, 'collector')
      }
      f.actions.visible.save = false
      f.actions.scan()
      f.actions.view(f.rows.value[0])
      await f.actions.edit(f.rows.value[0])
      assert.equal(f.actions.visible.save, grant === 'update', grant)
      await f.actions.remove(f.rows.value[0])
      const expected = {
        '': [], import: [],
        view: [['jump', 'data-collect/PointDetail', {params: {id: 'point'}, query: {returnTo: '/resources/collectors?scope=collector'}}]],
        add: [['jump', 'data-collect/Scan', {params: {id: 'collector'}}]],
        update: [['point-detail', 'point'], ['collector-detail', 'collector']],
        delete: [['delete-point', 'point'], ['clear'], ['refresh']],
      }
      assert.deepEqual(f.calls, expected[grant], grant)
    } finally {f.stop()}
  }
})

test('captured homepage callbacks cannot run after authorization is revoked', async () => {
  const f = fixture(['add', 'view', 'update', 'delete'].map(key => `data-collect:${key}`))
  try {
    const {add, scan, view, edit, remove} = f.actions
    f.grants.value.clear()
    add(); scan(); view(f.rows.value[0])
    await edit(f.rows.value[0])
    await remove(f.rows.value[0])
    assert.equal(f.actions.visible.save, false)
    assert.equal(f.actions.canView.value, false)
    assert.equal(f.actions.canUpdate.value, false)
    assert.deepEqual(f.calls, [])
  } finally {f.stop()}
})

test('revoking update while point details load prevents the editor from opening', async () => {
  let resolve
  const pending = new Promise(done => {resolve = done})
  const f = fixture(['data-collect:update'], {pointDetail: () => pending})
  try {
    const editing = f.actions.edit(f.rows.value[0])
    assert.equal(f.actions.editing.value, true)
    f.grants.value.clear()
    resolve({success: true, result: {id: 'point'}})
    await editing
    assert.equal(f.actions.visible.save, false)
    assert.equal(f.actions.editing.value, false)
    assert.deepEqual(f.actions.current.value, {})
  } finally {f.stop()}
})

test('the real first-page template binds toolbar, row, detail and live-value permissions', async () => {
  const path = new URL('PointTable.vue', root)
  const {descriptor} = parse(readFileSync(path, 'utf8'), {filename: path.pathname})
  const source = compileScript(descriptor, {id: path.pathname, inlineTemplate: true}).content
  const empty = {__esModule: true, default: {render: () => null}}
  for (const grants of [[], ...['view', 'add', 'update', 'delete', 'import', 'export'].map(key => [`data-collect:${key}`])]) {
    const f = fixture(grants)
    try {
      f.actions.pointActions.scan = true
      const imports = {
        vue, dayjs: {__esModule: true, default: () => {}}, 'vue-i18n': {useI18n: () => ({t: key => key})},
        '@jetlinks-web-core/components/CorePagination': empty,
        '@jetlinks-web-core/components/ConditionFilter': empty,
        '@data-collector-ui/components/RenderComponents': empty,
        '@jetlinks-web-core/components/BatchDropdown/index.vue': {__esModule: true, default: {props: ['actions'], render() {return vue.h('button', {'data-batch': this.actions.map(action => action.key).join(',')}, 'batch')}}},
        '../../data': {ChannelState: {}},
        './columns': {defaultPointColumns: () => [], pointActionColumn: {}, pointSearchFields: []},
        './usePointActions': {usePointActions: () => f.actions},
        './usePointSelection': {usePointSelection: () => f.selection},
        './usePointList': {usePointList: () => ({rows: f.rows, state: f.state, propertyValue: vue.ref(new Map())})},
        './usePointSearch': {usePointSearch: () => ({searchTerms: vue.ref([])})},
        './usePointTableSize': {usePointTableSize: () => ({viewport: vue.ref(), bodyHeight: vue.ref(300)})},
      }
      for (const path of ['./PointTop.vue', './SortsIcon.vue', './ColumnsConfig/index.vue', './components/ValueItem.vue', './Save/index.vue', '../Import/index.vue', './components/BatchUpdate.vue']) imports[path] = empty
      imports['./components/ValueItem.vue'] = {__esModule: true, default: {props: ['canRead', 'canWrite'],
        render() {return vue.h('span', {'data-read': String(this.canRead), 'data-write': String(this.canWrite)})}}}
      const component = load(source, imports).default
      const app = vue.createSSRApp(component)
      const stub = () => null
      for (const name of ['AAlert', 'AButton', 'AIcon', 'CloudEmpty', 'AMenuItem', 'AMenu', 'APopover', 'ATooltip', 'ABadge']) app.component(name, stub)
      app.component('JProTable', {setup(_, {slots}) {return () => vue.h('div', [
        slots.name?.(f.rows.value[0]), slots.action?.(f.rows.value[0]), slots.value?.(f.rows.value[0]),
      ])}})
      for (const name of ['JEllipsis', 'ASpace']) app.component(name, {setup(_, {slots}) {return () => vue.h('span', slots.default?.())}})
      app.component('JPermissionButton', {props: ['hasPermission'], setup(props, {slots}) {return () => props.hasPermission === true || grants.includes(props.hasPermission) ? vue.h('button', {'data-grant': props.hasPermission}, slots.default?.()) : null}})
      app.config.globalProperties.$t = key => key
      const html = await renderToString(app)
      assert.equal(html.includes('data-batch='), keys(f).length > 0)
      for (const grant of ['add', 'update', 'delete', 'export']) {
        assert.equal(html.includes(`data-grant="data-collect:${grant}"`), grants.includes(`data-collect:${grant}`), grant)
      }
      assert.equal((html.match(/data-grant="data-collect:add"/g) ?? []).length, grants.includes('data-collect:add') ? 2 : 0)
      assert.equal(html.includes('<a>'), grants.includes('data-collect:view'))
      assert.ok(html.includes('point-name'), 'the name remains visible without detail authorization')
      assert.ok(html.includes(`data-read="${grants.includes('data-collect:view')}"`))
      assert.ok(html.includes(`data-write="${grants.includes('data-collect:update')}"`))
      f.actions.pointActions.add = false
      f.actions.pointActions.scan = false
      const noCapabilityApp = vue.createSSRApp(component)
      Object.assign(noCapabilityApp._context.components, app._context.components)
      noCapabilityApp.config.globalProperties.$t = key => key
      assert.ok(!(await renderToString(noCapabilityApp)).includes('data-grant="data-collect:add"'), 'authorization must not enable an unsupported protocol capability')
    } finally {f.stop()}
  }
})
