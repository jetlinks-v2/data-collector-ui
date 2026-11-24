<template>
  <div ref="viewport" class="cw-batch-grid" role="region" :aria-label="$t('collectorBatch.grid')" tabindex="0" @scroll.passive="grid.scroll" @paste="grid.paste" @keydown="grid.keyboard">
    <table role="grid" :aria-rowcount="state.visibleRows.value.length + 1" :aria-colcount="columns.length + 4" :style="{minWidth:tableWidth+'px'}">
      <colgroup><col style="width:36px" /><col style="width:196px" /><col v-for="column in columns" :key="column.key" :style="{width:column.width+'px'}" /><col style="width:42px" /><col style="width:36px" /></colgroup>
      <thead><tr>
        <th class="cw-batch-check"><a-checkbox :checked="grid.allVisible.value" :indeterminate="grid.someVisible.value && !grid.allVisible.value" :disabled="state.saving.value || !state.visibleRows.value.length" :aria-label="$t('collectorBatch.selectAll')" @change="state.toggleAll" /></th>
        <th class="cw-batch-identity"><div class="cw-batch-column-heading"><span>{{ $t('collectorBatch.field.name') }}<small> / {{ $t('collectorBatch.field.pointKey') }}</small></span><PointBatchColumnFilter column="identity" :title="$t('collectorBatch.field.name')" :filters="state.filters.value" :disabled="state.saving.value" @change="state.updateFilters" @clear="state.clearFilter('identity')" /></div></th>
        <th v-for="column in columns" :key="column.key"><div class="cw-batch-column-heading"><span>{{ column.title }}</span><PointBatchColumnFilter :column="filterFor(column)" :title="column.title" :filters="state.filters.value" :codec-options="filterCodecOptions" :mode-options="modeOptions" :disabled="state.saving.value" @change="state.updateFilters" @clear="state.clearFilter(filterFor(column))" /></div></th>
        <th><AIcon type="CheckCircleOutlined" :title="$t('collectorBatch.validation')" /></th><th class="cw-batch-row-action"><AIcon type="DeleteOutlined" :title="$t('collectorBatch.deleteRows')" /></th>
      </tr></thead>
      <tbody>
        <tr v-if="grid.top.value" aria-hidden="true"><td :colspan="columns.length + 4" :style="{height:grid.top.value+'px',padding:0,border:0}" /></tr>
        <tr v-for="(row,offset) in grid.window.value" :key="row.key" tabindex="-1" :aria-rowindex="grid.start.value + offset + 2" :class="{'cw-batch-row-selected':grid.selected.value.has(row.key),'cw-batch-row-invalid':state.issues.value.get(row.key)?.length,'cw-batch-row-deleted':row.deleted}" :data-row-key="row.key">
          <td class="cw-batch-check"><a-checkbox :checked="grid.selected.value.has(row.key)" :disabled="state.saving.value" :aria-label="$t('collectorBatch.selectRow',{name:row.point.name || grid.start.value + offset + 1})" @change="state.toggle(row.key)" /></td>
          <td class="cw-batch-identity">
            <span v-if="grid.active.value?.key === row.key && ['name','pointKey'].includes(grid.active.value.field)" data-batch-editor><a-input :key="grid.active.value.field" v-model:value="grid.input.value" size="small" :data-batch-field="grid.active.value.field" :aria-label="controlsTitle(grid.active.value.field)" @blur="grid.blurCommon($event,row.key)" /></span>
            <div v-else class="cw-batch-name"><button :disabled="state.saving.value || row.deleted" :title="row.point.name || $t('collectorBatch.emptyField')" @click="grid.activate(row,'name')">{{ row.point.name || $t('collectorBatch.emptyField') }}</button><button class="cw-batch-key" :disabled="state.saving.value || row.deleted" :title="$t('collectorBatch.field.pointKey')" @click="grid.activate(row,'pointKey')">{{ row.point.pointKey || $t('collectorBatch.emptyKey') }}</button></div>
          </td>
          <td v-for="column in columns" :key="column.key" :data-batch-field="column.key" :class="{'cw-batch-cell-invalid':row.fieldErrors?.[column.key] || row.ruleErrors?.[column.key]}" :aria-invalid="!!(row.fieldErrors?.[column.key] || row.ruleErrors?.[column.key])">
            <PointBatchCellEditor v-if="column.plugin && grid.active.value?.key === row.key && grid.active.value.field === column.key" :ref="(value:unknown)=>grid.setPluginEditor(value,row.key,column.key)" v-model:value="grid.pluginInput.value" :column="column.plugin" :record="row.point" :collector="state.collector.value" @commit="grid.commit(row.key,column.key)" />
            <span v-else-if="grid.active.value?.key === row.key && grid.active.value.field === column.key" data-batch-editor>
              <a-tooltip v-if="column.field === 'codec' || column.field === 'byteLayout'" :title="grid.decoding.error.value ? state.message(grid.decoding.error.value) : undefined">
                <ConfigSelect v-model:value="grid.input.value" size="small" :options="column.field === 'codec' ? activeCodecOptions : layoutOptions" :kind="column.field === 'codec' ? 'codec' : undefined" :loading="grid.decoding.loading.value" :disabled="grid.decoding.capabilities.value.autoCodec !== false || !!grid.decoding.error.value" show-search :get-popup-container="popupContainer" @change="grid.commit(row.key,column.key)" @blur="grid.commit(row.key,column.key)" />
              </a-tooltip>
              <ConfigSelect v-else-if="column.field === 'accessModes'" v-model:value="grid.modes.value" size="small" mode="multiple" :options="modeOptions" kind="access" :max-tag-count="1" :get-popup-container="popupContainer" @dropdown-visible-change="(visible:boolean)=>!visible && grid.commit(row.key,column.key)" />
              <a-input v-else v-model:value="grid.input.value" size="small" :inputmode="column.field === 'interval' ? 'numeric' : undefined" :aria-label="column.title" @blur="grid.commit(row.key,column.key)" />
            </span>
            <button v-else class="cw-batch-cell" :class="{'cw-batch-readonly':!grid.editable(column.key,row),'cw-batch-default':column.field === 'byteLayout' && !row.point.managedConfiguration?.byteLayout}" :disabled="state.saving.value || !grid.editable(column.key,row)" :title="cellHint(row,column)" @click="grid.activate(row,column.key)"><PluginValue v-if="column.plugin" :column="column" :row="row" :index="grid.start.value + offset" /><template v-else>{{ cellText(row,column) }}</template></button>
          </td>
          <td class="cw-batch-validation"><a-tooltip v-if="state.issues.value.get(row.key)?.length" :title="state.issues.value.get(row.key)!.map(state.message).join('；')"><AIcon type="ExclamationCircleFilled" class="cw-batch-invalid" /></a-tooltip><a-tooltip v-else-if="row.deleted" :title="$t('collectorBatch.deleteHint')"><AIcon type="DeleteOutlined" class="cw-batch-invalid" /></a-tooltip><a-tooltip v-else-if="overlaps.has(row.address)" :title="$t('collectorBatch.overlap')"><AIcon type="WarningOutlined" class="cw-batch-pending" /></a-tooltip><AIcon v-else :type="changedBatchRow(row) ? 'EditOutlined' : 'CheckOutlined'" :class="changedBatchRow(row) ? 'cw-batch-pending' : 'cw-batch-valid'" /></td>
          <td class="cw-batch-row-action"><a-tooltip :title="$t(row.deleted ? 'collectorBatch.undoDelete' : 'collectorBatch.deleteHint')"><j-permission-button size="small" type="text" hasPermission="data-collect:delete" :disabled="state.saving.value" :aria-label="$t(row.deleted ? 'collectorBatch.undoDelete' : 'collectorBatch.deleteRow', {name:row.point.name})" @click="row.deleted ? state.undoRemove(row) : state.remove([row.key])"><AIcon :type="row.deleted ? 'UndoOutlined' : 'DeleteOutlined'" /></j-permission-button></a-tooltip></td>
        </tr>
        <tr v-if="grid.bottom.value" aria-hidden="true"><td :colspan="columns.length + 4" :style="{height:grid.bottom.value+'px',padding:0,border:0}" /></tr>
      </tbody>
    </table>
    <a-empty v-if="!state.visibleRows.value.length" :description="$t(state.filtered.value ? 'collectorBatchFilter.noMatches' : 'collectorBatch.empty')" :image-style="{height:'64px'}"><a-button v-if="state.filtered.value" size="small" @click="state.clearFilters">{{ $t('collectorBatchFilter.clearAll') }}</a-button></a-empty>
  </div>
