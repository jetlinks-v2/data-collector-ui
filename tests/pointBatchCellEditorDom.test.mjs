import test, {after} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync,existsSync} from 'node:fs'
import {createRequire} from 'node:module'
import {dirname,resolve} from 'node:path'
import {transformSync} from 'esbuild'
import {parse,compileScript,compileTemplate} from 'vue/compiler-sfc'
import {JSDOM} from 'jsdom'

const dom=new JSDOM('<body></body>',{pretendToBeVisual:true,url:'http://localhost/'})
dom.window.matchMedia=query=>({media:query,matches:false,addListener(){},removeListener(){}})
for(const name of ['window','document','navigator','Element','HTMLElement','Node','SVGElement','ShadowRoot','MutationObserver','getComputedStyle','requestAnimationFrame','cancelAnimationFrame']) {
  const value=['getComputedStyle','requestAnimationFrame','cancelAnimationFrame'].includes(name)?dom.window[name].bind(dom.window):dom.window[name]
  Object.defineProperty(globalThis,name,{value,configurable:true})
}
after(()=>dom.window.close())
// Load runtime-dom and the production Ant control after DOM globals are present.
const vue=await import('vue'),require=createRequire(import.meta.url)
const Switch=require('ant-design-vue/lib/switch').default
const TextArea=require('ant-design-vue/lib/input/TextArea').default
const Select=require('ant-design-vue/lib/select').default,Tag=require('ant-design-vue/lib/tag').default
const Form=require('ant-design-vue/lib/form').default,FormItem=require('ant-design-vue/lib/form/FormItem').default
const Modal=require('ant-design-vue/lib/modal').default
const moduleRoot=resolve(import.meta.dirname,'..'),words=JSON.parse(readFileSync(resolve(moduleRoot,'locales/lang/zh.json'),'utf8'))
const t=key=>key.split('.').reduce((value,name)=>value?.[name],words) || key
const passthrough={setup:(_, {slots})=>()=>vue.h('span',slots.default?.())}
function loader(overrides={}) {
  const cache=new Map()
  function load(filename) {
    filename=resolve(moduleRoot,filename)
    if(cache.has(filename))return cache.get(filename)
    let source=readFileSync(filename,'utf8')
    if(filename.endsWith('.vue')){const {descriptor}=parse(source,{filename});source=compileScript(descriptor,{id:'batch-dom',inlineTemplate:true}).content}
    const module={exports:{}}
    new Function('require','module','exports',transformSync(source,{loader:'ts',format:'cjs'}).code)(name=>{
      if(name==='vue')return vue
      if(name==='vue-i18n')return {useI18n:()=>({t})}
      if(name==='@jetlinks-web-core/components')return {SelectOption:load('../../jetlinks-web-core/src/components/SelectOption/index.vue').default}
      if(Object.hasOwn(overrides,name))return overrides[name]
      if(name.startsWith('.')){let path=resolve(dirname(filename),name);if(!existsSync(path))path+='.ts';return load(path)}
      return require(name)
    },module,module.exports)
    cache.set(filename,module.exports);return module.exports
  }
  return load
}
function mount(component,components={}) {
  const container=document.createElement('div');document.body.append(container)
  const app=vue.createApp(component)
  app.config.globalProperties.$t=t
  app.component('a-form',Form).component('a-form-item',FormItem).component('a-select',Select).component('a-tag',Tag).component('a-tooltip',passthrough).component('a-checkbox',passthrough).component('a-input',passthrough).component('a-button',passthrough).component('a-empty',passthrough).component('AIcon',{render:()=>null})
  for(const [name,control] of Object.entries(components))app.component(name,control)
  app.mount(container)
  return {container,close(){app.unmount();container.remove()}}
}
function mouse(target,type){target.dispatchEvent(new dom.window.MouseEvent(type,{bubbles:true,composed:true}))}
const settle=async()=>{await Promise.resolve();await vue.nextTick()}

