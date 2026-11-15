<template>
  <section class="cw-batch-editor" :aria-label="$t('collectorBatch.title')" :aria-busy="state.loading.value || state.saving.value">
    <div class="cw-batch-head">
      <div class="cw-batch-title"><AIcon type="EditOutlined" /><strong>{{ $t('collectorBatch.title') }}</strong><small>{{ $t('collectorBatch.localDraft') }}</small></div>
      <a-tooltip :title="exitHint"><a-button size="small" type="text" :disabled="state.saving.value" @click="controls.close"><AIcon type="CloseOutlined" />{{ $t('collectorBatch.exit') }}</a-button></a-tooltip>
    </div>
    <div class="cw-batch-tools" role="toolbar" :aria-label="$t('collectorBatch.title')">
      <div class="cw-batch-primary-tools" role="group" :aria-label="$t('collectorBatch.title')">
      <a-tooltip :title="state.adapter.value ? $t('collectorBatch.addHint') : $t('collectorBatch.addressReadOnly')"><span><j-permission-button size="small" type="link" hasPermission="data-collect:add" :disabled="!state.adapter.value || state.loading.value || state.saving.value" @click="controls.add"><AIcon type="PlusOutlined" />{{ $t('collectorBatch.addRow') }}</j-permission-button></span></a-tooltip>
      <a-popover v-if="state.adapter.value?.generate" v-model:open="rangeOpen" trigger="click" placement="bottomLeft" overlay-class-name="cw-workspace-popover">
        <a-button size="small" type="text" :disabled="state.loading.value || state.saving.value" :title="$t('collectorBatch.rangeHint')"><AIcon type="NodeIndexOutlined" />{{ $t('collectorBatch.range') }}</a-button>
        <template #content><div class="cw-batch-tool-panel">
          <label>{{ $t('collectorBatch.startAddress') }}<a-input v-model:value="start" size="small" :placeholder="$t('collectorBatch.startAddress')" /></label>
          <div class="cw-batch-tool-pair"><label>{{ $t('collectorBatch.pointCount') }}<a-input-number v-model:value="count" size="small" :min="1" :max="10000" :precision="0" /></label><label>{{ $t('collectorBatch.step') }}<a-input-number v-model:value="step" size="small" :min="1" :precision="0" :placeholder="$t('collectorBatch.automatic')" /></label></div>
          <label>{{ $t('collectorBatch.field.codec') }}<ConfigSelect v-model:value="codec" size="small" kind="codec" :options="controls.codecOptions.value" allow-clear show-search :placeholder="$t('collectorBatch.fromTemplate')" /></label>
          <small>{{ $t('collectorBatch.rangeHint') }}</small><a-button size="small" type="primary" :disabled="!start || !count" @click="controls.generate">{{ $t('collectorBatch.previewRange') }}</a-button>
        </div></template>
      </a-popover>
      <a-tooltip :title="$t('collectorBatch.pasteHint')"><a-button size="small" type="text" :disabled="state.loading.value || state.saving.value" @click="controls.paste"><AIcon type="SnippetsOutlined" />{{ $t('collectorBatch.paste') }}</a-button></a-tooltip>
      <a-tooltip :title="$t('collectorBatch.importHint')"><a-button size="small" type="text" :disabled="state.loading.value || state.saving.value" :aria-label="$t('collectorBatch.importFile')" @click="importOpen = true"><AIcon type="ImportOutlined" /><span class="cw-batch-secondary-label">{{ $t('collectorBatch.importFile') }}</span></a-button></a-tooltip>
      </div>
      <div v-if="state.selected.value.length" class="cw-batch-context-tools" role="group" :aria-label="$t('collectorBatch.selected', { count: state.selected.value.length })">
      <small class="cw-muted">{{ $t('collectorBatch.selected', { count: state.selected.value.length }) }}</small>
      <a-popover v-model:open="fillOpen" trigger="click" placement="bottomLeft" overlay-class-name="cw-workspace-popover">
        <a-button size="small" type="text" :disabled="state.loading.value || state.saving.value" :title="$t('collectorBatch.onlySelected')"><AIcon type="FormOutlined" />{{ $t('collectorBatch.fillSelected') }}</a-button>
        <template #content><div class="cw-batch-tool-panel"><ConfigSelect v-model:value="fillField" size="small" :options="fillOptions" @change="controls.changeFillField" /><PointBatchCellEditor v-if="controls.fillColumn.value?.plugin && controls.fillRecord.value" ref="fillEditor" :value="fillValue" :column="controls.fillColumn.value.plugin" :record="controls.fillRecord.value.point" :collector="state.collector.value" :compact="false" @update:value="controls.setFillValue" /><ConfigSelect v-else-if="fillField === 'accessModes'" v-model:value="modes" size="small" kind="access" mode="multiple" :options="modeOptions" /><ConfigSelect v-else-if="fillField === 'codec' || fillField === 'byteLayout'" :value="fillValue" size="small" :kind="fillField === 'codec' ? 'codec' : undefined" :options="fillField === 'codec' ? fillCodecOptions : layoutOptions" :loading="controls.fillDecoding.loading.value" :disabled="controls.fillDecoding.capabilities.value.autoCodec !== false" show-search @update:value="controls.setFillValue" /><a-input v-else v-model:value="fillText" size="small" :inputmode="fillField === 'interval' ? 'numeric' : undefined" :placeholder="controls.columnTitle(fillField)" /><a-alert v-if="controls.fillError.value" type="error" show-icon :message="controls.fillError.value" /><small>{{ $t('collectorBatchFillHint') }}</small><a-button size="small" type="primary" :disabled="!controls.canFill.value" @click="controls.fill">{{ $t('collectorBatch.applySelected', { count: state.selected.value.length }) }}</a-button></div></template>
      </a-popover>
      <a-popconfirm :title="$t('collectorBatch.restoreHint')" @confirm="state.restoreSelected"><a-button size="small" type="text" :disabled="state.loading.value || state.saving.value" :title="$t('collectorBatch.restoreHint')" :aria-label="$t('collectorBatch.restoreSelected')"><AIcon type="UndoOutlined" /><span class="cw-batch-secondary-label">{{ $t('collectorBatch.restoreSelected') }}</span></a-button></a-popconfirm>
      <j-permission-button size="small" type="text" danger hasPermission="data-collect:delete" :disabled="state.loading.value || state.saving.value" :title="$t('collectorBatch.deleteHint')" @click="state.remove()"><AIcon type="DeleteOutlined" />{{ $t('collectorBatch.deleteRows') }}</j-permission-button>
      </div>
      <small class="cw-batch-keyboard-hint">{{ $t('collectorBatch.keyboardHint') }}</small>
    </div>
    <a-alert v-if="state.error.value" type="error" show-icon :message="state.error.value" closable @close="state.error.value = ''" />
    <a-alert v-if="state.storage.failed.value || !state.storage.available.value" type="warning" show-icon :message="$t(state.storage.failed.value ? 'collectorBatch.storageFailed' : 'collectorBatch.storageUnavailable')" />
    <a-alert v-if="state.storage.recoveryFailed.value" type="warning" show-icon :message="$t('collectorBatch.recoveryFailed')" />
    <a-skeleton v-if="state.loading.value" active :paragraph="{ rows: 6 }" />
    <PointBatchGrid v-else ref="grid" :state="state" />
    <div class="cw-batch-footer"><span class="cw-batch-summary"><span v-if="state.filtered.value" class="cw-batch-filter-count">{{ $t('collectorBatchFilter.count', {visible:state.visibleRows.value.length,total:state.rows.value.length}) }}<a-tooltip :title="$t('collectorBatchFilter.clearAll')"><a-button size="small" type="text" :aria-label="$t('collectorBatchFilter.clearAll')" @click="state.clearFilters"><AIcon type="FilterFilled" /></a-button></a-tooltip></span><span>{{ $t('collectorBatch.added', { count: state.counts.value.added }) }}</span><span>{{ $t('collectorBatch.modified', { count: state.counts.value.modified }) }}</span><span v-if="state.counts.value.deleted" class="cw-batch-invalid">{{ $t('collectorBatch.deleted', { count: state.counts.value.deleted }) }}</span><a-button v-if="state.counts.value.errors" size="small" type="link" danger :title="$t('collectorBatch.errorsHint')" @click="grid?.firstError()"><AIcon type="ExclamationCircleOutlined" />{{ $t('collectorBatch.errors', { count: state.counts.value.errors }) }}</a-button><small v-if="state.notice.value" class="cw-batch-notice">{{ state.notice.value }}</small></span><small class="cw-batch-save-hint">{{ $t(state.dirty.value ? 'collectorBatch.confirmHint' : 'collectorBatch.noChanges') }}</small><a-popconfirm :disabled="!state.counts.value.deleted" :title="$t('collectorBatch.deleteConfirm', {count:state.counts.value.deleted})" @confirm="controls.save"><j-permission-button class="cw-batch-confirm-save" size="small" type="primary" hasPermission="data-collect:update" :loading="state.saving.value" :disabled="!state.dirty.value && !grid?.pending || state.loading.value" :title="$t('collectorBatch.confirmHint')" @click="!state.counts.value.deleted && controls.save()"><AIcon type="CheckOutlined" />{{ $t('collectorBatch.confirmSave') }}</j-permission-button></a-popconfirm></div>
  </section>
  <a-modal v-model:open="importOpen" :title="$t('collectorBatchFiles.title')" :width="520" :confirm-loading="importing" :ok-text="$t('collectorBatch.previewRange')" :ok-button-props="{disabled: !controls.importPreview.value?.rows.length || importing}" @ok="controls.importDraft">
    <a-upload-dragger accept=".xlsx,.csv" :multiple="false" :before-upload="controls.importFile" :show-upload-list="false" :disabled="importing"><p><AIcon :type="importing ? 'LoadingOutlined' : 'InboxOutlined'" style="font-size:28px" /></p><p>{{ $t('collectorBatchFiles.select') }}</p><small class="cw-muted">{{ $t('collectorBatchFiles.hint') }}</small></a-upload-dragger>
    <a-alert v-if="importError" type="error" show-icon :message="importError" style="margin-top:12px" />
    <div v-if="filename" class="cw-import-file-summary"><AIcon type="FileExcelOutlined" /><span>{{ filename }}</span><small>{{ $t('collectorBatchFiles.rows', {count:controls.importPreview.value?.rows.length || 0}) }}</small></div>
    <ConfigSelect v-if="sheets.length > 1" v-model:value="sheetIndex" :options="sheets.map((sheet,index)=>({value:index,label:sheet.name,icon:'TableOutlined'}))" style="width:100%" @change="importError = ''" />
    <div v-if="controls.importPreview.value" class="cw-import-preview"><table><thead><tr><th v-for="field in controls.importPreview.value.fields" :key="field">{{ controls.columnTitle(field) }}</th></tr></thead><tbody><tr v-for="(row,index) in controls.importPreview.value.rows.slice(0,3)" :key="index"><td v-for="(value,column) in row" :key="column" :title="value">{{ value }}</td></tr></tbody></table></div>
    <small class="cw-muted">{{ $t('collectorBatchColumnOrder',{columns:state.columns.value.map(column=>column.title).join('、')}) }}</small>
  </a-modal>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import ConfigSelect from '../../../../components/ConfigSelect.vue'
