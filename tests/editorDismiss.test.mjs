import test, { after } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { JSDOM } from 'jsdom'
import { transformSync } from 'esbuild'

const dom = new JSDOM('<body></body>', { pretendToBeVisual: true })
for (const key of ['window','document','navigator','Element','HTMLElement','Node','SVGElement','getComputedStyle'])
  Object.defineProperty(globalThis, key, { configurable: true, value: key === 'getComputedStyle' ? dom.window[key].bind(dom.window) : dom.window[key] })
after(() => dom.window.close())
const require = createRequire(import.meta.url), vue = require('vue'), module = { exports: {} }
new Function('require','module','exports',transformSync(readFileSync(new URL('../views/data-collect/hook/useEditorDismiss.ts',import.meta.url),'utf8'),{loader:'ts',format:'cjs'}).code)(require,module,module.exports)
const { useEditorDismiss, useEditorPopover } = module.exports
const tick = async () => { await vue.nextTick(); await Promise.resolve() }
function click(element) {
  element.dispatchEvent(new dom.window.MouseEvent('pointerdown', { bubbles: true, composed: true }))
  element.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true, composed: true, detail: 1 }))
}
function escape(element) { element.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })) }
function fixture(table = false) {
  const host = document.createElement('div'); document.body.append(host)
  const active = vue.ref(true), draft = vue.ref('local draft'), saving = vue.ref(false), events = []
  let panel, anchor, trigger, input, outside
  const app = vue.createApp({ setup() {
    const panelRef = vue.ref()
    useEditorDismiss({ active, panel: panelRef, anchor: () => anchor, trigger: () => trigger, dismiss: focus => { if (!saving.value) { events.push(focus); active.value = false } } })
    return () => vue.h('div', [vue.h('button',{ref:el=>anchor=el},'source'),vue.h('button',{ref:el=>trigger=el},'settings'),
      vue.h('div',{class:table?'ant-popover':''},[vue.h('div',{ref:el=>{panel=el;panelRef.value=el}},[vue.h('input',{ref:el=>input=el,value:draft.value,role:'combobox','aria-expanded':'false'})])]),
      vue.h('input',{ref:el=>outside=el})])
  } })
  app.mount(host)
  return { active,draft,saving,events,get panel(){return panel},get anchor(){return anchor},get trigger(){return trigger},get input(){return input},get outside(){return outside},close(){app.unmount();host.remove()} }
}

test('outside click preserves the draft and the clicked input focus; source and trigger stay inside the interaction',async()=>{
  const page=fixture()
  try {
    await tick();click(page.anchor);click(page.trigger);click(page.input)
    assert.equal(page.active.value,true)
    page.outside.focus();click(page.outside);await tick()
    assert.deepEqual(page.events,[false]);assert.equal(document.activeElement,page.outside);assert.equal(page.draft.value,'local draft')
    page.active.value=true;await tick();escape(page.input)
    assert.equal(page.active.value,false,'a closed combobox does not swallow Escape')
    assert.deepEqual(page.events,[false,true]);assert.equal(page.draft.value,'local draft')
  } finally {page.close()}
})

test('teleported controls own pointer and Escape interactions until their popup closes',async()=>{
  const page=fixture(true),popup=document.createElement('div')
  popup.className='ant-select-dropdown';popup.getClientRects=()=>popup.hidden?[]:[{}];document.body.append(popup)
  try {
    const list=document.createElement('div');list.id='editor-options';list.setAttribute('role','listbox');popup.append(list)
    page.input.setAttribute('aria-controls',list.id);page.input.setAttribute('aria-expanded','true')
    await tick();click(popup);escape(page.input);assert.equal(page.active.value,true)
    page.input.setAttribute('aria-expanded','false')
    escape(page.input);assert.equal(page.active.value,false,'the enclosing table popover and a closing menu do not swallow Escape')
    assert.deepEqual(page.events,[true])
  } finally {popup.remove();page.close()}
})

test('dragging from an editor to outside is not an outside click, and its owner retains saving policy',async()=>{
  const page=fixture()
  try {
    await tick()
    page.input.dispatchEvent(new dom.window.MouseEvent('pointerdown',{bubbles:true,composed:true}))
    page.outside.dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true,composed:true,detail:1}))
    assert.equal(page.active.value,true)
    page.saving.value=true;click(page.outside);escape(page.input);assert.equal(page.active.value,true)
    page.saving.value=false;click(page.outside);assert.equal(page.active.value,false)
    assert.deepEqual(page.events,[false])
    page.active.value=true;page.close();escape(document.body)
    assert.equal(page.active.value,true,'unmount removes document listeners')
  } finally {if(page.panel?.isConnected)page.close()}
})

test('closing a click popover returns focus and releases Escape before its visual exit finishes',async()=>{
  const page=fixture(),scope=vue.effectScope(),popover=scope.run(()=>useEditorPopover()),popup=document.createElement('div')
  popup.className='ant-popover';popup.getClientRects=()=>[{}];document.body.append(popup)
  try {
    await tick();popover.trigger.value=page.anchor.parentElement;popover.open.value=true
    escape(page.input);assert.equal(page.active.value,true)
    popover.close();popup.style.pointerEvents='none';await tick()
    assert.equal(popover.open.value,false);assert.equal(document.activeElement,page.anchor)
    escape(page.input);assert.equal(page.active.value,false)
  } finally {scope.stop();popup.remove();page.close()}
})

test('clicking a nested dialog mask dismisses that dialog without closing the editor beneath it',async()=>{
  const page=fixture(),dialog=document.createElement('div'),mask=document.createElement('div')
  dialog.className='ant-modal-root';mask.className='ant-modal-mask';dialog.append(mask);document.body.append(dialog)
  try {
    await tick();click(mask);assert.equal(page.active.value,true);assert.deepEqual(page.events,[])
    dialog.remove();click(page.outside);assert.equal(page.active.value,false)
  } finally {dialog.remove();page.close()}
})

test('popup launchers and generic teleported panels do not dismiss an editor',async()=>{
  const page=fixture(),launcher=document.createElement('button'),popup=document.createElement('section'),option=document.createElement('button')
  launcher.setAttribute('aria-expanded','false');document.body.append(launcher)
  popup.setAttribute('role','dialog');popup.append(option)
  try {
    await tick();click(launcher)
    assert.equal(page.active.value,true,'opening a popup outside the card keeps editing active')
    document.body.append(popup)
    popup.addEventListener('pointerdown',event=>event.stopPropagation())
    click(option)
    assert.equal(page.active.value,true,'custom dialog roles share the same outside-click boundary')
    popup.setAttribute('role','tooltip');click(option)
    assert.equal(page.active.value,true)
    popup.remove();click(page.outside)
    assert.equal(page.active.value,false,'the surrounding page still dismisses editing')
    assert.deepEqual(page.events,[false])
  } finally {launcher.remove();popup.remove();page.close()}
})
