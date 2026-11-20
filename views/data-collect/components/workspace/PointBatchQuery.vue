<template>
  <div class="cw-batch-query">
    <a-input :value="state.filters.value.search" size="small" allow-clear :placeholder="$t('collectorBatchEfficiency.search')" :aria-label="$t('collectorBatchEfficiency.search')" :disabled="state.saving.value" @update:value="(value:string) => state.updateFilters({search:value || ''})"><template #prefix><AIcon type="SearchOutlined" /></template></a-input>
    <a-radio-group :value="state.filters.value.review" size="small" :disabled="state.saving.value" @change="(event:{target:{value:PointBatchFilters['review']}}) => state.updateFilters({review:event.target.value})">
      <a-radio-button value="all">{{ $t('collectorBatchEfficiency.all') }} <small>{{ state.rows.value.length }}</small></a-radio-button>
      <a-radio-button value="changed">{{ $t('collectorBatchEfficiency.changed') }} <small>{{ state.counts.value.added + state.counts.value.modified + state.counts.value.deleted }}</small></a-radio-button>
      <a-radio-button value="issues">{{ $t('collectorBatchEfficiency.issues') }} <small>{{ state.counts.value.errors }}</small></a-radio-button>
    </a-radio-group>
    <a-popover trigger="click" placement="bottomRight" overlay-class-name="cw-workspace-popover">
      <a-button size="small" type="text" :disabled="state.saving.value" :aria-label="$t('collectorBatchEfficiency.columns')"><AIcon type="TableOutlined" />{{ $t('collectorBatchEfficiency.columns') }}</a-button>
      <template #content><div class="cw-batch-columns"><small>{{ $t('collectorBatchEfficiency.columnsHint') }}</small><a-checkbox v-for="column in state.columns.value" :key="column.key" :checked="!state.hiddenColumns.value.includes(column.key)" :disabled="['name','pointKey'].includes(column.key)" @change="state.toggleColumn(column.key)">{{ column.title }}</a-checkbox></div></template>
    </a-popover>
  </div>
</template>
<script setup lang="ts">
import type { PointBatchEditorState } from '../../hook/usePointBatchEditor'
import type { PointBatchFilters } from '../../../../types/pointBatch'
defineProps<{state:PointBatchEditorState}>()
</script>
<style scoped>
.cw-batch-query{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.cw-batch-query>.ant-input-affix-wrapper{flex:1 1 200px;max-width:360px}.cw-batch-query :deep(.ant-radio-button-wrapper){font-size:12px;padding-inline:9px}.cw-batch-query small{font-variant-numeric:tabular-nums;color:var(--ant-color-text-tertiary,#8c8c8c)}.cw-batch-query>.ant-btn{margin-left:auto;font-size:12px}.cw-batch-columns{display:flex;flex-direction:column;gap:8px;max-height:50vh;overflow:auto;width:228px}.cw-batch-columns>small{font-size:12px;color:var(--ant-color-text-tertiary,#8c8c8c)}.cw-batch-columns :deep(.ant-checkbox-wrapper){margin:0;font-size:12px}
</style>