test('point lookup waits for the actual Ant modal close callback before moving focus',async()=>{
  const Lookup=loader()('views/data-collect/components/workspace/WorkspacePointLookup.vue').default
  let completed=0
  const state={open:vue.ref(true),keyword:vue.ref(''),loading:vue.ref(false),locating:vue.ref(false),error:vue.ref(''),total:vue.ref(0),results:vue.ref([]),collectorNames:vue.ref(new Map()),destination:vue.ref('target'),search(){},choose(){},finishLocate(){completed++}}
  const NoMotionModal={inheritAttrs:false,setup:(_,{attrs,slots})=>()=>vue.h(Modal,{...attrs,transitionName:'',maskTransitionName:''},slots)}
  const page=mount({setup:()=>()=>vue.h(Lookup,{state})},{'a-modal':NoMotionModal,'a-input-search':passthrough,'a-spin':passthrough})
  try {
    await settle();assert.equal(completed,0)
    state.open.value=false;await settle();await new Promise(resolve=>setTimeout(resolve,50));await settle()
    assert.equal(completed,1)
  } finally {page.close()}
})

test('the real AntSwitch survives mouseup blur until click, then commits both true and false on exit',async()=>{
  const CellEditor=loader()('views/data-collect/components/workspace/PointBatchCellEditor.vue').default
  for(const initial of [true,false]) {
    const active=vue.ref(true),buffer=vue.ref(initial);let commits=0,saved=initial
    const column={dataIndex:'flag',form:{name:['configuration','flag']},template:{components:vue.markRaw(Switch),check:true}}
    const page=mount({setup:()=>()=>vue.h('div',[active.value?vue.h(CellEditor,{column,value:buffer.value,record:{configuration:{flag:initial}},'onUpdate:value':value=>{buffer.value=value},onCommit:()=>{saved=buffer.value;commits++;active.value=false}}):null,vue.h('button',{'data-outside':true},'outside')])})
    try {
      const control=page.container.querySelector('[role="switch"]')
      assert.equal(control.getAttribute('aria-checked'),String(initial))
      mouse(control,'pointerdown');mouse(control,'mousedown');control.focus();mouse(control,'mouseup')
      await settle()
      assert.equal(active.value,true);assert.equal(commits,0);assert.equal(document.activeElement,document.body)
      mouse(control,'click');await settle()
      assert.equal(buffer.value,!initial);assert.equal(control.getAttribute('aria-checked'),String(!initial));assert.equal(commits,0)
      const popup=document.createElement('div');popup.className='ant-select-dropdown';popup.innerHTML='<input />';document.body.append(popup)
      try{mouse(popup.firstChild,'pointerdown');popup.firstChild.focus();mouse(popup.firstChild,'click');await settle();assert.equal(commits,0)}finally{popup.remove()}
      const outside=page.container.querySelector('[data-outside]');mouse(outside,'pointerdown');mouse(outside,'mousedown');outside.focus();mouse(outside,'mouseup');mouse(outside,'click');await settle()
      assert.equal(saved,!initial);assert.equal(commits,1);assert.equal(active.value,false)
    }finally{page.close()}
  }
})

