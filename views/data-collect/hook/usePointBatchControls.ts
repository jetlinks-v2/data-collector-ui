import { computed, nextTick, ref, shallowRef, watch } from 'vue'
import type { BatchCellKey } from '../../../types/pointBatch'
import type { PointBatchEditorState } from './usePointBatchEditor'
import { readPointImport, type PointImportSheet } from '../../../utils/pointBatchImport'
import { writePointClipboard } from '../../../utils/pointBatchClipboard'
import { usePointBatchDecoding } from './usePointBatchDecoding'

interface GridHandle { commit(): void; pasteText(text:string):number|undefined; firstError():void; focusRow(index:number):void; pending?:boolean }
/** Local tools share the same row setter; only explicit confirmation persists the draft. */
export function usePointBatchControls(state:PointBatchEditorState) {
  const grid=ref<GridHandle>(),rangeOpen=ref(false),fillOpen=ref(false)
  const fillField=ref<BatchCellKey>('interval'),fillValue=shallowRef<unknown>(''),fillTouched=ref(false),fillError=ref('')
  const fillEditor=ref<{validate():Promise<unknown>}>()
  const fillDecoding=usePointBatchDecoding()
  const fillColumn=computed(()=>state.columns.value.find(column=>column.key===fillField.value))
  const fillRecord=computed(()=>state.visibleRows.value.find(row=>state.selected.value.includes(row.key)))
  const fillText=computed({get:()=>String(fillValue.value ?? ''),set:value=>setFillValue(value)})
  const modes=computed({get:()=>Array.isArray(fillValue.value)?fillValue.value:String(fillValue.value || '').split(',').filter(Boolean),set:(value:string[])=>setFillValue(value.join(','))})
  const canFill=computed(()=>(fillTouched.value || fillValue.value!=null && fillValue.value!=='') && (!['codec','byteLayout'].includes(fillField.value) || fillDecoding.capabilities.value.autoCodec===false && !fillDecoding.loading.value && !fillDecoding.error.value))
  watch([fillOpen,fillField,()=>fillRecord.value?.key],()=>{if(fillOpen.value && ['codec','byteLayout'].includes(fillField.value) && fillRecord.value)void fillDecoding.load(fillRecord.value.point)})
  function setFillValue(value:unknown){fillValue.value=value;fillTouched.value=true;fillError.value=''}
  function changeFillField(){fillValue.value=undefined;fillTouched.value=false;fillError.value=''}
  const importOpen=ref(false),importing=ref(false),importError=ref(''),filename=ref(''),sheets=ref<PointImportSheet[]>([]),sheetIndex=ref(0)
  watch([fillOpen,rangeOpen,importOpen],values=>{if(values.some(Boolean))grid.value?.commit()})
  const importPreview=computed(()=>{const sheet=sheets.value[sheetIndex.value];if(!sheet)return;try{return state.parseClipboard(writePointClipboard(sheet.rows),'name',true)}catch{return undefined}})
  const start=ref(''),count=ref(10),codec=ref<string>(),step=ref<number>()
  const templateKey=ref<string>(),namePrefix=ref(''),keyPrefix=ref(''),numberStart=ref('001')
  const selectedTemplate=computed(()=>state.selected.value.length === 1 ? state.rows.value.find(row=>row.key === state.selected.value[0] && !row.deleted) : undefined)
  const rangeOptions=computed(()=>({start:start.value,count:count.value,codec:codec.value,step:step.value,templateKey:templateKey.value,namePrefix:namePrefix.value,keyPrefix:keyPrefix.value,numberStart:numberStart.value}))
  const rangePreview=computed(()=>{if(!rangeOpen.value || !start.value || !count.value)return;try{return {rows:state.rangeRows(rangeOptions.value,true),error:''}}catch(cause){return {rows:[],error:state.message(cause)}}})
  watch(rangeOpen,open=>{if(open)templateKey.value=selectedTemplate.value?.key})
  const codecOptions=computed(()=>state.codecCatalog.codecs.value.map(value=>({value:value.id,label:value.name || value.id})))
  function add(){grid.value?.commit();state.clearFilters();const row=state.add();if(row)void nextTick(()=>grid.value?.focusRow(state.visibleRows.value.indexOf(row)))}
  async function paste(){try{const text=await navigator.clipboard.readText();if(!text)return;const index=grid.value?grid.value.pasteText(text):state.paste(text);if(index!=null)void nextTick(()=>grid.value?.focusRow(index))}catch{state.error.value=state.message(new Error('clipboardPermission'))}}
  async function importFile(file:File) {
    importing.value=true;importError.value='';sheets.value=[]
    try{sheets.value=await readPointImport(file);filename.value=file.name;sheetIndex.value=0;if(!importPreview.value?.rows.length)throw new Error('importColumns')}
    catch(cause){importError.value=state.message(cause)}finally{importing.value=false}
    return false
  }
  function importDraft(){const sheet=sheets.value[sheetIndex.value];if(!sheet || !importPreview.value)return;grid.value?.commit();const index=state.paste(writePointClipboard(sheet.rows),undefined,'name',undefined,true);if(index!=null){state.clearFilters();importOpen.value=false;sheets.value=[];filename.value='';void nextTick(()=>grid.value?.focusRow(index))}}
  function generate(){grid.value?.commit();const row=state.generate(rangeOptions.value);if(row){state.clearFilters();rangeOpen.value=false;void nextTick(()=>grid.value?.focusRow(state.rows.value.indexOf(row)))}}
  async function fill() {
    if(!canFill.value)return
    grid.value?.commit();fillError.value=''
    try{await fillEditor.value?.validate();state.fill(fillField.value,fillValue.value);fillOpen.value=false;changeFillField()}
    catch(cause){const failure=cause as {errorFields?:Array<{errors?:string[]}>};fillError.value=failure.errorFields?.flatMap(field=>field.errors || [])[0] || state.message(cause)}
  }
  async function save(){grid.value?.commit();await nextTick();await state.confirmSave();if(state.counts.value.errors)grid.value?.firstError()}
  function close(){grid.value?.commit();state.close()}
  function columnTitle(key:BatchCellKey){return state.columns.value.find(column=>column.key===key)?.title || key}
  return {grid,rangeOpen,fillOpen,fillField,fillValue,fillText,fillTouched,fillError,fillEditor,fillColumn,fillRecord,fillDecoding,canFill,setFillValue,changeFillField,modes,start,count,codec,step,templateKey,selectedTemplate,namePrefix,keyPrefix,numberStart,rangePreview,codecOptions,importOpen,importing,importError,filename,sheets,sheetIndex,importPreview,importFile,importDraft,columnTitle,add,paste,generate,fill,save,close}
}
