<template>
  <div class="cw-history-table" role="table" :aria-label="$t('collectorHistory.table')" :aria-rowcount="(state.source.value === 'stored' ? state.total.value : state.samples.value.length) + 1">
    <div class="cw-history-table-head"><div class="cw-history-row" role="row" :style="{ transform: `translateX(${-scrollLeft}px)` }"><span role="columnheader">{{ $t('collectorHistory.time') }}</span><span role="columnheader">{{ $t('collectorHistory.value') }}</span><span role="columnheader">{{ $t('collectorHistory.reason') }}</span></div></div>
    <VirtualScroll class="cw-history-scroll" :style="{ height: '0px' }" :data="state.tableRows.value" :item-height="56" :expanded-key="state.expandedId.value" @reach-bottom="state.loadMore" @horizontal-scroll="scrollLeft = $event">
      <template #renderItem="record">
        <div class="cw-history-row" role="row" :aria-rowindex="record.rowIndex">
          <time role="cell" :datetime="new Date(record.timestamp).toISOString()" :title="state.formatTime(record.timestamp)"><span>{{ state.formatClock(record.timestamp) }}</span><small>{{ state.formatDate(record.timestamp) }}</small></time>
          <div role="cell" class="cw-history-reading"><span class="cw-history-value" :title="display(record.value)">{{ display(record.value) }}</span><a-button v-if="expandable(record.value)" type="text" size="small" :aria-label="`${$t('collectorHistory.details')} ${state.formatTime(record.timestamp)}`" :aria-expanded="state.expandedId.value === record.id" @click="state.expandedId.value = state.expandedId.value === record.id ? undefined : record.id"><AIcon :type="state.expandedId.value === record.id ? 'UpOutlined' : 'DownOutlined'" /></a-button></div>
          <span role="cell" class="cw-history-reason" :class="{ 'cw-history-reason-warning': record.reason === 'outlier' }">{{ reasons[record.reason] || record.reason || '—' }}</span>
        </div>
      </template>
      <template #expandedItem="record"><div class="cw-history-expanded"><small v-if="record.receivedAt">{{ $t('collectorHistory.received') }} {{ state.formatTime(record.receivedAt) }}</small><pre>{{ display(record.value) }}</pre></div></template>
    </VirtualScroll>
  </div>
</template>
<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { usePointHistory } from '../../hook/usePointHistory'
import { formatPointValue } from '../../../../utils/pointValue'
defineProps<{ state: ReturnType<typeof usePointHistory> }>()
const { t } = useI18n(), scrollLeft = ref(0)
const reasons = computed<Record<string, string>>(() => ({ normal: t('collectorHistory.normal'), outlier: t('PointHistoryData.Table.400159-0'), deadband: t('PointHistoryData.Table.400159-1') }))
const display = (value: unknown) => formatPointValue(value, t('collectorWorkspace.noData'))
const expandable = (value: unknown) => value !== null && typeof value === 'object' || typeof value === 'string' && (value.length > 100 || value.includes('\n'))
</script>
<style scoped>
.cw-history-table { display:flex; flex:1; flex-direction:column; min-height:0; min-width:0; border:1px solid var(--line); border-radius:var(--radius-sm,4px); overflow:hidden; }
.cw-history-table-head { overflow:hidden; flex:none; background:var(--bg-2,var(--bg-hover)); border-bottom:1px solid var(--line); }
.cw-history-row { display:grid; grid-template-columns:152px minmax(160px,1fr) 112px; align-items:center; gap:16px; box-sizing:border-box; min-width:480px; height:56px; padding:0 16px; border-bottom:1px solid var(--line); font-size:12px; }
.cw-history-table-head .cw-history-row { height:36px; border:0; color:var(--text-color-secondary); font-weight:500; }
.cw-history-scroll { flex:1; min-height:0; overflow:auto; }
.cw-history-row:hover { background:var(--bg-hover); }
time { display:flex; flex-direction:column; gap:2px; font-variant-numeric:tabular-nums; }
time>span { font-size:13px; }time>small,.cw-history-expanded>small { color:var(--text-color-secondary); font-size:11px; }
.cw-history-reading { display:flex; align-items:center; min-width:0; gap:4px; }
.cw-history-value { flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:13px; font-variant-numeric:tabular-nums; }
.cw-history-reading>.ant-btn { flex:none; }
.cw-history-reason { color:var(--text-color-secondary); }.cw-history-reason-warning { color:var(--ant-color-warning); }
.cw-history-expanded { min-width:480px; padding:12px 16px; background:var(--bg-hover); }
.cw-history-expanded pre { margin:0; max-height:260px; overflow:auto; white-space:pre-wrap; overflow-wrap:anywhere; font-size:12px; }
</style>