test('grid summaries distinguish default, missing and inapplicable settings while preserving invalid input and its error',async()=>{
  const point={id:'p',name:'Temperature',pointKey:'temperature',configuration:{},managedConfiguration:{codec:'int16'},accessModes:['subscribe'],interval:1000}
  const row={key:'p',point,address:'',baseline:structuredClone(point)},rows=vue.ref([row])
  const grid={window:rows,top:vue.ref(0),bottom:vue.ref(0),start:vue.ref(0),selected:vue.ref(new Set()),allVisible:vue.ref(false),someVisible:vue.ref(false),active:vue.ref(),editable:()=>true,decoding:{codecs:vue.ref([]),error:vue.ref(''),loading:vue.ref(false),capabilities:vue.ref({})},scroll(){},paste(){},keyboard(){}}
  const stub={__esModule:true,default:passthrough}
  const load=loader({'../../hook/usePointBatchGrid':{usePointBatchGrid:()=>grid},'../../../../components/ConfigSelect.vue':stub,'./PointBatchColumnFilter.vue':stub,'./PointBatchCellEditor.vue':stub})
  const {pointBatchGridColumns}=load('utils/pointBatchColumns.ts')
  const state={rows,visibleRows:rows,columns:vue.ref(pointBatchGridColumns(undefined,t)),adapter:vue.ref(),codecCatalog:{codecs:vue.ref([])},accessModes:vue.ref(['read']),issues:vue.ref(new Map([['p',[]]])),filters:vue.ref({}),saving:vue.ref(false),message:error=>'error: '+error}
  state.displayColumns=state.columns
  const Grid=load('views/data-collect/components/workspace/PointBatchGrid.vue').default,page=mount({setup:()=>()=>vue.h(Grid,{state})})
  try {
    const cells=[...page.container.querySelectorAll('tbody .cw-batch-cell')]
    assert.ok(cells.some(cell=>cell.textContent===words.collectorOptions.subscribe));assert.equal(cells.some(cell=>cell.textContent==='subscribe'),false)
    assert.equal(page.container.querySelector('.cw-batch-default')?.textContent,'默认')
    assert.equal(page.container.querySelector('.cw-batch-default')?.title,words.collectorBatch.defaultLayoutHint)
    assert.equal(point.managedConfiguration.byteLayout,undefined)
    delete rows.value[0].point.managedConfiguration.codec;await settle()
    assert.ok([...page.container.querySelectorAll('.cw-batch-cell')].some(cell=>cell.textContent===words.collectorBatch.pluginType))
    state.adapter.value={isAutoCodec:()=>true};grid.editable=key=>!['codec','byteLayout'].includes(key);await settle()
    const native=[...page.container.querySelectorAll('.cw-batch-cell')]
    assert.ok(native.some(cell=>cell.textContent===words.collectorBatch.automaticType && cell.disabled && cell.title===words.collectorBatch.typeReadOnly))
    assert.ok(native.some(cell=>cell.textContent===words.collectorBatch.notApplicable && cell.disabled && cell.title===words.collectorBatch.typeReadOnly))
    rows.value[0].inputs={byteLayout:'invalid raw layout'};rows.value[0].fieldErrors={byteLayout:'invalid layout'};await settle()
    const invalid=[...page.container.querySelectorAll('.cw-batch-cell')].find(cell=>cell.textContent==='invalid raw layout')
    assert.equal(invalid?.title,'error: invalid layout')
    assert.equal(point.managedConfiguration.byteLayout,undefined)
  }finally{page.close()}
})

test('real access selection translates an existing value absent from candidates without making it selectable',async()=>{
  const ConfigSelect=loader()('components/ConfigSelect.vue').default,value=vue.ref(['subscribe']),options=[{value:'read',label:'读取'}]
  const page=mount({setup:()=>()=>vue.h(ConfigSelect,{value:value.value,options,kind:'access',mode:'multiple',open:true,virtual:false,getPopupContainer:trigger=>trigger.parentElement,'onUpdate:value':next=>{value.value=next}})})
  try {
    await settle()
    const tag=page.container.querySelector('.collector-config-access-tag')
    assert.equal(tag.querySelector('.collector-config-selection').textContent,words.collectorOptions.subscribe)
    assert.deepEqual([...page.container.querySelectorAll('.ant-select-item-option-content')].map(option=>option.textContent),[words.collectorOptions.read+words.collectorOptions.readHint])
    const close=tag.querySelector('.ant-tag-close-icon');assert.ok(close)
    mouse(close,'click');await settle();assert.deepEqual(value.value,[])
    assert.equal(page.container.querySelector('.collector-config-access-tag'),null)
    assert.deepEqual(options,[{value:'read',label:'读取'}])
    assert.equal(page.container.querySelectorAll('.ant-select-item-option-content').length,1)
  }finally{page.close()}
})

test('real select preserves remapped numeric zero, false labels and custom values without changing candidate records',async()=>{
  const ConfigSelect=loader()('components/ConfigSelect.vue').default,value=vue.ref(0)
  const options=[{id:0,name:false,disabled:false},{id:'custom-value',name:'Custom',disabled:false}],before=structuredClone(options)
  const page=mount({setup:()=>()=>vue.h(ConfigSelect,{value:value.value,options,fieldNames:{value:'id',label:'name'},open:true,virtual:false,getPopupContainer:trigger=>trigger.parentElement,'onUpdate:value':next=>{value.value=next}})})
  try {
    await settle()
    assert.equal(page.container.querySelector('.ant-select-selection-item .collector-config-selection').textContent,'false')
    const candidates=[...page.container.querySelectorAll('.ant-select-item-option')]
    assert.deepEqual(candidates.map(option=>option.querySelector('.ant-select-item-option-content').textContent),['false','Custom'])
    mouse(candidates[1],'click');await settle();assert.equal(value.value,'custom-value')
    value.value=0;await settle()
    assert.equal(page.container.querySelector('.ant-select-selection-item .collector-config-selection').textContent,'false')
    assert.deepEqual(options,before)
  }finally{page.close()}
})

