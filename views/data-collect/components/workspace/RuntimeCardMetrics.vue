<template>
  <div v-if="variant === 'summary'" class="cw-collector-data">
    <RuntimeDataFlow v-if="object.runtime" :object="object" />
    <a-skeleton v-else active :title="false" :paragraph="{rows:2,width:['90%','60%']}" :aria-label="$t('collectorWorkspace.loading')" />
  </div>
  <a-popover v-if="variant !== 'summary'" :open="variant !== 'values' && !detailsOpen && open" @open-change="open = variant !== 'values' && $event" :trigger="variant === 'values' ? [] : ['hover', 'focus']" :mouse-enter-delay="0.15" :mouse-leave-delay="0.15" :arrow="true" :placement="variant === 'navigation' || variant === 'group' ? 'rightTop' : 'bottomRight'" :destroy-tooltip-on-hide="true" overlay-class-name="cw-workspace-popover cw-monitoring-overlay">
    <template #content>
      <div class="cw-monitoring-panel">
        <div class="cw-monitoring-title"><strong>{{ $t('collectorMonitoring.monitoring') }}</strong><WorkspaceStatus v-if="object.runtime" :object="object" /></div>
        <div class="cw-monitoring-meta"><span v-if="object.monitoring" :title="$t('collectorMonitoring.nodesHint')"><AIcon type="ClusterOutlined" /> {{ object.monitoring.nodeCount }} {{ $t('collectorMonitoring.nodes') }}</span><time>{{ sampledAt }}</time></div>
        <p v-if="!object.runtime?.available" class="cw-monitoring-empty">{{ $t(object.runtime ? 'collectorWorkspace.unavailable' : 'collectorMonitoring.waiting') }}</p>
        <template v-else>
          <div class="cw-monitoring-values">
            <div v-for="item in visibleMetrics" :key="item.key" :title="`${$t(item.hint)}${hasValue(item.value) ? `\n${item.value} ${item.unit}` : ''}`"><span><AIcon :type="item.icon" aria-hidden="true" />{{ $t(item.label) }}</span><strong v-if="hasValue(item.value)">{{ quantity(item).value }}<small v-if="quantity(item).unit">{{ quantity(item).unit }}</small></strong><a-tooltip v-else :title="$t('collectorMonitoring.empty.calculating')"><a-skeleton-input class="cw-metric-skeleton" active size="small" :aria-label="$t('collectorMonitoring.empty.calculating')" /></a-tooltip></div>
          </div>
          <RuntimePointSummary v-if="kind === 'collector'" :summary="object.monitoring?.pointSummary" compact />
          <RuntimeFailureNotice :object="object" attention-only />
        </template>
        <a-button type="link" block size="small" class="cw-monitoring-more" @click.stop="showDetails"><span>{{ $t('collectorMonitoring.allMetrics') }}</span><span><small v-if="metricCount">{{ metricCount }}</small><AIcon type="RightOutlined" /></span></a-button>
      </div>
    </template>
    <div v-if="variant === 'navigation'" class="cw-nav-runtime" :class="tone" @keydown.esc.stop="open = false">
      <button class="cw-nav-status" :class="{'is-open':open}" :aria-label="navigationLabel" :aria-expanded="open || detailsOpen" @click.stop="showDetails">
        <a-skeleton-input v-if="!object.runtime" active size="small" class="cw-metric-skeleton cw-nav-skeleton" :aria-label="$t('collectorWorkspace.loading')" />
        <template v-else>
          <i v-if="!indicators.length" class="cw-dot" :class="tone" />
          <template v-if="indicators.length"><span v-for="item in indicators.slice(0,2)" :key="item.id" class="cw-nav-state" :class="item.tone">{{ item.id === 'state' ? stateText : $t(`collectorMonitoring.attentionShort.${item.id}`,{count:item.count}) }}</span></template>
          <span v-else class="cw-nav-state">{{ stateText }}</span>
          <span v-for="item in navigationMetrics" :key="item.key" class="cw-nav-metric" :title="`${$t(item.label)} · ${$t(item.hint)}`"><AIcon :type="item.icon" aria-hidden="true" /><b>{{ quantity(item).value }}</b><small v-if="quantity(item).unit">{{ quantity(item).unit }}</small></span>
        </template>
      </button>
    </div>
    <button v-else-if="variant === 'group'" class="cw-nav-runtime cw-nav-channel-runtime" :class="tone" :aria-label="`${object.name} · ${label}${indicators.length ? '' : ` · ${stateText}`}`" :aria-expanded="open || detailsOpen" @click.stop="showDetails" @keydown.esc.stop="open = false">
      <a-skeleton-avatar v-if="!object.runtime" active shape="circle" :size="6" :aria-label="$t('collectorWorkspace.loading')" />
      <i v-else class="cw-dot" :class="tone" />
    </button>
    <component v-else :is="variant === 'values' ? 'span' : 'button'" class="cw-runtime-indicators" :class="{ 'cw-runtime-values': variant === 'values', 'cw-runtime-status': variant === 'status' }" :aria-label="variant === 'values' ? undefined : label" :aria-expanded="variant === 'values' ? undefined : open || detailsOpen" @click.stop="variant !== 'values' && showDetails()" @keydown.esc.stop="open = false">
      <WorkspaceStatus v-if="variant === 'status'" :object="object" :icon-only="kind === 'point'" />
      <span v-if="variant !== 'status' && (kind === 'point' || kind === 'channel') && keyMetrics.length" class="cw-runtime-key-values"><span v-for="item in keyMetrics" :key="item.key" :title="`${$t(item.label)} · ${item.unit}\n${$t(item.hint)}${hasValue(item.value) ? `\n${item.value} ${item.unit}` : ''}`"><AIcon :type="item.icon" /><small v-if="kind === 'point'" class="cw-runtime-metric-label">{{ $t(item.label) }}</small><template v-if="hasValue(item.value)">{{ quantity(item).value }}<small>{{ quantity(item).unit }}</small></template><a-tooltip v-else :title="$t('collectorMonitoring.empty.calculating')"><a-skeleton-input class="cw-metric-skeleton" active size="small" :aria-label="$t('collectorMonitoring.empty.calculating')" /></a-tooltip></span></span>
      <span v-for="item in variant === 'status' || variant === 'values' ? [] : indicators" :key="item.id" :class="item.tone"><AIcon :type="item.icon" /><small v-if="item.count != null">{{ item.count }}</small></span>
      <AIcon v-if="variant !== 'values' && variant !== 'status'" type="LineChartOutlined" />
    </component>
  </a-popover>
  <RuntimeMetricDetails v-if="detailsOpen" :open="detailsOpen" :object="object" :kind="kind" :nodes="metricNodes" :loading="metadata.loading.value" :metadata-error="metadata.error.value" @close="detailsOpen = false" @diagnostic-visibility="setDiagnosticVisible"><template v-if="$slots.diagnostic" #diagnostic><slot name="diagnostic" /></template></RuntimeMetricDetails>
