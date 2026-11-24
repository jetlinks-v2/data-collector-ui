import { cloneDeep, get, set } from 'lodash-es'
import { setBatchField } from './pointBatchDraft'
import { pluginColumnFor } from './pointBatchColumns'
import { byteLayoutOptions } from '../views/data-collect/components/Config/data'
import type { BatchCellKey, PointBatchAdapter, PointBatchPluginColumn, PointBatchRow } from '../types/pointBatch'

/** Both grid edits and spreadsheets normalize against an isolated row before replacing local state. */
export function setPointBatchCell(row:PointBatchRow,key:BatchCellKey,input:unknown,index:number,adapter?:PointBatchAdapter,deferOptions=false):void {
  row.saveError=undefined
  if(row.ruleErrors)delete row.ruleErrors[key]
  if(row.fieldErrors)delete row.fieldErrors[key]
  const plugin=pluginColumnFor(adapter,key)
  try {
    if(key.startsWith('plugin:')) {
      if(!plugin)throw new Error('clipboardColumns')
      const point=cloneDeep(row.point),event=input as {target?:{value?:unknown;checked?:unknown}}|undefined
      const value=plugin.template?.handleChange ? plugin.template.handleChange(input,index,point) : event?.target ? plugin.template?.check ? event.target.checked : event.target.value : input
      const path=plugin.form?.name || plugin.dataIndex, previous=get(point,path)
      // An object-valued configuration path requires an explicit plugin conversion.
      if(previous && typeof previous === 'object' && typeof value === 'string')throw new Error('objectClipboard')
      set(point,path,value)
      if(!deferOptions)plugin.template?.handleOptions?.(point)
      row.point=point
    } else {
      const value=Array.isArray(input)?input.join(','):String(input ?? '')
      if(key==='byteLayout' && !byteLayoutOptions.some(option=>option.value===value))throw new Error('invalidByteLayout')
      if(key==='codec' && !adapter?.setCodec && !adapter?.isAutoCodec?.(row.point)) (row.point.managedConfiguration ||= {}).codec=value
      else setBatchField(row,key as Exclude<BatchCellKey,`plugin:${string}`>,value,adapter)
      if(row.fieldErrors?.[key])throw new Error(row.fieldErrors[key])
    }
    if(row.inputs)delete row.inputs[key]
    row.address=adapter?.getAddress?.(row.point) || row.point.address || row.address
  } catch(cause) {
    (row.inputs ||= {})[key]=input===undefined?null:cloneDeep(input)
    ;(row.fieldErrors ||= {})[key]=cause instanceof Error?cause.message:String(cause)
  }
}
/** A pasted row invokes each changed column's synchronous linkage once, after all values are present. */
export function finishPointBatchRow(row:PointBatchRow,columns:PointBatchPluginColumn[],adapter?:PointBatchAdapter):void {
  row.validationError=undefined
  try {
    const callbacks=new Set(columns.map(column=>column.template?.handleOptions).filter((callback):callback is NonNullable<typeof callback>=>!!callback))
    if(callbacks.size){const point=cloneDeep(row.point);for(const callback of callbacks)callback(point);row.point=point}
    adapter?.validate?.(row.point)
  } catch(cause) { row.validationError=cause instanceof Error?cause.message:String(cause) }
  row.address=adapter?.getAddress?.(row.point) || row.point.address || row.address
}