test('the actual point editor translates a saved subscription absent from candidates and retains removal',async()=>{
  const stub={__esModule:true,default:passthrough},capabilities=vue.ref({autoCodec:true,accessModes:[{value:'read'}]})
  const load=loader({
    '@jetlinks-web-core/components/IconValue':{IconValueEditor:passthrough},
    './EditorIconPicker.vue':stub,
    './RuntimeCardMetrics.vue':stub,'./PointValueDisplay.vue':stub,'./PointReadFeedback.vue':stub,
    '../../hook/usePointPlugin':{usePointPlugin:()=>({loading:vue.ref(false),error:vue.ref(''),source:vue.ref(),capabilities})},
    '../../../../components/RenderComponents':stub,'./PointDecoding.vue':stub,'./ProcessingRules.vue':stub,'./WorkspaceIcon.vue':stub,
    '../../../../api/data-collect/collector':{_validateField:async()=>({success:true})},
  })
  const PointEditor=load('views/data-collect/components/workspace/PointEditor.vue').default
  const model=vue.reactive({id:'point',name:'Verify_Counter',pointKey:'counter',provider:'test',configuration:{},accessModes:['subscribe']})
  const page=mount({setup:()=>()=>vue.h(PointEditor,{model,collector:{id:'collector',name:'Collector',configuration:{}},dirty:false,saving:false})},{'a-popover':passthrough,'a-spin':passthrough,'a-input-number':passthrough,'a-textarea':TextArea,'j-permission-button':passthrough})
  try {
    await settle()
    assert.equal(model.description,undefined)
    const notes=page.container.querySelector('textarea[aria-label="备注"]')
    assert.ok(notes)
    // Ant TextArea limits characters itself to preserve composed input and emoji.
    notes.value='备'.repeat(256);notes.dispatchEvent(new dom.window.Event('input',{bubbles:true}));await settle()
    assert.equal(model.description,'备'.repeat(255))
    notes.value='检修后核对温度探头';notes.dispatchEvent(new dom.window.Event('input',{bubbles:true}));await settle()
    assert.equal(model.description,'检修后核对温度探头')
    notes.value='';notes.dispatchEvent(new dom.window.Event('input',{bubbles:true}));await settle();assert.equal(model.description,'')
    const access=page.container.querySelector('.cw-point-settings .ant-select')
    assert.equal(access.querySelector('.collector-config-access-tag .collector-config-selection').textContent,words.collectorOptions.subscribe)
    mouse(access.querySelector('.ant-select-selector'),'mousedown');await settle()
    assert.deepEqual([...document.body.querySelectorAll('.collector-config-options .ant-select-item-option-content')].map(option=>option.textContent),[words.collectorOptions.read+words.collectorOptions.readHint])
    mouse(access.querySelector('.ant-tag-close-icon'),'click');await settle();assert.deepEqual(model.accessModes,[])
    assert.deepEqual(capabilities.value.accessModes,[{value:'read'}])
    model.accessModes=['subscribe'];await settle()
    assert.equal(access.querySelector('.collector-config-access-tag .collector-config-selection').textContent,words.collectorOptions.subscribe)
  }finally{page.close()}
})

