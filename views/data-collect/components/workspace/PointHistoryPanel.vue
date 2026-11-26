<template>
  <a-drawer :open="state.open.value && !state.preview.value" :width="'min(960px, 100vw)'" :body-style="{ display: 'flex', padding: '16px 20px', overflow: 'hidden' }" destroy-on-close @close="state.close" @after-open-change="state.afterOpenChange">
    <template #title><span>{{ state.point.value?.name }} · {{ $t('collectorHistory.title') }}</span></template>
    <section class="collection-workspace cw-history-panel">
      <div class="cw-history-identity"><small>{{ state.summary.value }}</small><span class="cw-history-storage">{{ $t(state.stored.value === undefined ? 'collectorHistory.storageUnknown' : state.stored.value ? 'collectorHistory.storageOn' : 'collectorHistory.notStored') }}</span><j-permission-button type="text" size="small" hasPermission="data-collect:update" :disabled="state.detailsLoading.value" @click="state.configure"><AIcon type="SettingOutlined" />{{ $t('collectorProcessing.storage') }}</j-permission-button></div>
      <a-alert v-if="state.detailsError.value" type="warning" show-icon :message="state.detailsError.value" />
      <div class="cw-history-toolbar">
        <a-radio-group v-model:value="state.source.value" size="small" :disabled="state.detailsLoading.value" :aria-label="$t('collectorHistory.source')"><a-radio-button v-for="source in state.sourceOptions.value" :key="source.value" :value="source.value">{{ source.label }}</a-radio-button></a-radio-group>
        <div v-if="state.source.value === 'stored'" class="cw-history-controls">
          <a-select size="small" v-model:value="state.period.value" :options="state.periodOptions.value" :aria-label="$t('collectorHistory.timeRange')" />
          <a-range-picker v-if="state.period.value === 'custom'" size="small" v-model:value="state.range.value" show-time :allow-clear="false" :placeholder="[$t('collectorHistory.from'), $t('collectorHistory.to')]" />
          <a-select v-if="state.kind.value === 'number'" size="small" v-model:value="state.aggregation.value" :options="state.aggregateOptions.value" :aria-label="$t('collectorHistory.aggregation')" />
          <a-select v-if="state.effectiveAggregation.value !== 'raw'" size="small" v-model:value="state.interval.value" :options="state.intervalOptions.value" :aria-label="$t('collectorHistory.granularity')" />
          <a-button size="small" :loading="state.loading.value" :aria-label="$t('collectorWorkspace.refresh')" @click="state.refresh"><AIcon type="ReloadOutlined" /></a-button>
        </div>
        <div v-else class="cw-history-controls"><a-button size="small" @click="state.paused.value = !state.paused.value"><AIcon :type="state.paused.value ? 'PlayCircleOutlined' : 'PauseOutlined'" />{{ $t(state.paused.value ? 'collectorHistory.resume' : 'collectorHistory.pause') }}</a-button><small>{{ $t(state.recording.value ? 'collectorHistory.recording' : 'collectorHistory.paused') }} · {{ $t('collectorHistory.samples', { count: state.samples.value.length }) }}</small></div>
        <a-radio-group class="cw-history-view" :value="state.kind.value === 'table' ? 'table' : state.view.value" size="small" :aria-label="$t('collectorHistory.view')" @change="state.view.value = $event.target.value"><a-radio-button value="chart" :disabled="state.kind.value === 'table'">{{ $t('collectorHistory.chart') }}</a-radio-button><a-radio-button value="table">{{ $t('collectorHistory.table') }}</a-radio-button></a-radio-group>
      </div>
      <div v-if="state.selectedRange.value" class="cw-history-controls cw-history-window"><small>{{ state.formatTime(state.selectedRange.value[0]) }} — {{ state.formatTime(state.selectedRange.value[1]) }}</small><a-button type="link" size="small" @click="state.resetZoom">{{ $t('collectorHistory.resetRange') }}</a-button></div>
      <div v-if="state.isArray.value && state.view.value === 'chart'" class="cw-history-controls"><span>{{ $t('collectorHistory.index') }}</span><a-input-number size="small" v-model:value="state.indexInput.value" :min="0" :max="state.maxIndex.value" :precision="0" :controls="false" :aria-label="$t('collectorHistory.index')" /><a-button size="small" :disabled="!state.canAddIndex.value" @click="state.addIndex"><AIcon type="PlusOutlined" />{{ $t('collectorWorkspace.add') }}</a-button><a-tag v-for="index in state.indices.value" :key="index" closable @close.prevent="state.removeIndex(index)">[{{ index }}]</a-tag></div>
      <a-alert v-if="state.source.value === 'live' && (state.streamError.value || state.pagePaused.value || state.buffer.value?.skipped)" type="warning" show-icon :message="state.streamError.value || (state.pagePaused.value ? $t('collectorWorkspace.paused') : $t('collectorHistory.skipped', { count: state.buffer.value?.skipped }))" />
      <div v-if="state.loading.value || state.detailsLoading.value" class="cw-history-placeholder"><a-spin /></div>
      <PointHistoryTable v-else-if="state.samples.value.length && (state.kind.value === 'table' || state.view.value === 'table')" :state="state" />
      <div v-else-if="state.samples.value.length" class="cw-history-chart"><JEcharts :option="state.chartOption.value" :data-option="state.chartData.value" :events="state.chartEvents" /></div>
      <div v-else class="cw-history-placeholder"><a-empty :image-style="{ height: '64px' }"><template #description><span class="cw-history-empty">{{ state.error.value || $t('collectorHistory.empty') }}</span></template></a-empty></div>
      <footer class="cw-history-footer" aria-live="polite">
        <template v-if="state.source.value === 'stored'">
          <small>{{ $t('collectorHistory.loaded', { count: state.samples.value.length, total: state.total.value }) }}</small>
          <small v-if="state.chartLimited.value && state.view.value === 'chart'">{{ $t('collectorHistory.chartLimit', { count: state.chartLimit }) }}</small>
          <small v-if="state.effectiveAggregation.value !== 'raw'">{{ $t('collectorHistory.aggregateHint') }}<template v-if="state.samples.value.length >= 500"> {{ $t('collectorHistory.aggregateLimit') }}</template></small>
          <small v-if="state.stored.value === false">{{ $t('collectorHistory.storageHint') }}</small>
          <span v-if="state.error.value" class="cw-history-error" role="alert">{{ state.error.value }}</span>
          <a-button v-if="state.error.value || state.hasMore.value && (state.view.value === 'table' || state.kind.value === 'table')" type="link" size="small" :loading="state.loadingMore.value" @click="state.samples.value.length ? state.loadMore() : state.refresh()">{{ $t(state.error.value ? 'collectorWorkspace.retry' : 'collectorHistory.loadMore') }}</a-button>
          <a-spin v-else-if="state.loadingMore.value" size="small" />
        </template>
        <template v-else><small>{{ $t('collectorHistory.localHint') }}</small><small v-if="state.buffer.value?.evicted">{{ $t('collectorHistory.evicted', { count: state.buffer.value.evicted }) }}</small></template>
        <small v-if="state.kind.value === 'state' || state.kind.value === 'array-state'">{{ $t('collectorHistory.stateHint') }}</small>
      </footer>
    </section>
  </a-drawer>
