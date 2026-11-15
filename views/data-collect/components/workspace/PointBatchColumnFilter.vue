<template>
  <a-popover v-model:open="open" trigger="click" placement="bottomRight" :get-popup-container="popupContainer" overlay-class-name="cw-workspace-popover">
    <a-tooltip :title="$t('collectorBatchFilter.filterColumn', { name: title })"><button type="button" class="cw-batch-filter-trigger" :class="{ active }" :disabled="disabled" :aria-label="$t('collectorBatchFilter.filterColumn', { name: title })" :aria-pressed="active" @click.stop><AIcon type="FilterOutlined" /></button></a-tooltip>
    <template #content>
      <div v-if="open" class="cw-batch-filter-panel" @keydown.stop @paste.stop>
        <a-input v-if="textFilter" :value="textValue" size="small" allow-clear :placeholder="$t('collectorBatchFilter.contains')" :aria-label="title" @update:value="updateText"><template #prefix><AIcon type="SearchOutlined" /></template></a-input>
        <ConfigSelect v-else-if="column === 'codec'" :value="filters.codecs" size="small" mode="multiple" :options="codecOptions" :max-tag-count="2" show-search allow-clear :placeholder="$t('collectorBatchFilter.all')" :aria-label="title" @update:value="(value: string[]) => $emit('change', { codecs: value })" />
        <ConfigSelect v-else-if="column === 'accessModes'" :value="filters.accessModes" size="small" mode="multiple" :options="modeOptions" :max-tag-count="2" allow-clear :placeholder="$t('collectorBatchFilter.all')" :aria-label="title" @update:value="(value: string[]) => $emit('change', { accessModes: value })" />
        <div v-else class="cw-batch-filter-range"><a-input-number :value="filters.minimum" size="small" :min="0" :precision="0" :placeholder="$t('collectorBatchFilter.minimum')" :aria-label="$t('collectorBatchFilter.minimum')" @update:value="value => $emit('change', { minimum: value == null ? undefined : Number(value) })" /><span>~</span><a-input-number :value="filters.maximum" size="small" :min="0" :precision="0" :placeholder="$t('collectorBatchFilter.maximum')" :aria-label="$t('collectorBatchFilter.maximum')" @update:value="value => $emit('change', { maximum: value == null ? undefined : Number(value) })" /><small>ms</small></div>
        <a-button size="small" type="link" :disabled="!active" @click="$emit('clear')"><AIcon type="ClearOutlined" />{{ $t('collectorBatchFilter.clear') }}</a-button>
      </div>
    </template>
  </a-popover>
</template>
<script setup lang="ts">
import { computed, ref } from 'vue'
import ConfigSelect from '../../../../components/ConfigSelect.vue'
import { batchFilterActive } from '../../../../utils/pointBatchFilter'
import type { BatchFilterColumn, PointBatchFilters } from '../../../../types/pointBatch'
defineOptions({ inheritAttrs: false })
const props = withDefaults(defineProps<{ column: BatchFilterColumn; title: string; filters: PointBatchFilters; codecOptions?: Array<{value:string;label:string;icon?:string;description?:string}>; modeOptions?: Array<{value:string;label:string;icon?:string;description?:string}>; disabled?: boolean }>(), {codecOptions:()=>[],modeOptions:()=>[]})
const emit=defineEmits<{ change: [patch: Partial<PointBatchFilters>]; clear: [] }>()
const open = ref(false), active = computed(() => batchFilterActive(props.filters, props.column))
const textFilter=computed(()=>!['codec','accessModes','interval'].includes(props.column))
const textValue=computed(()=>props.column.startsWith('plugin:')?props.filters.plugins[props.column.slice(7)] || '':props.filters[props.column as 'identity'|'address'|'byteLayout'])
function updateText(value:string){emit('change',props.column.startsWith('plugin:')?{plugins:{[props.column.slice(7)]:value}}:{[props.column]:value})}
const popupContainer = () => document.body
</script>
<style scoped>
.cw-batch-filter-trigger{display:inline-flex;flex:none;align-items:center;justify-content:center;width:24px;height:24px;padding:0;border:0;border-radius:4px;background:transparent;color:var(--ant-color-text-tertiary,#8c8c8c);cursor:pointer}.cw-batch-filter-trigger:hover,.cw-batch-filter-trigger.active{color:var(--ant-color-primary,#1677ff);background:var(--ant-color-primary-bg,#e6f4ff)}.cw-batch-filter-trigger:focus-visible{outline:1px solid var(--ant-color-primary,#1677ff);outline-offset:1px}.cw-batch-filter-panel{display:flex;flex-direction:column;gap:8px;width:248px;max-width:calc(100vw - 48px)}.cw-batch-filter-panel>.ant-btn{align-self:flex-end;font-size:12px;padding:0 4px}.cw-batch-filter-range{display:flex;align-items:center;gap:6px;color:var(--ant-color-text-tertiary,#8c8c8c)}.cw-batch-filter-range :deep(.ant-input-number){flex:1;min-width:0}.cw-batch-filter-panel :deep(.ant-select){width:100%}
</style>
