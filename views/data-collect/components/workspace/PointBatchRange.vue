<template>
  <div class="cw-range-panel">
    <a-checkbox v-if="controls.selectedTemplate.value" :checked="!!controls.templateKey.value" @change="(event:{target:{checked:boolean}}) => controls.templateKey.value = event.target.checked ? controls.selectedTemplate.value?.key : undefined">{{ $t('collectorBatchEfficiency.useTemplate', {name:controls.selectedTemplate.value.point.name}) }}</a-checkbox>
    <label>{{ $t('collectorBatch.startAddress') }}<a-input v-model:value="controls.start.value" size="small" :placeholder="$t('collectorBatch.startAddress')" /></label>
    <div class="cw-range-pair"><label>{{ $t('collectorBatch.pointCount') }}<a-input-number v-model:value="controls.count.value" size="small" :min="1" :max="10000" :precision="0" /></label><label>{{ $t('collectorBatch.step') }}<a-input-number v-model:value="controls.step.value" size="small" :min="1" :precision="0" :placeholder="$t('collectorBatch.automatic')" /></label></div>
    <label>{{ $t('collectorBatch.field.codec') }}<ConfigSelect v-model:value="controls.codec.value" size="small" kind="codec" :options="controls.codecOptions.value" allow-clear show-search :placeholder="$t(controls.templateKey.value ? 'collectorBatchDefault' : 'collectorBatch.fromTemplate')" /></label>
    <div class="cw-range-pair"><label>{{ $t('collectorBatchEfficiency.namePrefix') }}<a-input v-model:value="controls.namePrefix.value" size="small" :placeholder="$t('collectorBatchEfficiency.pluginDefault')" /></label><label>{{ $t('collectorBatchEfficiency.keyPrefix') }}<a-input v-model:value="controls.keyPrefix.value" size="small" :placeholder="$t('collectorBatchEfficiency.pluginDefault')" /></label></div>
    <label>{{ $t('collectorBatchEfficiency.numberStart') }}<a-input v-model:value="controls.numberStart.value" size="small" inputmode="numeric" /></label>
    <a-alert v-if="controls.rangePreview.value?.error" type="error" show-icon :message="controls.rangePreview.value.error" />
    <div v-else-if="controls.rangePreview.value?.rows.length" class="cw-range-preview"><small>{{ $t('collectorBatchEfficiency.preview') }}</small><div v-for="row in controls.rangePreview.value.rows" :key="row.key"><span :title="row.point.name">{{ row.point.name }}<small>{{ row.point.pointKey }}</small></span><code :title="row.address">{{ row.address }}</code></div></div>
    <small>{{ $t('collectorBatch.rangeHint') }}</small>
    <a-button size="small" type="primary" :disabled="!controls.rangePreview.value?.rows.length || !!controls.rangePreview.value.error" @click="controls.generate">{{ $t('collectorBatch.previewRange') }}</a-button>
  </div>
</template>
<script setup lang="ts">
import ConfigSelect from '../../../../components/ConfigSelect.vue'
import type { usePointBatchControls } from '../../hook/usePointBatchControls'
defineProps<{controls:ReturnType<typeof usePointBatchControls>}>()
</script>
<style scoped>
.cw-range-panel{max-height:calc(100vh - 96px);overflow-y:auto}
.cw-range-panel{display:flex;flex-direction:column;gap:10px;width:304px;max-width:calc(100vw - 48px);font-size:12px}.cw-range-panel label{display:flex;flex-direction:column;gap:4px}.cw-range-panel :deep(.ant-select),.cw-range-panel :deep(.ant-input-number){width:100%}.cw-range-panel :deep(.ant-checkbox-wrapper){font-size:12px}.cw-range-pair{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:10px}.cw-range-panel small{color:var(--ant-color-text-tertiary,#8c8c8c);font-size:11px}.cw-range-preview{padding:8px;border:1px solid var(--ant-color-border-secondary,#f0f0f0);border-radius:4px;background:var(--ant-color-fill-quaternary,#fafafa)}.cw-range-preview>div{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:4px}.cw-range-preview span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.cw-range-preview span small{display:block;overflow:hidden;text-overflow:ellipsis}.cw-range-preview code{max-width:45%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px}
</style>