</template>
<script setup lang="ts">
import type { usePointHistory } from '../../hook/usePointHistory'
import PointHistoryTable from './PointHistoryTable.vue'
defineProps<{ state: ReturnType<typeof usePointHistory> }>()
</script>
<style scoped>
.cw-history-panel { display:flex; flex:1; flex-direction:column; min-height:0; min-width:0; gap:12px; font-size:12px; }
.cw-history-identity,.cw-history-controls,.cw-history-toolbar { display:flex; align-items:center; flex-wrap:wrap; gap:8px; }
.cw-history-identity { gap:12px; }.cw-history-identity>small { flex:1; min-width:0; overflow-wrap:anywhere; }
.cw-history-identity>small,.cw-history-storage,.cw-history-footer small,.cw-history-controls>small { color:var(--text-color-secondary); font-size:12px; }
.cw-history-toolbar { padding-bottom:12px; border-bottom:1px solid var(--line); gap:8px 16px; }
.cw-history-view { margin-left:auto; }.cw-history-controls>.ant-select { min-width:112px; }.cw-history-controls>.ant-input-number { width:72px; }.cw-history-controls>.ant-tag { margin:0; }
.cw-history-window { justify-content:space-between; }.cw-history-window>small { font-variant-numeric:tabular-nums; }
.cw-history-chart { flex:1; min-height:160px; min-width:0; }
.cw-history-placeholder { flex:1; min-height:120px; display:flex; align-items:center; justify-content:center; }
.cw-history-footer { display:flex; flex:none; align-items:center; flex-wrap:wrap; gap:4px 12px; padding-top:8px; border-top:1px solid var(--line); }
.cw-history-footer>small { line-height:20px; }.cw-history-footer>.ant-btn { margin-left:auto; }
.cw-history-error { color:var(--ant-color-error); }.cw-history-empty { color:var(--text-color-secondary); font-size:12px; font-weight:400; line-height:20px; }
</style>
