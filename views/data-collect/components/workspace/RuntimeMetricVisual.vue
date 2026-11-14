<template>
  <article class="cw-metric-tile" :class="{ unavailable: !available, 'is-distribution': histogram }">
    <a-tooltip :title="row.description || row.id" :trigger="['hover', 'focus']" placement="topLeft">
      <div class="cw-metric-tile-label" tabindex="0"><AIcon :type="row.icon" /><span>{{ row.name }}</span></div>
    </a-tooltip>
    <template v-if="histogram && available">
      <strong>{{ number(histogram.total) }}<small>{{ $t('collectorMonitoring.visual.total') }}</small></strong>
      <div class="cw-metric-histogram" role="img" :aria-label="histogramHint" tabindex="0" :title="histogramHint">
        <a-tooltip v-for="(bin, index) in histogram.bins" :key="index" :title="binHint(bin)">
          <span><i :style="{ height: `${bin.height}%` }" /></span>
        </a-tooltip>
      </div>
      <small class="cw-metric-visual-caption">{{ $t('collectorMonitoring.visual.distribution') }}</small>
    </template>
    <template v-else>
      <div class="cw-metric-reading"><strong :class="{ 'is-empty': !available }" :title="!available ? $t('collectorMonitoring.visual.notAvailableHint') : formatRuntimeMetric(row.value,row.definition,String,t,false)">{{ available ? row.text : $t(`collectorMonitoring.empty.${nodeAvailable ? row.emptyReason : 'unavailable'}`) }}</strong>
        <a-tooltip v-if="chart && available" :title="trendHint" :trigger="['hover', 'focus']">
          <svg class="cw-metric-sparkline" viewBox="0 0 120 30" role="img" :aria-label="trendHint" tabindex="0"><path :d="chart.path" /></svg>
        </a-tooltip>
      </div>
      <div class="cw-metric-visual-caption">
        <span v-if="relative && available" :class="{ scheduled: relative.future }"><AIcon :type="relative.future ? 'ClockCircleOutlined' : 'HistoryOutlined'" />{{ relativeText }}</span>
        <span v-else-if="counter && available"><AIcon type="LineChartOutlined" />{{ rateText }}<small>{{ $t('collectorMonitoring.visual.rate') }}</small></span>
        <span v-else-if="chart && available"><AIcon type="LineChartOutlined" />{{ $t('collectorMonitoring.visual.recent') }}</span>
        <span v-else-if="available && supportsMetricTrend(row)">{{ $t('collectorMonitoring.visual.waiting') }}</span>
        <span v-if="windowText" class="cw-metric-window"><AIcon type="FieldTimeOutlined" />{{ windowText }}</span>
      </div>
    </template>
  </article>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import dayjs from 'dayjs'
import { formatRuntimeMetric } from '../../../../utils/runtimePresentation'
import { metricSparkline, metricHistogram, metricRelativeTime, supportsMetricTrend, type RuntimeMetricRow, type MetricTrend } from '../../../../utils/runtimeMetricVisuals'

const props = defineProps<{ row: RuntimeMetricRow; trend?: MetricTrend; nodeAvailable: boolean }>()
const { t, locale } = useI18n()
const available = computed(() => props.nodeAvailable && props.row.available)
const counter = computed(() => props.row.definition?.expands?.metric?.kind === 'counter')
const chart = computed(() => metricSparkline(props.trend))
const histogram = computed(() => metricHistogram(props.row))
const relative = computed(() => metricRelativeTime(props.row))
const relativeText = computed(() => relative.value ? new Intl.RelativeTimeFormat(locale.value, { numeric: 'auto' }).format(relative.value.value, relative.value.unit) : '')
const formatter = computed(() => new Intl.NumberFormat(locale.value, { maximumFractionDigits: 2 }))
const number = (value: number) => formatter.value.format(value)
const format = (value: number) => formatRuntimeMetric(value, props.row.definition, String, t)
const rate = computed(() => props.trend?.points.at(-1)?.value)
const rateText = computed(() => available.value && rate.value != null ? `${format(rate.value)}/s` : t(`collectorMonitoring.empty.${available.value ? 'calculating' : props.nodeAvailable ? props.row.emptyReason : 'unavailable'}`))
const trendHint = computed(() => chart.value ? t('collectorMonitoring.visual.trendHint', {
  from: dayjs(chart.value.start).format('HH:mm:ss'), to: dayjs(chart.value.end).format('HH:mm:ss'),
  min: `${format(chart.value.min)}${counter.value ? '/s' : ''}`, max: `${format(chart.value.max)}${counter.value ? '/s' : ''}`,
}) : '')
const windowText = computed(() => {
  const { windowStart, windowEnd } = props.row
  return available.value && typeof windowStart === 'number' && typeof windowEnd === 'number' && windowEnd > windowStart
    ? `${dayjs(windowStart).format('HH:mm')}–${dayjs(windowEnd).format('HH:mm')}` : ''
})
type Bin = NonNullable<ReturnType<typeof metricHistogram>>['bins'][number]
function binHint(bin: Bin) {
  const range = bin.upper == null ? `> ${format(bin.lower!)}` : bin.lower == null ? `≤ ${format(bin.upper)}` : `(${format(bin.lower)}, ${format(bin.upper)}]`
  return `${range} · ${number(bin.count)} · ${number(bin.share * 100)}%`
}
const histogramHint = computed(() => histogram.value?.bins.map(binHint).join('\n') || '')
</script>