</template>
<script setup lang="ts">
import { computed, defineComponent } from 'vue'
import { useI18n } from 'vue-i18n'
import ConfigSelect from '../../../../components/ConfigSelect.vue'
import PointBatchColumnFilter from './PointBatchColumnFilter.vue'
import PointBatchCellEditor from './PointBatchCellEditor.vue'
import { usePointBatchGrid } from '../../hook/usePointBatchGrid'
import { batchFieldValue, changedBatchRow } from '../../../../utils/pointBatchDraft'
import { accessOption, byteOrderOption, codecOption } from '../../../../utils/configOptions'
import { pointBatchColumnText, pointBatchColumnValue } from '../../../../utils/pointBatchColumns'
import { batchCodecKey } from '../../../../utils/pointBatchFilter'
import { byteLayoutOptions } from '../Config/data'
import type { PointBatchEditorState } from '../../hook/usePointBatchEditor'
import type { BatchCellKey, BatchFilterColumn, PointBatchGridColumn, PointBatchRow } from '../../../../types/pointBatch'
const props=defineProps<{state:PointBatchEditorState}>()
const {t}=useI18n(),grid=usePointBatchGrid(props.state)
const {viewport}=grid
const columns=computed(()=>props.state.displayColumns.value.filter(column=>column.key!=='name' && column.key!=='pointKey'))
const tableWidth=computed(()=>36+196+42+36+columns.value.reduce((total,column)=>total+column.width,0))
const codecOptions=computed(()=>props.state.codecCatalog.codecs.value.map(codec=>codecOption(codec,t)))
const activeCodecOptions=computed(()=>grid.decoding.codecs.value.map(codec=>codecOption(codec,t)))
const layoutOptions=computed(()=>byteLayoutOptions.map(option=>byteOrderOption(option.value,t)))
const modeOptions=computed(()=>props.state.accessModes.value.map(value=>accessOption(value,undefined,t)))
const filterCodecOptions=computed(()=>{const keys=new Set(props.state.rows.value.map(row=>batchCodecKey(row,props.state.adapter.value)));return [...codecOptions.value,...(keys.has('__auto__')?[{value:'__auto__',label:t('collectorBatch.automaticType'),icon:'ThunderboltOutlined'}]:[]),...(keys.has('__plugin__')?[{value:'__plugin__',label:t('collectorBatch.pluginType'),icon:'ApiOutlined'}]:[])]})
const overlaps=computed(()=>{const counts=new Map<string,number>();for(const row of props.state.rows.value)if(row.address)counts.set(row.address,(counts.get(row.address)||0)+1);return new Set([...counts].filter(([,count])=>count>1).map(([address])=>address))})
function controlsTitle(key:BatchCellKey){return props.state.columns.value.find(column=>column.key===key)?.title || key}
function filterFor(column:PointBatchGridColumn):BatchFilterColumn{return column.key==='name' || column.key==='pointKey'?'identity':column.key}
function cellError(row:PointBatchRow,column:PointBatchGridColumn){const error=row.fieldErrors?.[column.key] || row.ruleErrors?.[column.key];return error?props.state.message(error):''}
function cellHint(row:PointBatchRow,column:PointBatchGridColumn):string {
  const error=cellError(row,column)
  if(error)return error
  if(Object.prototype.hasOwnProperty.call(row.inputs || {},column.key))return cellText(row,column)
  if(column.field==='address' && !grid.editable(column.key,row))return t('collectorBatch.addressReadOnly')
  if((column.field==='codec' || column.field==='byteLayout') && props.state.adapter.value?.isAutoCodec?.(row.point))return t('collectorBatch.typeReadOnly')
  if(column.field==='byteLayout' && !row.point.managedConfiguration?.byteLayout)return t('collectorBatch.defaultLayoutHint')
  return cellText(row,column)
}
function cellText(row:PointBatchRow,column:PointBatchGridColumn):string {
  if(Object.prototype.hasOwnProperty.call(row.inputs || {},column.key)){const value=row.inputs![column.key];return value!=null && typeof value!=='object'?String(value):t('collectorBatch.emptyField')}
  if(column.plugin)return pointBatchColumnText(column.plugin,row.point) || t('collectorBatch.emptyField')
  if(column.field==='codec')return props.state.adapter.value?.isAutoCodec?.(row.point)?t('collectorBatch.automaticType'):codecOptions.value.find(codec=>codec.value===row.point.managedConfiguration?.codec)?.label || row.point.managedConfiguration?.codec || t('collectorBatch.pluginType')
  if(column.field==='byteLayout')return props.state.adapter.value?.isAutoCodec?.(row.point)?t('collectorBatch.notApplicable'):row.point.managedConfiguration?.byteLayout?.replaceAll('_',' ') || t('collectorBatchDefault')
  if(column.field==='accessModes')return batchFieldValue(row,column.field).split(',').map(mode=>accessOption(mode,undefined,t).label).join(' · ')
  return column.field?batchFieldValue(row,column.field) || t('collectorBatch.emptyField'):''
}
const PluginValue=defineComponent<{column:PointBatchGridColumn;row:PointBatchRow;index:number}>({props:['column','row','index'],setup:props=>()=>Object.prototype.hasOwnProperty.call(props.row.inputs || {},props.column.key)?cellText(props.row,props.column):props.column.plugin?.customRender?.({text:pointBatchColumnValue(props.column.plugin,props.row.point),record:props.row.point,index:props.index}) ?? cellText(props.row,props.column)})
const popupContainer=()=>document.body
defineExpose({commit:grid.commit,pasteText:grid.pasteText,firstError:grid.firstError,focusRow:grid.focusRow,pending:grid.pending})
</script>
<style scoped>
.cw-batch-grid{position:relative;overflow:auto;max-height:62vh;min-height:180px;border:1px solid var(--ant-color-border-secondary,#f0f0f0);border-radius:6px;outline:none}.cw-batch-grid table{table-layout:fixed;width:100%;min-width:828px;border-collapse:separate;border-spacing:0;font-size:12px}.cw-batch-grid th{position:sticky;top:0;z-index:3;height:32px;padding:0 8px;text-align:left;background:var(--ant-color-fill-quaternary,#fafafa);font-weight:500;color:var(--ant-color-text-secondary,#595959);border-bottom:1px solid var(--ant-color-border-secondary,#f0f0f0)}.cw-batch-grid td{height:36px;padding:0 8px;border-bottom:1px solid var(--ant-color-border-secondary,#f0f0f0);background:var(--ant-color-bg-container,#fff);overflow:hidden}.cw-batch-grid th small{font-weight:400;color:var(--ant-color-text-tertiary,#8c8c8c)}.cw-batch-grid .cw-batch-check{position:sticky;left:0;z-index:2;text-align:center;padding:0}.cw-batch-grid .cw-batch-identity{position:sticky;left:36px;z-index:2;box-shadow:2px 0 3px rgb(0 0 0 / 3%)}.cw-batch-grid th.cw-batch-check,.cw-batch-grid th.cw-batch-identity{z-index:4}.cw-batch-grid .cw-batch-row-selected td{background:var(--ant-color-primary-bg,#e6f4ff)}.cw-batch-name{display:flex;flex-direction:column;gap:0;line-height:16px}.cw-batch-grid button{border:0;background:none;text-align:left;cursor:pointer;padding:0;color:inherit;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%}.cw-batch-grid button:hover{color:var(--ant-color-primary,#1677ff)}.cw-batch-grid button:focus-visible{outline:1px solid var(--ant-color-primary,#1677ff);outline-offset:1px}.cw-batch-grid .cw-batch-key{font-size:11px;color:var(--ant-color-text-tertiary,#8c8c8c)}.cw-batch-cell{width:100%;line-height:30px}.cw-batch-grid .cw-batch-readonly{cursor:default;color:var(--ant-color-text-secondary,#595959)}.cw-batch-invalid{color:var(--ant-color-error,#ff4d4f)}.cw-batch-pending{color:var(--ant-color-warning,#faad14)}.cw-batch-valid{color:var(--ant-color-success,#52c41a)}.cw-batch-validation{text-align:center}.cw-batch-grid :deep(.ant-select){width:100%;font-size:12px}.cw-batch-grid :deep(.ant-input){font-size:12px;height:26px}.cw-batch-grid :deep(.ant-empty){margin:32px 0}
.cw-batch-column-heading{display:flex;align-items:center;justify-content:space-between;gap:4px;min-width:0;white-space:nowrap}.cw-batch-column-heading>span{overflow:hidden;text-overflow:ellipsis}.cw-batch-plugin-cell{display:flex;align-items:center;gap:8px;justify-content:space-between}.cw-batch-plugin-cell :deep(.anticon){flex:none;color:var(--ant-color-text-tertiary,#8c8c8c)}
.cw-batch-cell-invalid{box-shadow:inset 0 -1px var(--ant-color-error,#ff4d4f)}
.cw-batch-grid .cw-batch-default{color:var(--ant-color-text-tertiary,#8c8c8c)}
.cw-batch-grid .cw-batch-row-action{position:sticky;right:0;z-index:2;text-align:center;padding:0;box-shadow:-2px 0 3px rgb(0 0 0 / 3%)}.cw-batch-grid th.cw-batch-row-action{z-index:4}.cw-batch-row-action :deep(.ant-btn){width:28px;height:28px;justify-content:center}.cw-batch-grid .cw-batch-row-deleted td{background:var(--ant-color-error-bg,#fff2f0)}.cw-batch-row-deleted .cw-batch-name,.cw-batch-row-deleted .cw-batch-cell{text-decoration:line-through;color:var(--ant-color-text-tertiary,#8c8c8c)}
</style>
