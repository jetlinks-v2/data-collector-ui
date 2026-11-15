import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { cloneDeep, isEqual } from 'lodash-es'
import { batchFieldValue } from '../../../utils/pointBatchDraft'
import { pointBatchColumnInput } from '../../../utils/pointBatchColumns'
import type { BatchCellKey, PointBatchRow } from '../../../types/pointBatch'
import type { PointBatchEditorState } from './usePointBatchEditor'
import { usePointBatchDecoding } from './usePointBatchDecoding'

/** A bounded row window and one active cell keep large drafts inexpensive and stable. */
export function usePointBatchGrid(state: PointBatchEditorState) {
  const viewport=ref<HTMLElement>(),scrollTop=ref(0),height=ref(420)
  const active=ref<{key:string;field:BatchCellKey}>(),input=ref(''),pluginInput=shallowRef<unknown>()
  const pluginEditor=ref<{validate():Promise<unknown>}>(),decoding=usePointBatchDecoding()
  let anchor:{key:string;field:BatchCellKey}|undefined
  let initialValue:unknown
  const pending=computed(()=>!!active.value && !isEqual(initialValue,active.value.field.startsWith('plugin:')?pluginInput.value:input.value))
  let editorIdentity=''
  function setPluginEditor(value:unknown,rowKey:string,key:BatchCellKey) {
    const identity=`${rowKey}:${key}`
    if(value && typeof value==='object' && 'validate' in value && typeof value.validate==='function'){
      const validate=value.validate;pluginEditor.value={validate:()=>Promise.resolve(validate())};editorIdentity=identity
    } else if(editorIdentity===identity){pluginEditor.value=undefined;editorIdentity=''}
  }
  function blurCommon(event:FocusEvent,rowKey:string){const field=(event.target as Element).closest('[data-batch-field]')?.getAttribute('data-batch-field');if(active.value?.key===rowKey && active.value.field===field)commit()}
  const rowHeight=36,headerHeight=32
  const start=computed(()=>Math.max(0,Math.floor((scrollTop.value-headerHeight)/rowHeight)-5))
  const end=computed(()=>Math.min(state.visibleRows.value.length,start.value+Math.ceil(height.value/rowHeight)+10))
  const window=computed(()=>state.visibleRows.value.slice(start.value,end.value))
  const top=computed(()=>start.value*rowHeight),bottom=computed(()=>Math.max(0,state.visibleRows.value.length-end.value)*rowHeight)
  const selected=computed(()=>new Set(state.selected.value))
  const allVisible=computed(()=>state.visibleRows.value.length>0 && state.visibleRows.value.every(row=>selected.value.has(row.key)))
  const someVisible=computed(()=>state.visibleRows.value.some(row=>selected.value.has(row.key)))
  const modes=computed({get:()=>input.value.split(',').filter(Boolean),set:value=>{input.value=value.join(',')}})
  watch(()=>state.selected.value.join(','),()=>{anchor=undefined})
  watch(state.filterRevision,()=>{anchor=undefined;scrollTop.value=0;if(viewport.value)viewport.value.scrollTop=0},{flush:'sync'})
  watch(()=>state.visibleRows.value.map(row=>row.key).join(','),()=>{
    if(anchor && !state.visibleRows.value.some(row=>row.key===anchor!.key))anchor=undefined
    // Removing draft rows near the end must not leave the virtual window beyond the remaining rows.
    const maximum=Math.max(0,headerHeight+state.visibleRows.value.length*rowHeight-height.value)
    if(scrollTop.value>maximum){scrollTop.value=maximum;if(viewport.value)viewport.value.scrollTop=maximum}
  })
  let observer:ResizeObserver|undefined
  onMounted(()=>{state.commitInput.value=commit;observer=new ResizeObserver(()=>{height.value=viewport.value?.clientHeight || 420});if(viewport.value)observer.observe(viewport.value)})
  const retainInput=()=>{commit();state.storage.flush()}
  globalThis.window.addEventListener('beforeunload',retainInput)
  onBeforeUnmount(()=>{retainInput();if(state.commitInput.value===commit)state.commitInput.value=undefined;observer?.disconnect();globalThis.window.removeEventListener('beforeunload',retainInput)})
  function editable(key:BatchCellKey,row?:PointBatchRow) {
    if(row?.deleted)return false
    const column=state.columns.value.find(column=>column.key===key)
    if(column?.plugin)return !!column.plugin.template?.components
    if(key==='address')return !!state.adapter.value?.setAddress
    if(key==='codec' || key==='byteLayout')return !row || !state.adapter.value?.isAutoCodec?.(row.point)
    return !!column
  }
  function focusRow(index:number) {
    if(!viewport.value || index<0)return
    const top=index*rowHeight
    if(top<viewport.value.scrollTop)viewport.value.scrollTop=top
    else if(top+rowHeight+headerHeight>viewport.value.scrollTop+viewport.value.clientHeight)viewport.value.scrollTop=top+rowHeight+headerHeight-viewport.value.clientHeight
    scrollTop.value=viewport.value.scrollTop
  }
  async function activate(row:PointBatchRow,key:BatchCellKey) {
    if(state.saving.value || !editable(key,row))return
    if(active.value?.key===row.key && active.value.field===key)return
    commit()
    const index=state.visibleRows.value.indexOf(row),column=state.columns.value.find(column=>column.key===key)
    if(index<0 || !column)return
    active.value={key:row.key,field:key};anchor=active.value
    if(column.plugin)pluginInput.value=cloneDeep(pointBatchColumnInput(row,column))
    else input.value=String(Object.prototype.hasOwnProperty.call(row.inputs || {},key)?row.inputs![key]:batchFieldValue(row,column.field!))
    initialValue=cloneDeep(column.plugin?pluginInput.value:input.value)
    if(key==='codec' || key==='byteLayout')void decoding.load(row.point)
    focusRow(index);await nextTick()
    viewport.value?.querySelector<HTMLInputElement>('[data-batch-editor] input,[data-batch-editor] button,[data-batch-editor] [tabindex="0"]')?.focus({preventScroll:true})
  }
  function commit(expectedKey?:string,expectedField?:BatchCellKey) {
    if(!active.value || expectedKey && (active.value.key!==expectedKey || active.value.field!==expectedField))return
    const current=active.value,row=state.rows.value.find(row=>row.key===current.key),column=state.columns.value.find(column=>column.key===current.field)
    const value=column?.plugin?pluginInput.value:input.value
    if(row && column && (!isEqual(initialValue,value) || Object.prototype.hasOwnProperty.call(row.inputs || {},current.field) || !!row.ruleErrors?.[current.field])) {
      const validation=column.plugin?pluginEditor.value?.validate():undefined
      state.change(row,current.field,value)
      if(validation)state.trackValidation(row,current.field,validation)
    }
    active.value=undefined
  }
  function keyboard(event:KeyboardEvent) {
    if(event.key==='Escape'){event.stopPropagation();active.value=undefined;return}
    if(!active.value || !['Enter','Tab'].includes(event.key))return
    event.preventDefault()
    const order=[...state.visibleRows.value],columns=[...state.columns.value],current=active.value,index=order.findIndex(row=>row.key===current.key)
    let offset=index*columns.length+columns.findIndex(column=>column.key===current.field)
    commit()
    const direction=event.shiftKey?-1:1,allowed=new Set(state.visibleRows.value.map(row=>row.key))
    do{offset+=direction}while(offset>=0 && offset<order.length*columns.length && (!allowed.has(order[Math.floor(offset/columns.length)].key) || !editable(columns[offset%columns.length].key,order[Math.floor(offset/columns.length)])))
    if(offset>=0 && offset<order.length*columns.length)void activate(order[Math.floor(offset/columns.length)],columns[offset%columns.length].key)
  }
  function paste(event:ClipboardEvent) {
    const text=event.clipboardData?.getData('text/plain') || '',target=event.target as HTMLElement|null
    if(!text || !/[\t\n]/.test(text) && !!target?.closest('[data-batch-editor]'))return
    event.preventDefault();pasteText(text)
  }
  function pasteText(text:string) {
    const current=active.value || anchor,order=state.visibleRows.value.filter(row=>!row.deleted),selectedIndex=order.findIndex(row=>selected.value.has(row.key))
    const index=current?order.findIndex(row=>row.key===current.key):selectedIndex>=0?selectedIndex:order.length,position=index>=0?index:order.length,targets=order.slice(position).map(row=>row.key)
    commit()
    const absolute=targets.length?state.rows.value.findIndex(row=>row.key===targets[0]):state.rows.value.length,result=state.paste(text,absolute,current?.field || 'name',targets)
    return result==null?undefined:position
  }
  function scroll(){scrollTop.value=viewport.value?.scrollTop || 0;if(active.value && !window.value.some(row=>row.key===active.value!.key))commit()}
  async function firstError() {
    commit()
    const row=state.rows.value.find(row=>state.issues.value.get(row.key)?.length)
    if(!row)return
    if(!state.visibleRows.value.some(value=>value.key===row.key))state.clearFilters()
    await nextTick();focusRow(state.visibleRows.value.findIndex(value=>value.key===row.key))
  }
  return {viewport,active,input,pluginInput,pluginEditor,setPluginEditor,blurCommon,pending,decoding,modes,selected,allVisible,someVisible,window,top,bottom,start,activate,commit,keyboard,paste,pasteText,scroll,firstError,focusRow,editable}
}