test('the real diagnostic trigger names its action and retains hover, pinned and outside-close behavior',async()=>{
  const DiagnosticTrigger=loader()('views/data-collect/components/workspace/DiagnosticTrigger.vue').default
  const open=vue.ref(false),visibility=[]
  const Popover={props:['open','trigger'],emits:['openChange'],setup(props,{slots,emit}){assert.deepEqual(props.trigger,['hover','focus']);return ()=>vue.h('div',{'data-popover':true,onMouseenter:()=>emit('openChange',true),onMouseleave:()=>emit('openChange',false)},[slots.default?.(),props.open?slots.content?.():null])}}
  const Icon={props:['type'],setup:props=>()=>vue.h('span',{class:'anticon','data-icon':props.type})}
  const page=mount({setup:()=>()=>vue.h(DiagnosticTrigger,{open:open.value,label:'运行诊断',onVisibility:value=>{visibility.push(value);open.value=value}},()=>vue.h('span',{'data-recording':true},'Recent execution'))},{'a-popover':Popover,AIcon:Icon})
  try {
    const button=page.container.querySelector('.cw-diagnostic-trigger'),popover=page.container.querySelector('[data-popover]')
    assert.equal(button.type,'button');assert.equal(button.title,'运行诊断');assert.equal(button.getAttribute('aria-label'),'运行诊断')
    assert.equal(button.querySelector('[data-icon]')?.dataset.icon,'FileSearchOutlined')
    mouse(popover,'mouseenter');await settle();assert.equal(open.value,true)
    mouse(popover,'mouseleave');await settle();assert.equal(open.value,false)
    mouse(button,'click');await settle();assert.equal(button.getAttribute('aria-expanded'),'true')
    mouse(popover,'mouseleave');await settle();assert.equal(open.value,true)
    mouse(page.container.querySelector('[data-recording]'),'pointerdown');await settle();assert.equal(open.value,true)
    mouse(document.body,'pointerdown');await settle();assert.equal(open.value,false)
    assert.deepEqual(visibility,[true,false,true,false])
  }finally{page.close()}
})

test('the actual workspace context keeps the same plugin tools and adapter while entering and leaving batch editing',async()=>{
  const {descriptor}=parse(readFileSync(resolve(moduleRoot,'views/data-collect/index.vue'),'utf8'))
  function context(node){if(node.type===1 && node.props.some(prop=>prop.type===6 && prop.name==='class' && prop.value?.content.split(' ').includes('cw-context-bar')))return node;for(const child of node.children || []){const found=context(child);if(found)return found}}
  const source=context(descriptor.template.ast)?.loc.source;assert.ok(source)
  const compiled=compileTemplate({source,filename:'WorkspaceContextHarness.vue',id:'workspace-context'});assert.deepEqual(compiled.errors,[])
  const module={exports:{}}
  new Function('require','module','exports',transformSync(compiled.code,{format:'cjs'}).code)(name=>name==='vue'?vue:require(name),module,module.exports)
  const open=vue.ref(false),pointTools=vue.ref(),adapter=vue.markRaw({getAddress:()=>''});let mounts=0,unmounts=0
  const Tools={setup(_,{expose}){expose({batchAdapter:adapter});vue.onMounted(()=>mounts++);vue.onBeforeUnmount(()=>unmounts++);return ()=>vue.h('span',{'data-tools':true},'Tools')}}
  const Action={inheritAttrs:false,setup:(_,{attrs,slots})=>()=>vue.h('button',attrs,slots.default?.())}
  const page=mount({setup:()=>({collector:vue.ref({id:'collector',name:'Collector',channelName:'Channel'}),channel:vue.ref(),batchEditor:{open},pointTools,inline:true,batchBusy:false,saving:false,pointLoading:false,ordering:false,batchEntryLabel:'编辑全部 · 17',draft:{hasCurrentChanges:vue.ref(false)},data:{loadPoints(){},trial(){}},enterBatch:()=>{open.value=true},addPoint(){}}),render:module.exports.render},{WorkspacePointTools:Tools,RuntimeCardMetrics:passthrough,WorkspaceStatus:passthrough,'j-permission-button':Action})
  try {
    await settle()
    const tools=page.container.querySelector('[data-tools]'),instance=pointTools.value
    assert.equal(mounts,1);assert.equal(instance.batchAdapter,adapter)
    mouse([...page.container.querySelectorAll('button')].find(button=>button.textContent==='编辑全部 · 17'),'click');await settle()
    assert.equal(open.value,true);assert.equal(page.container.querySelector('.cw-head-actions').style.display,'none')
    assert.equal(pointTools.value,instance);assert.equal(pointTools.value.batchAdapter,adapter);assert.equal(page.container.querySelector('[data-tools]'),tools)
    open.value=false;await settle()
    assert.notEqual(page.container.querySelector('.cw-head-actions').style.display,'none')
    assert.equal(pointTools.value,instance);assert.equal(pointTools.value.batchAdapter,adapter);assert.equal(mounts,1);assert.equal(unmounts,0)
  }finally{page.close()}
})

