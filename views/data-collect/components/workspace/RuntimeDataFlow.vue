<template>
  <div v-if="object.runtime?.available" class="cw-data-flow">
    <div v-if="!point" class="cw-collection-path" :aria-label="$t('collectorMonitoring.path.label')">
      <div v-for="step in path" :key="step.id" class="cw-collection-step" :class="{bad:step.failed}" :title="$t(step.hint)">
        <span class="cw-collection-step-name"><AIcon :type="step.failed ? 'WarningOutlined' : step.icon" />{{ $t(`collectorMonitoring.path.${step.id}`) }}</span>
        <strong v-if="step.value != null">{{ number(step.value) }}<small>/s</small></strong>
        <small v-else>{{ $t('collectorMonitoring.empty.calculating') }}</small>
      </div>
    </div>
    <div v-if="point && cadence && compact" class="cw-cadence-inline" :class="{'is-stale':stale}" :title="intervalHint">
      <span><AIcon type="FieldTimeOutlined" />{{ $t('collectorMonitoring.path.every',{time:milliseconds(expected)}) }}</span>
      <span class="cw-cadence-current"><span>{{ $t(stale ? 'collectorMonitoring.previousInterval' : 'collectorMonitoring.scheduledInterval') }}</span><strong>{{ actual == null ? $t(cadence.count ? 'collectorMonitoring.awaitingMore' : 'collectorMonitoring.awaitingFirst') : milliseconds(actual) }}</strong></span>
    </div>
    <div v-else-if="point && cadence" class="cw-read-cadence" :class="{'is-stale':stale}" :title="intervalHint">
      <div class="cw-cadence-heading"><span><AIcon type="FieldTimeOutlined" />{{ $t('collectorMonitoring.path.every',{time:milliseconds(expected)}) }}</span><span>{{ $t(stale ? 'collectorMonitoring.previousInterval' : 'collectorMonitoring.arrivalInterval') }}</span></div>
      <div class="cw-read-interval" role="img" :aria-label="intervalHint">
        <span>{{ $t('collectorMonitoring.path.previousRead') }}</span>
        <div class="cw-read-gap" :class="{'is-waiting':actual == null}"><i /><time>{{ actual == null ? $t(cadence.count ? 'collectorMonitoring.awaitingMore' : 'collectorMonitoring.awaitingFirst') : milliseconds(actual) }}</time><i /></div>
        <span>{{ $t('collectorMonitoring.path.currentRead') }}</span>
      </div>
    </div>
    <div v-else-if="point && showRuntimeMetric(object,actual,['lastReceivedIntervalNanos'])" class="cw-interval" :title="intervalHint">
      <AIcon type="FieldTimeOutlined" />
      <span class="cw-interval-label">{{ $t('collectorMonitoring.arrivalInterval') }}</span>
      <span class="cw-interval-value" :class="{'is-empty':actual == null}">{{ actual == null ? $t(`collectorMonitoring.empty.${intervalEmpty}`) : milliseconds(actual) }}</span>
    </div>
    <div v-if="point && cadence && (!compact || stale || (cadence.count > 0 && cadence.quantityRatio != null))" class="cw-cadence-summary">
      <span v-if="!compact && actual != null" :title="$t('collectorMonitoring.periodHint')"><AIcon type="ColumnWidthOutlined" />{{ $t(actual === cadence.expectedMillis ? 'collectorMonitoring.matchingPeriod' : actual > cadence.expectedMillis ? 'collectorMonitoring.slowerBy' : 'collectorMonitoring.fasterBy',{time:milliseconds(Math.abs(actual-cadence.expectedMillis))}) }}</span>
      <span v-if="cadence.quantityRatio != null" :title="$t('collectorMonitoring.quantityHint',{time:milliseconds(cadence.windowMillis)})"><AIcon type="BarChartOutlined" />{{ $t('collectorMonitoring.quantityComparison',{value:number(cadence.quantityRatio*100)}) }}</span>
      <span v-if="cadence.ageNanos != null && (compact ? stale : cadence.quantityRatio == null || stale)" :class="{warn:stale}" :title="$t(stale ? 'collectorMonitoring.longGapHint' : 'collectorMonitoring.scheduledAgeHint')"><AIcon type="HistoryOutlined" />{{ $t('collectorMonitoring.readAgo',{time:milliseconds(cadence.ageNanos/1e6)}) }}</span>
    </div>
    <div v-if="!sparse && total > 0 && hasOtherOutcomes" class="cw-outcome-bar" role="img" :aria-label="flowHint" :title="flowHint">
      <i v-for="item in segments" :key="item.id" :class="item.id" :style="{width:`${item.value/total*100}%`}" />
    </div>
    <div v-if="filtered || monitoring?.processing || (!sparse && hasOtherOutcomes)" class="cw-flow-summary">
      <a-popover v-if="filtered" :trigger="['hover','focus','click']" placement="bottom" :destroy-tooltip-on-hide="true" overlay-class-name="cw-filter-overlay">
        <template #content><div class="cw-filter-details"><strong>{{ $t('collectorMonitoring.ignored') }}</strong><div v-for="item in filters" :key="item.id"><span><AIcon :type="item.icon" />{{ $t(`collectorMonitoring.filterReasons.${item.id}`) }}</span><b>{{ number(item.value) }}<small>{{ flowUnit }}</small></b></div><small>{{ $t('collectorMonitoring.filterHint') }}</small></div></template>
        <button class="cw-flow-filter" :aria-label="$t('collectorMonitoring.ignored')" @click.stop><AIcon type="FilterOutlined" />{{ number(filtered) }}<small>{{ flowUnit }}</small><AIcon type="DownOutlined" /></button>
      </a-popover>
      <span v-if="!sparse && monitoring?.outcomes && (monitoring.outcomes.failed + monitoring.outcomes.rejected) > 0" class="bad" :title="$t('collectorMonitoring.failedHint')"><AIcon type="WarningOutlined" />{{ number(monitoring.outcomes.failed + monitoring.outcomes.rejected) }}<small>/s</small></span>
      <span v-if="monitoring?.processing" class="warn" :title="$t('collectorMonitoring.processingHint')"><AIcon type="HourglassOutlined" />{{ number(monitoring.processing) }}</span>
      <small v-if="!sparse && total > 0 && hasOtherOutcomes" class="cw-flow-share">{{ $t('collectorMonitoring.outputShare',{value:number((monitoring?.outcomes?.output || 0)/total*100)}) }}</small>
    </div>
    <div v-if="retrySeconds != null" class="cw-flow-note warn"><AIcon type="ClockCircleOutlined" />{{ $t('collectorMonitoring.retryAfter',{seconds:retrySeconds}) }}</div>
    <div v-if="!point || (!compact && monitoring?.rateWindowMillis != null && (!cadence || cadence.quantityRatio != null))" class="cw-flow-window">
      <span v-if="!point" :class="{bad:readFailed}" :title="$t('collectorMonitoring.collectionHint')"><AIcon :type="readFailed ? 'WarningOutlined' : 'FieldTimeOutlined'" />{{ $t('collectorMonitoring.path.executions') }} <b>{{ number(monitoring?.collectionRate) }}</b><small v-if="monitoring?.collectionRate != null">{{ $t('collectorMonitoring.path.runsPerSecond') }}</small></span>
      <span v-if="monitoring?.rateWindowMillis != null">{{ $t('collectorMonitoring.rateWindow',{time:milliseconds(monitoring.rateWindowMillis)}) }}</span>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { CollectorObject } from '../../../../types/workspace'