import PointBatchGrid from './PointBatchGrid.vue'
import PointBatchCellEditor from './PointBatchCellEditor.vue'
import { usePointBatchControls } from '../../hook/usePointBatchControls'
import { accessOption, byteOrderOption, codecOption } from '../../../../utils/configOptions'
import { byteLayoutOptions } from '../Config/data'
import type { PointBatchEditorState } from '../../hook/usePointBatchEditor'
const props = defineProps<{ state: PointBatchEditorState }>()
const { t } = useI18n(), controls = usePointBatchControls(props.state)
const exitHint = computed(() => t(props.state.storage.failed.value ? 'collectorBatch.storageFailed' : !props.state.storage.available.value ? 'collectorBatch.storageUnavailable' : 'collectorBatch.exitHint'))
const { grid, rangeOpen, fillOpen, fillField, fillValue, fillText, fillEditor, modes, start, count, codec, step, importOpen, importing, importError, filename, sheets, sheetIndex } = controls
const modeOptions = computed(() => props.state.accessModes.value.map(value => accessOption(value, undefined, t)))
const fillOptions=computed(()=>props.state.columns.value.filter(column=>column.key!=='name' && column.key!=='pointKey').map(column=>({value:column.key,label:column.title,icon:column.key==='interval'?'FieldTimeOutlined':column.plugin?'SettingOutlined':column.key==='codec'?'FieldBinaryOutlined':'SwapOutlined',description:t('collectorBatch.onlySelected')})))
const fillCodecOptions=computed(()=>controls.fillDecoding.codecs.value.map(codec=>codecOption(codec,t)))
const layoutOptions=computed(()=>byteLayoutOptions.map(option=>byteOrderOption(option.value,t)))
// A safely retained local draft can be left without an unrelated discard dialog.
defineExpose({ dirty: computed(() => props.state.dirty.value && (props.state.storage.failed.value || !props.state.storage.available.value)), saving: props.state.saving })
</script>
<style scoped>
.cw-batch-editor { display:flex; flex-direction:column; gap:10px; padding:12px; background:var(--ant-color-bg-container,#fff); border:1px solid var(--ant-color-border-secondary,#f0f0f0); border-radius:var(--ant-border-radius-lg,8px); }
.cw-batch-head,.cw-batch-title,.cw-batch-tools,.cw-batch-summary,.cw-batch-primary-tools,.cw-batch-context-tools { display:flex; align-items:center; gap:8px; min-width:0; }
.cw-batch-head { justify-content:space-between; }
.cw-batch-title { font-size:13px; }
.cw-batch-title small { color:var(--ant-color-text-tertiary,#8c8c8c); font-weight:400; }
.cw-batch-tools { flex-wrap:wrap; gap:6px 12px; min-height:28px; }
.cw-batch-primary-tools { flex:0 0 auto; gap:2px; }
.cw-batch-context-tools { flex:0 0 auto; flex-wrap:nowrap; gap:4px; padding:2px 6px; border-radius:var(--ant-border-radius-sm,4px); background:var(--ant-color-primary-bg,#e6f4ff); }
.cw-batch-context-tools>small { white-space:nowrap; padding:0 4px; }
.cw-batch-tools :deep(.ant-btn) { font-size:12px; padding-inline:6px; }
.cw-batch-keyboard-hint { margin-left:auto; color:var(--ant-color-text-tertiary,#8c8c8c); font-size:11px; white-space:nowrap; }
.cw-batch-footer { display:grid; grid-template-columns:minmax(0,1fr) auto auto; align-items:center; gap:8px; min-width:0; font-size:12px; }
.cw-batch-summary { flex-wrap:wrap; gap:6px; color:var(--ant-color-text-secondary,#595959); }
.cw-batch-summary>span+span { border-left:1px solid var(--ant-color-border-secondary,#f0f0f0); padding-left:8px; }
.cw-batch-save-hint { color:var(--ant-color-text-tertiary,#8c8c8c); }
.cw-batch-confirm-save { justify-self:end; white-space:nowrap; }
.cw-batch-invalid { color:var(--ant-color-error,#ff4d4f); }
.cw-batch-tool-panel { display:flex; flex-direction:column; gap:10px; width:276px; max-width:calc(100vw - 48px); font-size:12px; }
.cw-batch-tool-panel label { display:flex; flex-direction:column; gap:4px; }
.cw-batch-tool-panel small { font-size:12px; color:var(--ant-color-text-tertiary,#8c8c8c); line-height:18px; }
.cw-batch-tool-panel :deep(.ant-select),.cw-batch-tool-panel :deep(.ant-input-number) { width:100%; }
.cw-batch-tool-pair { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
.cw-batch-filter-count{display:inline-flex;align-items:center;gap:2px;color:var(--ant-color-primary,#1677ff)}.cw-batch-filter-count :deep(.ant-btn){width:24px;padding:0}.cw-batch-notice{color:var(--ant-color-text-tertiary,#8c8c8c)}
@container cw-content (max-width:700px) {
  .cw-batch-keyboard-hint,.cw-batch-save-hint { display:none; }
  .cw-batch-footer { grid-template-columns:minmax(0,1fr) auto; }
}
@container cw-content (max-width:440px) {
  .cw-batch-secondary-label { display:none; }
  .cw-batch-editor { padding:8px; }
}
.cw-import-file-summary{display:flex;align-items:center;gap:8px;min-width:0;margin:12px 0;font-size:12px}.cw-import-file-summary>span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.cw-import-file-summary small{margin-left:auto;color:var(--ant-color-text-tertiary,#8c8c8c)}.cw-import-preview{overflow:auto;max-height:156px;margin:12px 0;border:1px solid var(--ant-color-border-secondary,#f0f0f0);border-radius:4px}.cw-import-preview table{table-layout:fixed;min-width:480px;width:100%;border-collapse:collapse;font-size:12px}.cw-import-preview th,.cw-import-preview td{text-align:left;max-width:130px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;padding:5px 8px;border-bottom:1px solid var(--ant-color-border-secondary,#f0f0f0)}.cw-import-preview th{background:var(--ant-color-fill-quaternary,#fafafa);font-weight:500;color:var(--ant-color-text-secondary,#595959)}
</style>
