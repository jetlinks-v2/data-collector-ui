import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { transformSync } from 'esbuild'
import * as vue from 'vue'
import * as lodash from 'lodash-es'

const require = createRequire(import.meta.url)
const translations = { useI18n: () => ({ t: key => key }) }
function load(name, mocks) {
  const module = { exports: {} }
  const source = readFileSync(new URL(`../views/data-collect/hook/${name}.ts`, import.meta.url), 'utf8')
  new Function('require', 'module', 'exports', transformSync(source, { loader:'ts', format:'cjs' }).code)(id => id in mocks ? mocks[id] : require(id), module, module.exports)
  return module.exports
}
const settle = async () => { await Promise.resolve(); await vue.nextTick(); await Promise.resolve() }

function objectEditor(kind='channel', update=async()=>({success:true}), draft) {
  const calls=[], injections=new Map()
  let saved=0
  const save=async (id,payload)=>{calls.push({id,payload});return update(id,payload)}
  const {useObjectConfiguration}=load('useObjectConfiguration',{
    vue:{...vue,provide:(key,value)=>injections.set(key,value),onBeforeUnmount:vue.onScopeDispose},
    'lodash-es':lodash,'vue-i18n':translations,'@jetlinks-web/utils':{onlyMessage(){}},
    '../../../api/data-collect/channel':{update:save},
    '../../../api/data-collect/collector':{update:save,queryPointMetadata:async()=>({success:true,result:{}})},
    '../../../utils/utils':{devGetProtocol:async()=>'<template><div /></template>'},'../data':{},
  })
  const value={id:'object',name:'Original',provider:'example',configuration:{host:'192.0.2.1'},managedConfiguration:{diagnosticsEnabled:true},features:[],accessModes:['read'],interval:1000}
  const scope=vue.effectScope()
  const editor=scope.run(()=>useObjectConfiguration({kind,value,channels:[],providers:[{id:'example',name:'Example'}],draft},()=>saved++))
  return {editor,scope,calls,injections,saved:()=>saved}
}

test('restoring a configuration keeps its injected model and resets plugin-local field references',async()=>{
  const state=objectEditor()
  try {
    await settle(); state.editor.ready()
    const model=state.editor.model
    model.name='Draft';model.configuration.host='192.0.2.2';model.configuration.extra=true
    assert.equal(state.editor.dirty.value,true)
    state.editor.restore()
    assert.equal(state.editor.model,model)
    assert.equal(state.injections.get('plugin-form'),model)
    assert.equal(model.name,'Original');assert.deepEqual(model.configuration,{host:'192.0.2.1'})
    assert.equal(state.editor.dirty.value,false);assert.equal(state.editor.formRevision.value,1)
    assert.equal(state.editor.providerLabel.value,'Example');assert.deepEqual(state.calls,[])
  } finally {state.scope.stop()}
})

test('failed apply preserves the complete draft; successful apply uses the existing collector template contract',async()=>{
  let failed=true
  const state=objectEditor('collector',async()=>({success:!failed,message:'failed'}))
  try {
    await settle();state.editor.ready();state.editor.model.name='Draft';state.editor.model.interval=250
    await state.editor.save(async()=>{})
    assert.equal(state.editor.saveError.value,'failed');assert.equal(state.editor.dirty.value,true)
    assert.equal(state.editor.model.interval,250);assert.equal(state.saved(),0)
    failed=false;await state.editor.save(async()=>{})
    assert.equal(state.editor.dirty.value,false);assert.equal(state.saved(),1)
    assert.equal(state.calls[1].payload.configuration.template.interval,250)
    assert.equal(state.calls[1].payload.interval,undefined)
    assert.equal(state.calls[1].payload.configuration.host,'192.0.2.1')
  } finally {state.scope.stop()}
})

test('an acknowledgement never marks changes made after the sent snapshot as applied',async()=>{
  let resolve
  const state=objectEditor('channel',()=>new Promise(done=>{resolve=done}))
  try {
    await settle();state.editor.ready();state.editor.model.name='Sent'
    const saving=state.editor.save(async()=>{});await settle()
    state.editor.model.name='Still a draft';resolve({success:true});await saving
    assert.equal(state.calls[0].payload.name,'Sent');assert.equal(state.editor.dirty.value,true)
  } finally {state.scope.stop()}
})