import { objectDisplayState, stateValue } from '../../../../types/workspace'
import { runtimeMetricEmptyState, showRuntimeMetric } from '../../../../utils/runtimeMonitoring'
import { formatMetricQuantity } from '../../../../utils/runtimePresentation'

const props=defineProps<{object:CollectorObject;point?:boolean;compact?:boolean}>()
const { t,locale }=useI18n()
const monitoring=computed(()=>props.object.monitoring)
const formatter=computed(()=>new Intl.NumberFormat(locale.value,{maximumFractionDigits:1}))
const number=(value?:number)=>value == null ? t('collectorMonitoring.empty.noSamples') : formatter.value.format(value)
const cadence=computed(()=>monitoring.value?.cadence)
const sparse=computed(()=>Boolean(cadence.value && (cadence.value.windowMillis == null || cadence.value.windowMillis/cadence.value.expectedMillis < 20)))
const filtered=computed(()=>sparse.value ? monitoring.value?.filteredTotal : monitoring.value?.filteredRate)
const flowUnit=computed(()=>sparse.value ? '' : '/s')
const filterValues=computed(()=>sparse.value ? monitoring.value?.filterTotals : monitoring.value?.filterRates)
const expected=computed(()=>cadence.value?.expectedMillis)
const actual=computed(()=>{
  const value=cadence.value ? cadence.value.intervalNanos : monitoring.value?.receivedIntervalNanos
  return value == null ? undefined : value/1e6
})
const intervalEmpty=computed(()=>{
  const state=runtimeMetricEmptyState(props.object,['lastReceivedIntervalNanos'])
  return state === 'calculating' ? 'waitingData' : state
})
// Task executions and received values have different units; do not present them as consecutive stages.
const readFailed=computed(()=>['collect','read','request','connect'].includes(props.object.runtime?.currentFailure?.stage || ''))
const path=computed(()=>[
  {id:'received',icon:'DotChartOutlined',value:monitoring.value?.sampleRate,hint:'collectorMonitoring.sampleRateHint',failed:readFailed.value},
  {id:'output',icon:'SendOutlined',value:monitoring.value?.outputRate,hint:'collectorMonitoring.outputHint',failed:props.object.runtime?.currentFailure?.stage === 'output'},
  {id:'filtered',icon:'FilterOutlined',value:monitoring.value?.filteredRate,hint:'collectorMonitoring.filterHint',failed:false},
])
const milliseconds=(value?:number)=>{
  if(value == null)return t('collectorMonitoring.empty.noSamples')
  const display=formatMetricQuantity(value,'milliseconds',number)!
  return `${display.value} ${display.unit}`
}
const intervalHint=computed(()=>{
  if(cadence.value && actual.value == null)return `${t('collectorMonitoring.configured')} ${milliseconds(expected.value)} · ${t('collectorMonitoring.actual')} ${t(cadence.value.count ? 'collectorMonitoring.awaitingMore' : 'collectorMonitoring.awaitingFirst')}`
  return cadence.value ? t('collectorMonitoring.scheduledIntervalHint',{actual:milliseconds(actual.value),difference:`${actual.value! >= cadence.value.expectedMillis ? '+' : '−'}${milliseconds(Math.abs(actual.value!-cadence.value.expectedMillis))}`}) : t('collectorMonitoring.intervalHint',{expected:milliseconds(expected.value),actual:actual.value == null ? t(`collectorMonitoring.empty.${intervalEmpty.value}`) : milliseconds(actual.value),collection:milliseconds(monitoring.value?.collectionIntervalNanos == null ? undefined : monitoring.value.collectionIntervalNanos/1e6),output:milliseconds(monitoring.value?.outputIntervalNanos == null ? undefined : monitoring.value.outputIntervalNanos/1e6)})
})
const segments=computed(()=>{
  const values=monitoring.value?.outcomes
  return values ? [{id:'output',value:values.output},{id:'filtered',value:values.filtered},{id:'failed',value:values.failed+values.rejected},{id:'other',value:values.cancelled+values.outOfOrder}] : []
})
const total=computed(()=>segments.value.reduce((sum,item)=>sum+item.value,0))
const hasOtherOutcomes=computed(()=>segments.value.some(item=>item.id !== 'output' && item.value > 0))
const flowHint=computed(()=>t('collectorMonitoring.flowHint',{output:number(monitoring.value?.outcomes?.output),filtered:number(monitoring.value?.outcomes?.filtered),failed:number(monitoring.value?.outcomes?.failed),rejected:number(monitoring.value?.outcomes?.rejected),other:number((monitoring.value?.outcomes?.cancelled || 0)+(monitoring.value?.outcomes?.outOfOrder || 0))}))
const filters=computed(()=>[
  {id:'outlier',icon:'FilterOutlined',value:filterValues.value?.outlier},
  {id:'unchanged',icon:'PauseOutlined',value:filterValues.value?.unchanged},
  {id:'deadband',icon:'ColumnWidthOutlined',value:filterValues.value?.deadband},
  {id:'conversion',icon:'FunctionOutlined',value:filterValues.value?.conversion},
].filter(item=>item.value != null))
const retrySeconds=computed(()=>props.object.runtime?.protectionState === 'retrying' && monitoring.value?.nextRetryTime != null
  ? Math.max(0,Math.ceil((monitoring.value.nextRetryTime-monitoring.value.timestamp)/1000)) : undefined)
// 年龄使用服务端单调时钟的时长，页面只随已有采样更新，不新增逐卡定时器。
const stale=computed(()=>!['disabled','paused','stopped'].includes(stateValue(objectDisplayState(props.object))) && cadence.value?.ageNanos != null && cadence.value.ageNanos/1e6 > cadence.value.expectedMillis*2)
</script>
