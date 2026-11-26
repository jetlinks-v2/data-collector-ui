<template>
  <section v-if="state.kind.value !== 'table' || state.detailsLoading.value || state.detailsError.value" class="cw-history-preview" :aria-label="$t('collectorHistory.title')">
    <header><a-radio-group v-model:value="state.source.value" size="small" :disabled="state.detailsLoading.value" :aria-label="$t('collectorHistory.source')"><a-radio-button v-for="source in state.sourceOptions.value" :key="source.value" :value="source.value">{{ source.label }}</a-radio-button></a-radio-group><small>{{ state.source.value === 'live' ? $t('collectorHistory.samples', { count: state.samples.value.length }) : $t(`collectorHistory.period.${state.period.value}`) }}</small></header>
    <a-spin :spinning="state.loading.value || state.detailsLoading.value">
      <p v-if="state.error.value || state.detailsError.value" role="alert">{{ state.error.value || state.detailsError.value }}</p>
      <div v-else-if="state.samples.value.length" class="cw-history-preview-chart"><JEcharts :option="option" :data-option="state.chartData.value" /></div>
      <a-empty v-else :image-style="{ height: '32px' }"><template #description><span class="cw-history-empty">{{ $t('collectorHistory.empty') }}</span></template></a-empty>
    </a-spin>
    <small v-if="state.source.value === 'live'">{{ $t(state.recording.value ? 'collectorHistory.recording' : 'collectorHistory.paused') }}</small>
  </section>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import type { usePointHistory } from '../../hook/usePointHistory'
const props = defineProps<{ state: ReturnType<typeof usePointHistory> }>()
const option = computed(() => ({ ...props.state.chartOption.value, grid: { left: 32, right: 8, top: props.state.isArray.value ? 28 : 12, bottom: 10, containLabel: true }, dataZoom: [] }))
</script>
<style scoped>
.cw-history-preview { display:flex; flex-direction:column; gap:6px; margin:8px 0; padding-top:8px; border-top:1px solid var(--line); }
.cw-history-preview>header { display:flex; align-items:center; justify-content:space-between; gap:8px; }
.cw-history-preview>.ant-spin-nested-loading { width:100%; }
.cw-history-preview-chart { height:180px; min-width:0; }
.cw-history-preview small,.cw-history-preview p { margin:0; color:var(--text-color-secondary); font-size:11px; }
.cw-history-empty { color:var(--text-color-secondary); font-size:12px; font-weight:400; line-height:20px; }
</style>
