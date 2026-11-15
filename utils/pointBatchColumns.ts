import { get } from 'lodash-es'
import type { BatchCellKey, PointBatchAdapter, PointBatchGridColumn, PointBatchPluginColumn, PointBatchRow } from '../types/pointBatch'
import type { PointRow } from '../types/workspace'

export function pointBatchColumnValue(column: PointBatchPluginColumn, point: PointRow): unknown {
  const value = get(point, column.form?.name || column.dataIndex)
  return column.template?.getValue ? column.template.getValue(value) : value
}
/** Plugin summaries stay textual for local search; rendering may still return a standard VNode. */
export function pointBatchColumnText(column: PointBatchPluginColumn, point: PointRow, index = 0): string {
  const value = pointBatchColumnValue(column, point)
  const rendered = column.customRender ? column.customRender({text:value,record:point,index}) : value
  return typeof rendered === 'string' || typeof rendered === 'number' || typeof rendered === 'boolean' ? String(rendered) : ''
}

/** The same ordered column identities drive display, keyboard navigation, clipboard and filling. */
export function pointBatchGridColumns(adapter: PointBatchAdapter | undefined, t: (key:string)=>string, decoding = true): PointBatchGridColumn[] {
  const field = (key:PointBatchGridColumn['field'],width:number):PointBatchGridColumn => ({key:key!,field:key,title:t(key==='byteLayout'?'collectorWorkspace.byteOrder':`collectorBatch.field.${key}`),width})
  return [field('name',196),field('pointKey',120),
    ...(adapter?.columns?.length ? adapter.columns.map(plugin=>({key:`plugin:${plugin.dataIndex}` as const,plugin,title:plugin.title || plugin.dataIndex,width:plugin.width || 140})) : [field('address',180)]),
    ...(decoding ? [field('codec',132),{...field('byteLayout',128),title:t('collectorWorkspace.byteOrder')}] : []),field('accessModes',120),field('interval',120)]
}
export function pointBatchColumnInput(row:PointBatchRow,column:PointBatchGridColumn):unknown {
  if(Object.prototype.hasOwnProperty.call(row.inputs || {},column.key))return row.inputs![column.key]
  return column.plugin ? pointBatchColumnValue(column.plugin,row.point) : undefined
}
export function pluginColumnFor(adapter:PointBatchAdapter|undefined,key:BatchCellKey):PointBatchPluginColumn|undefined {
  return key.startsWith('plugin:') ? adapter?.columns?.find(column=>`plugin:${column.dataIndex}` === key) : undefined
}
