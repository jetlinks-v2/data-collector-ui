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

function objectEditor(kind='channel', update=async()=>({success:true})) {
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
  const editor=scope.run(()=>useObjectConfiguration({kind,value,channels:[],providers:[{id:'example',name:'Example'}]},()=>saved++))
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

test('folding settings preserves both editor scopes; leaving a dirty collector still requires a decision',async()=>{
  let confirmations=0,leave=false
  const data={collector:vue.ref({id:'one'}),points:vue.ref([]),selectedPoint:vue.ref(),selectedPointId:vue.ref(''),paused:vue.ref(false),observation:vue.ref(),select:value=>{data.collector.value=value}}
  const batch={busy:vue.ref(false),state:vue.ref({selecting:false})}
  const {useCollectionWorkspace}=load('useCollectionWorkspace',{
    vue:{...vue,provide(){},onMounted(){},onBeforeUnmount(){}},'vue-i18n':translations,
    'vue-router':{onBeforeRouteLeave(){}},'ant-design-vue':{Modal:{confirm:options=>{confirmations++;leave?options.onOk():options.onCancel()}}},
    './useWorkspaceData':{useWorkspaceData:()=>data},'./useWorkspaceRuntime':{useWorkspaceRuntime:()=>({close(){}})},
    './usePointDraft':{usePointDraft:()=>({hasChanges:vue.ref(false),saving:vue.ref(false)})},'./useWorkspaceActions':{useWorkspaceActions:()=>batch},'../data':{},
  })
  const previous=globalThis.window,previousDocument=globalThis.document
  globalThis.window={addEventListener(){},removeEventListener(){}}
  globalThis.document={getElementById(){}}
  const scope=vue.effectScope()
  try {
    const workspace=scope.run(()=>useCollectionWorkspace()),channel=vue.reactive({dirty:true,saving:false})
    workspace.editObject('channel');workspace.registerObjectEditor('channel',channel)
    workspace.editObject('collector');workspace.editObject()
    assert.deepEqual(workspace.objectEditorKinds.value,['channel','collector']);assert.equal(channel.dirty,true)
    assert.equal(confirmations,0,'folding does not discard or prompt')
    workspace.editObject('channel');workspace.inline.value=true;workspace.editingId.value='point'
    workspace.selectPoint('point')
    assert.equal(workspace.objectForm.value,undefined);assert.equal(workspace.editingId.value,'point')
    await workspace.select({id:'one'});assert.equal(confirmations,0,'same collector preserves drafts')
    await workspace.select({id:'two'});assert.equal(data.collector.value.id,'one');assert.equal(confirmations,1)
    channel.saving=true;workspace.editObject('collector');workspace.selectPoint('other')
    assert.equal(workspace.editingId.value,'point','saving locks conflicting switches')
    channel.saving=false;leave=true;await workspace.select({id:'two'})
    assert.equal(data.collector.value.id,'two');assert.deepEqual(workspace.objectEditorKinds.value,[])
  } finally {scope.stop();globalThis.window=previous;globalThis.document=previousDocument}
})