</template>
<script setup lang="ts">
import { computed, defineAsyncComponent, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import dayjs from 'dayjs'
import type { CollectorObject, EntityKind, MetricSnapshot } from '../../../../types/workspace'
import { objectStateText, objectTone } from '../../../../types/workspace'
import { runtimeIndicators, runtimePrimaryMetrics, showRuntimeMetric } from '../../../../utils/runtimeMonitoring'
import { formatMetricQuantity, runtimeMetricRows } from '../../../../utils/runtimePresentation'
import { useRuntimeMetricMetadata } from '../../hook/useRuntimeMetricMetadata'
import WorkspaceStatus from './WorkspaceStatus.vue'
import RuntimePointSummary from './RuntimePointSummary.vue'
import RuntimeDataFlow from './RuntimeDataFlow.vue'
import RuntimeFailureNotice from './RuntimeFailureNotice.vue'
const RuntimeMetricDetails=defineAsyncComponent(()=>import('./RuntimeMetricDetails.vue'))

const props=defineProps<{object:CollectorObject; kind:EntityKind; variant?:'summary'|'navigation'|'group'|'status'|'values'}>()
const emit=defineEmits<{diagnosticVisibility:[visible:boolean]}>()
const {t,te,locale}=useI18n()
const open=ref(false),detailsOpen=ref(false)
let diagnosticVisible=false
function setDiagnosticVisible(visible:boolean) {
  if(diagnosticVisible === visible)return
  diagnosticVisible=visible;emit('diagnosticVisibility',visible)
}
// 悬浮只读已有摘要；完整浏览打开后才解析全部指标和请求说明。
const metadata=useRuntimeMetricMetadata(()=>props.kind,detailsOpen,()=>props.object)
function showDetails(){open.value=false;detailsOpen.value=true}
watch(detailsOpen,visible=>{if(!visible)setDiagnosticVisible(false)})
onBeforeUnmount(()=>setDiagnosticVisible(false))
const indicators=computed(()=>runtimeIndicators(props.object,props.kind))
const tone=computed(()=>!props.object.runtime ? 'gray' : indicators.value.some(item=>item.tone === 'bad') ? 'bad' : indicators.value.some(item=>item.tone === 'warn') ? 'warn' : objectTone(props.object))
const stateText=computed(()=>!props.object.runtime ? t('collectorRuntime.states.pending') : !props.object.runtime.available ? t('collectorWorkspace.unavailable') : objectStateText(props.object,state=>te(`collectorRuntime.states.${state}`) ? t(`collectorRuntime.states.${state}`) : undefined))
const label=computed(()=>[t('collectorMonitoring.monitoring'),...indicators.value.map(item=>item.id === 'state'
  ? objectStateText(props.object,state=>te(`collectorRuntime.states.${state}`) ? t(`collectorRuntime.states.${state}`) : undefined)
  : t(item.id === 'disconnected' ? 'collectorMonitoring.disconnected' : `collectorMonitoring.attention.${item.id}`,{count:item.count}))].join(' · '))
const sampledAt=computed(()=>props.object.monitoring?.timestamp ? dayjs(props.object.monitoring.timestamp).format('HH:mm:ss') : t('collectorMonitoring.empty.waiting'))
const numberFormat=computed(()=>new Intl.NumberFormat(locale.value,{maximumFractionDigits:2}))
const number=(value?:number)=>value != null ? numberFormat.value.format(value) : '—'
const hasValue=(value?:number)=>Boolean(props.object.runtime?.available && value != null)
const quantity=(item:{value?:number;unit:string})=>{
  const scaled=formatMetricQuantity(item.value || 0,item.unit === 'B/s' ? 'bytes' : item.unit === 'ms' ? 'milliseconds' : '',value=>number(value))
  return scaled ? {...scaled,unit:scaled.unit+(item.unit === 'B/s' ? '/s' : '')} : {value:number(item.value),unit:item.unit}
}
const metrics=computed(()=>{
  const monitoring=props.object.monitoring
  if(props.kind === 'channel')return [
    {key:'received',icon:'DownloadOutlined',label:'collectorMonitoring.receivedTraffic',hint:'collectorMonitoring.trafficHint',value:monitoring?.readRate,unit:'B/s',ids:['transport.readBytes']},
    {key:'sent',icon:'UploadOutlined',label:'collectorMonitoring.sentTraffic',hint:'collectorMonitoring.trafficHint',value:monitoring?.writeRate,unit:'B/s',ids:['transport.writtenBytes']},
    {key:'pending',icon:'BarsOutlined',label:'collectorMonitoring.pendingRequests',hint:'collectorMonitoring.pendingRequestsHint',value:monitoring?.pending,unit:'',ids:['transport.pendingMessages']},
  ]
  const values=[
    ...runtimePrimaryMetrics(props.object,props.kind),
    {key:'duration',icon:'ClockCircleOutlined',label:'collectorMonitoring.duration',hint:props.kind === 'point' ? 'collectorMonitoring.pointDurationHint' : 'collectorMonitoring.durationHint',value:monitoring?.durationNanos != null ? monitoring.durationNanos / 1e6 : undefined,unit:'ms',ids:[props.kind === 'point' ? 'lastCollectionTimeNanos' : 'lastTaskTimeNanos']},
  ]
  if(!values.some(item=>item.ids.includes('receivedSamples')))values.splice(2,0,{key:'received',icon:'DownloadOutlined',label:'collectorMonitoring.data',hint:'collectorMonitoring.sampleRateHint',value:monitoring?.sampleRate,unit:'/s',ids:['receivedSamples']})
  if(props.kind === 'collector')values.push({key:'pending',icon:'BarsOutlined',label:'collectorMonitoring.pending',hint:'collectorMonitoring.pendingHint',value:monitoring?.pending,unit:'',ids:['pending']})
  return values
})
const visibleMetrics=computed(()=>metrics.value.filter(item=>showRuntimeMetric(props.object,item.value,item.ids)))
const keyMetrics=computed(()=>metrics.value.slice(0,2).filter(item=>showRuntimeMetric(props.object,item.value,item.ids)))
const navigationMetrics=computed(()=>keyMetrics.value.filter(item=>hasValue(item.value)))
const navigationLabel=computed(()=>[props.object.name,stateText.value,label.value,...navigationMetrics.value.map(item=>`${t(item.label)} ${quantity(item).value}${quantity(item).unit}`)].join(' · '))
const metricNodes=computed(()=>{
  if(!detailsOpen.value)return []
  const values=props.object.monitoring?.nodes || (props.object.runtime ? [props.object.runtime] : [])
  return values.map(node=>({...node,rows:runtimeMetricRows(node,metadata.nodeDefinitions.value[node.serverId] || metadata.definitions.value,value=>value > 0 ? dayjs(value).format('HH:mm:ss') : '—',t)}))
})
const metricCount=computed(()=>{
  if(!open.value)return 0
  const count=(metrics:MetricSnapshot|undefined):number=>Object.keys(metrics?.values || {}).length+Object.values(metrics?.observations || {}).reduce((total,view)=>total+count(view),0)
  return Math.max(0,...(props.object.monitoring?.nodes || (props.object.runtime ? [props.object.runtime] : [])).map(node=>count(node.metrics)))
})
</script>
