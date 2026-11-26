import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import * as vue from 'vue'
import { transformSync } from 'esbuild'

function fixture(objectMode=false) {
  const saved=new Map(['window','document','Node','ResizeObserver','requestAnimationFrame','cancelAnimationFrame'].map(key=>[key,globalThis[key]]))
  const frames=new Map(),cleanup=[]
  let resize,observed=new Set()
  globalThis.ResizeObserver=class { constructor(callback){resize=callback} observe(element){observed.add(element)} disconnect(){observed.clear()} }
  let sequence=0
  globalThis.window={innerWidth:1200,innerHeight:800,addEventListener(){},removeEventListener(){}}
  globalThis.document={body:{},addEventListener(){},removeEventListener(){}}
  globalThis.Node=class {}
  globalThis.requestAnimationFrame=callback=>{frames.set(++sequence,callback);return sequence}
  globalThis.cancelAnimationFrame=id=>frames.delete(id)
  const module={exports:{}}
  const source=readFileSync(new URL('../views/data-collect/hook/usePointEditorOverlay.ts',import.meta.url),'utf8')
  const mockedVue={...vue,onMounted:callback=>callback(),onBeforeUnmount:callback=>cleanup.push(callback)}
  const token=vue.ref({zIndexPopupBase:1000})
  const shared={exports:{}}
  const sharedSource=readFileSync(new URL('../views/data-collect/hook/useEditorOverlay.ts',import.meta.url),'utf8')
  new Function('require','module','exports',transformSync(sharedSource,{loader:'ts',format:'cjs'}).code)(id=>id === 'ant-design-vue' ? {theme:{useToken:()=>({token})}} : mockedVue,shared,shared.exports)
  new Function('require','module','exports',transformSync(source,{loader:'ts',format:'cjs'}).code)(id=>id === './useEditorOverlay' ? shared.exports : mockedVue,module,module.exports)
  const rect={left:100,right:500,top:560,bottom:680,width:400,height:120}
  const row={dataset:{pointId:'a'},getBoundingClientRect:()=>rect}
  const root=vue.shallowRef({querySelectorAll:()=>[row],querySelector:()=>({getBoundingClientRect:()=>({left:100,right:1100,top:100,bottom:750})})})
  const selected=vue.ref('a'),ready=vue.ref(false),scope=vue.effectScope()
  const overlay=scope.run(()=>objectMode ? shared.exports.useEditorOverlay({
    key:selected,ready,width:vue.ref(1000),onSource:vue.ref(true),anchor:()=>row,viewport:()=>root.value.querySelector(),panelWidth:()=>660,
    alignment:{source:()=>({getBoundingClientRect:()=>({left:rect.left,top:rect.top})}),panel:()=>({getBoundingClientRect:()=>({left:13,top:13})})},
  }) : module.exports.usePointEditorOverlay({root,selected,ready,width:vue.ref(1000),cards:vue.ref(true)}))
  if(objectMode)overlay.target.value={getBoundingClientRect:()=>({left:0,top:0}),contains:()=>false}
  return {
    overlay,selected,ready,rect,frames,resize:()=>resize(),observed,token,
    async settle(){await vue.nextTick();await vue.nextTick()},
    frame(){const pending=[...frames.values()];frames.clear();pending.forEach(callback=>callback())},
    close(){cleanup.forEach(callback=>callback());scope.stop();for(const [key,value] of saved){if(value===undefined)delete globalThis[key];else globalThis[key]=value}},
  }
}

test('keeps the source visible until this point is ready and never positions a bottom card above its source',async()=>{
  const page=fixture()
  try {
    await page.settle();page.frame()
    assert.equal(page.overlay.open.value,false)
    assert.equal(page.frames.size,0,'loading does not schedule a popup with empty content')
    page.ready.value=true;await page.settle();page.frame()
    assert.equal(page.overlay.open.value,true)
    assert.equal(page.overlay.position.value['--cw-panel-top'],'560px')
    assert.equal(page.overlay.position.value.width,'400px')
    page.rect.top=100;page.rect.bottom=220
    page.overlay.update();page.frame()
    assert.equal(page.overlay.position.value['--cw-panel-top'],'100px','scrolling follows the same source card')
  } finally {page.close()}
})

test('cancels queued opens when selection closes or the next point is still preparing',async()=>{
  const page=fixture()
  try {
    page.ready.value=true;await page.settle()
    const stale=[...page.frames.values()]
    page.ready.value=false;await page.settle()
    assert.equal(page.frames.size,0)
    stale.forEach(callback=>callback())
    assert.equal(page.overlay.open.value,false,'an already dispatched callback cannot reopen an unready editor')
    page.ready.value=true;await page.settle();page.frame()
    assert.equal(page.overlay.open.value,true)
    page.selected.value='b';page.ready.value=false;await page.settle();page.frame()
    assert.equal(page.overlay.open.value,false,'the previous editor cannot cover a different point')
    page.selected.value='';await page.settle();page.frame()
    assert.equal(page.overlay.open.value,false)
  } finally {page.close()}
})

test('a header editor keeps the identity in place by narrowing at the right edge',async()=>{
  const page=fixture(true)
  try {
    page.rect.left=700;page.rect.right=1100;page.ready.value=true
    await page.settle();page.frame()
    assert.equal(page.overlay.position.value['--cw-panel-left'],'687px')
    assert.equal(page.overlay.position.value.width,'413px','width shrinks instead of shifting the identity left')
    assert.equal(page.overlay.position.value['--cw-panel-top'],'547px')
    assert.equal(page.overlay.position.value['--cw-source-height'],'133px','opening includes the complete source identity below the aligned panel top')
    page.rect.top=-200;page.rect.bottom=-80;page.overlay.update();page.frame()
    assert.equal(page.overlay.open.value,false,'scrolling the source out of view hides its editor')
  } finally {page.close()}
})

test('repositions after its container changes layout and releases resize observation when closed',async()=>{
  const page=fixture(true)
  try {
    page.ready.value=true;await page.settle();page.frame()
    assert.equal(page.observed.size,2,'observe the source and its viewport, not every card')
    page.rect.left=340;page.rect.right=740
    page.resize();page.resize()
    assert.equal(page.frames.size,1,'container and source changes share one frame')
    page.frame()
    assert.equal(page.overlay.position.value['--cw-panel-left'],'327px')
    page.selected.value='';await page.settle()
    assert.equal(page.observed.size,0)
  } finally {page.close()}
})

test('editors stay below the platform popup layer and follow theme changes',async()=>{
  const page=fixture()
  try {
    page.ready.value=true;await page.settle();page.frame()
    assert.equal(page.overlay.position.value.zIndex,999)
    page.token.value={zIndexPopupBase:2000};await page.settle();page.frame()
    assert.equal(page.overlay.position.value.zIndex,1999)
    assert.equal(page.overlay.open.value,true)
  } finally {page.close()}
})