test('scalar and array values preview on hover or focus, pin on click and keep position during frequent updates',async()=>{
  for(const initial of [12.5,[true,false,true]]) {
    const point=vue.ref({id:'point',collectorId:'collector',name:'Temperature',latest:{parsedData:initial}})
    let subscriptions=0,disposed=0
    const load=loader({'../../../api/data-collect/workspace':{observePointValues:()=>({subscribe(observer){subscriptions++;observer.next([{hex:'0102'}]);return {unsubscribe(){disposed++}}}})}})
    const Value=load('views/data-collect/components/workspace/PointValueDisplay.vue').default
    const Popover={props:['open','trigger','overlayStyle','placement','arrow'],emits:['openChange'],setup(props,{slots,emit}){assert.deepEqual(props.trigger,['hover','focus']);assert.equal(props.arrow,true);return ()=>vue.h('div',{'data-value-popover':true,'data-placement':props.placement,style:props.overlayStyle,onMouseenter:()=>emit('openChange',true),onMouseleave:()=>emit('openChange',false),onFocusin:()=>emit('openChange',true)},[slots.default?.(),props.open?slots.content?.():null])}}
    const Group={props:['value'],emits:['update:value'],setup(_,{slots}){return ()=>vue.h('div',{'data-view-group':true},slots.default?.())}}
    const page=mount({setup:()=>()=>vue.h(Value,{point:point.value,emptyText:'等待数据'})},{'a-popover':Popover,'a-radio-group':Group,'a-radio-button':passthrough})
    try {
      const popover=page.container.querySelector('[data-value-popover]'),trigger=page.container.querySelector('.cw-value-trigger')
      const anchor=page.container.querySelector('.cw-value-anchor'),up=Array.isArray(initial)
      anchor.getBoundingClientRect=()=>({left:100,right:180,top:up?window.innerHeight-60:200,bottom:up?window.innerHeight-32:228})
      mouse(popover,'mouseenter');await settle();assert.ok(page.container.querySelector('.cw-value-inspector'))
      assert.equal(popover.style.getPropertyValue('--cw-panel-top'),up?'auto':'236px')
      assert.equal(popover.style.getPropertyValue('--cw-panel-bottom'),up?'68px':'auto')
      assert.equal(popover.getAttribute('data-placement'),up?'topLeft':'bottomLeft')
      assert.equal(anchor.classList.contains('is-open'),true)
      const position=popover.getAttribute('style')
      assert.equal(subscriptions,0)
      // Content updates do not invoke positioning or open more data subscriptions.
      for(let index=0;index<100;index++){point.value.latest={parsedData:Array.isArray(initial)?[false,true,index%2===0]:index};await settle()}
      assert.equal(subscriptions,0);assert.equal(trigger.getAttribute('aria-expanded'),'true');assert.equal(popover.getAttribute('style'),position)
      mouse(popover,'mouseleave');await settle();assert.equal(page.container.querySelector('.cw-value-inspector'),null)
      assert.equal(anchor.classList.contains('is-open'),false)
      trigger.dispatchEvent(new dom.window.FocusEvent('focusin',{bubbles:true}));await settle();assert.ok(page.container.querySelector('.cw-value-inspector'))
      mouse(trigger,'click');await settle();mouse(popover,'mouseleave');await settle();assert.ok(page.container.querySelector('.cw-value-inspector'))
      mouse(page.container.querySelector('.cw-value-inspector'),'pointerdown');await settle();assert.ok(page.container.querySelector('.cw-value-inspector'))
      const group=page.container.querySelector('[data-view-group]').__vueParentComponent
      group.emit('update:value','bytes');await settle();assert.equal(subscriptions,1)
      document.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));await settle()
      assert.equal(page.container.querySelector('.cw-value-inspector'),null);assert.equal(disposed,1);assert.equal(document.activeElement,Array.isArray(initial)?page.container.querySelector('.cw-value-strip'):trigger)
      mouse(trigger,'click');await settle();mouse(document.body,'pointerdown');await settle();assert.equal(page.container.querySelector('.cw-value-inspector'),null)
    }finally{page.close()}
  }
})