test('folding and navigating preserve configuration drafts while only the current editor remains mounted',async()=>{
  let confirmations=0,leave=false,leaveRoute
  const one={id:'one',configuration:{}},two={id:'two',configuration:{}},channelValue={id:'channel',configuration:{host:'original'}}
  const data={orderHeld:vue.ref(false),collector:vue.ref(one),collectors:vue.ref([one,two]),channels:vue.ref([channelValue]),points:vue.ref([]),selectedPoint:vue.ref(),selectedPointId:vue.ref(''),paused:vue.ref(false),observation:vue.ref(),select:value=>{data.collector.value=value}}
  const batch={busy:vue.ref(false),state:vue.ref({selecting:false})}
  const {useCollectionWorkspace}=load('useCollectionWorkspace',{
    vue:{...vue,provide(){},onMounted(){},onBeforeUnmount(){}},'vue-i18n':translations,
    'vue-router':{onBeforeRouteLeave:callback=>{leaveRoute=callback}},'ant-design-vue':{Modal:{confirm:options=>{confirmations++;leave?options.onOk():options.onCancel()}}},
    './useWorkspaceData':{useWorkspaceData:()=>data},'./useWorkspaceRuntime':{useWorkspaceRuntime:()=>({close(){}})},
    './usePointDraft':{usePointDraft:()=>({hasChanges:vue.ref(false),saving:vue.ref(false)})},'./useWorkspaceActions':{useWorkspaceActions:()=>batch},'../data':{},
  })
  const previous=globalThis.window,previousDocument=globalThis.document
  globalThis.window={addEventListener(){},removeEventListener(){}}
  globalThis.document={getElementById(){}}
  const scope=vue.effectScope()
  try {
    const workspace=scope.run(()=>useCollectionWorkspace()),channel=vue.reactive({dirty:true,saving:false,snapshot:()=>({model:{...channelValue,configuration:{host:'draft'}},baseline:channelValue})})
    const target={kind:'channel',object:channelValue,anchor:{},surface:'channel'}
    workspace.editObject(target);workspace.objectEditor.value=channel
    workspace.editObject({kind:'collector',object:one,anchor:{},surface:'header'});workspace.editObject()
    assert.equal(workspace.objectEditor.value,undefined,'the previous plugin component is released')
    assert.equal(channel.dirty,true)
    assert.equal(confirmations,0,'folding does not discard or prompt')
    workspace.editObject(target);assert.equal(workspace.objectDraft.value.model.configuration.host,'draft')
    workspace.objectEditor.value=channel;workspace.inline.value=true;workspace.editingId.value='point'
    workspace.selectPoint('point')
    assert.equal(workspace.objectForm.value,undefined);assert.equal(workspace.editingId.value,'point')
    await workspace.select({id:'one'});assert.equal(confirmations,0,'same collector preserves drafts')
    channel.saving=true;workspace.editObject({kind:'collector',object:one,anchor:{},surface:'header'});workspace.selectPoint('other')
    assert.equal(workspace.editingId.value,'point','saving locks conflicting switches')
    channel.saving=false;await workspace.select(two)
    assert.equal(data.collector.value.id,'two');assert.equal(workspace.objectTarget.value,undefined);assert.equal(confirmations,0)
    workspace.editObject(target);assert.equal(workspace.objectDraft.value.model.configuration.host,'draft')
    assert.equal(await leaveRoute(),false,'leaving the page still protects cached drafts')
    leave=true;assert.equal(await leaveRoute(),true)
  } finally {scope.stop();globalThis.window=previous;globalThis.document=previousDocument}
})

test('restoring a cached plugin keeps the saved baseline and reports connection changes independently of labels',async()=>{
  const first=objectEditor()
  let cached
  try {
    await settle();first.editor.ready();first.editor.model.name='Draft name'
    assert.equal(first.editor.connectionChanged.value,false)
    first.editor.model.configuration.host='192.0.2.2';cached=first.editor.snapshot()
  } finally {first.scope.stop()}
  const reopened=objectEditor('channel',async()=>({success:true}),cached)
  try {
    await settle();reopened.editor.ready()
    assert.equal(reopened.editor.dirty.value,true)
    assert.equal(reopened.editor.connectionChanged.value,true)
    assert.equal(reopened.editor.model.configuration.host,'192.0.2.2')
    reopened.editor.restore();reopened.editor.ready()
    assert.equal(reopened.editor.model.name,'Original');assert.equal(reopened.editor.dirty.value,false)
  } finally {reopened.scope.stop()}
})

test('a pending validation locks the apply action before any network write',async()=>{
  const state=objectEditor()
  let finish
  try {
    await settle();state.editor.ready();state.editor.model.name='Draft'
    const pending=state.editor.save(()=>new Promise(resolve=>{finish=resolve}))
    assert.equal(state.editor.saving.value,true)
    await state.editor.save(async()=>{})
    assert.equal(state.calls.length,0)
    finish();await pending
    assert.equal(state.calls.length,1);assert.equal(state.editor.saving.value,false)
  } finally {state.scope.stop()}
})

test('the first display waits for the plugin while restore keeps the prepared editor visible',async()=>{
  const state=objectEditor()
  try {
    await settle()
    assert.equal(state.editor.prepared.value,false,'fetching the Vue source does not mean its layout is ready')
    state.editor.ready()
    assert.equal(state.editor.prepared.value,true)
    state.editor.model.name='Draft';state.editor.restore()
    assert.equal(state.editor.pluginReady.value,false,'restore still waits before another apply')
    assert.equal(state.editor.prepared.value,true,'restore must not close and reopen the overlay')
    state.editor.ready()
    assert.equal(state.editor.prepared.value,true)
  } finally {state.scope.stop()}
})
