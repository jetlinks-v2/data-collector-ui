<template>
  <a-drawer :open="open" width="min(520px,100vw)" root-class-name="cw-metric-drawer" @close="$emit('close')">
    <template #title><div class="cw-metric-drawer-title"><WorkspaceIcon :object="object" :size="20" /><span><strong>{{ object.name }}</strong><small>{{ $t('collectorMonitoring.monitoring') }}</small></span></div></template>
    <template #extra><WorkspaceStatus v-if="object.runtime" :object="object" /></template>
    <div class="cw-metric-browser">
      <div class="cw-monitoring-meta"><span v-if="object.monitoring"><AIcon type="ClusterOutlined" /> {{ object.monitoring.nodeCount }} {{ $t('collectorMonitoring.nodes') }}</span><time>{{ sampledAt }}</time></div>
      <RuntimePointSummary v-if="kind === 'collector'" :summary="object.monitoring?.pointSummary" />
      <div class="cw-metric-overview">
        <div v-if="rates.length" class="cw-metric-key-rates"><div v-for="item in rates" :key="item.key"><span><AIcon :type="item.icon" />{{ $t(item.label) }}</span><strong v-if="item.value != null" :title="`${item.value} ${item.unit}`">{{ item.display.value }}<small>{{ item.display.unit }}</small></strong><a-tooltip v-else :title="$t('collectorMonitoring.empty.calculating')"><a-skeleton-input class="cw-metric-skeleton" active size="small" :aria-label="$t('collectorMonitoring.empty.calculating')" /></a-tooltip></div></div>
        <RuntimeDataFlow v-if="kind !== 'channel'" :object="object" :point="kind === 'point'" />
      </div>
      <div class="cw-metric-search">
        <a-input v-model:value="query" allow-clear :placeholder="$t('collectorMonitoring.searchMetrics')"><template #prefix><AIcon type="SearchOutlined" /></template></a-input>
        <a-select v-if="nodes.length > 1" v-model:value="nodeId" :options="nodeOptions" option-label-prop="label" :aria-label="$t('collectorMonitoring.allNodes')" :dropdown-match-select-width="false">
          <template #suffixIcon><AIcon type="ClusterOutlined" /></template>
          <template #option="option"><span class="cw-metric-node-option"><AIcon type="ClusterOutlined" /><span>{{ option.label }}<small>{{ option.value ? $t(option.available ? 'collectorRuntime.states.running' : 'collectorWorkspace.unavailable') : `${nodes.length} ${$t('collectorMonitoring.nodes')}` }}</small></span></span></template>
        </a-select>
      </div>
      <p v-if="metadataError" class="cw-metric-notice">{{ $t('collectorMonitoring.metadataUnavailable') }}</p>
      <p v-if="hasTrends" class="cw-metric-trend-note"><AIcon type="LineChartOutlined" />{{ $t('collectorMonitoring.visual.session') }}</p>
      <a-spin :spinning="loading">
        <a-empty v-if="!sections.length && !loading" :description="$t('collectorMonitoring.noMetrics')" :image="Empty.PRESENTED_IMAGE_SIMPLE" />
        <section v-for="node in sections" :key="node.serverId" class="cw-metric-node-section">
          <div v-if="nodes.length > 1 || !node.available" class="cw-metric-node-heading"><AIcon type="ClusterOutlined" /><strong>{{ node.serverId }}</strong><span v-if="!node.available">{{ $t('collectorMonitoring.empty.unavailable') }}</span></div>
          <section v-for="group in node.groups" :key="group.id" class="cw-metric-group">
            <h3><AIcon :type="groupIcons[group.id]" />{{ $t(`collectorMonitoring.metricGroups.${group.id}`) }}<small>{{ group.rows.length }}</small></h3>
            <div class="cw-metric-grid"><RuntimeMetricVisual v-for="item in group.rows" :key="item.key" :row="item" :trend="trends.get(metricTrendKey(node.serverId,item.id))" :node-available="node.available" /></div>
          </section>
        </section>
      </a-spin>
      <a-button v-if="metricView.missing" type="link" size="small" block class="cw-metric-show-missing" :aria-expanded="showMissing" @click="showMissing = !showMissing"><AIcon :type="showMissing ? 'UpOutlined' : 'InfoCircleOutlined'" />{{ $t(showMissing ? 'collectorMonitoring.visual.hideMissing' : 'collectorMonitoring.visual.showMissing',{count:metricView.missing}) }}</a-button>
    </div>
  </a-drawer>
</template>
<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Empty } from 'ant-design-vue'
import dayjs from 'dayjs'
import type { CollectorObject, EntityKind } from '../../../../types/workspace'
import { formatMetricQuantity, type runtimeMetricRows } from '../../../../utils/runtimePresentation'
import { runtimePrimaryMetrics, showRuntimeMetric } from '../../../../utils/runtimeMonitoring'
import { metricTrendKey, runtimeMetricSections } from '../../../../utils/runtimeMetricVisuals'
import { useMetricTrends } from '../../hook/useMetricTrends'
import RuntimeMetricVisual from './RuntimeMetricVisual.vue'
import RuntimeDataFlow from './RuntimeDataFlow.vue'
import RuntimePointSummary from './RuntimePointSummary.vue'
import WorkspaceStatus from './WorkspaceStatus.vue'
import WorkspaceIcon from './WorkspaceIcon.vue'

const props=defineProps<{open:boolean;object:CollectorObject;kind:EntityKind;nodes:Array<{serverId:string;available:boolean;rows:ReturnType<typeof runtimeMetricRows>}>;loading:boolean;metadataError:boolean}>()
defineEmits<{close:[]}>()
const {t,locale}=useI18n()
const query=ref(''),nodeId=ref('')
const showMissing=ref(false)
const sampledAt=computed(()=>props.object.monitoring?.timestamp ? dayjs(props.object.monitoring.timestamp).format('HH:mm:ss') : t('collectorMonitoring.empty.waiting'))
const formatter=computed(()=>new Intl.NumberFormat(locale.value,{maximumFractionDigits:2}))
const number=(value:number)=>formatter.value.format(value)
const rates=computed(()=>(props.kind === 'channel' ? [
  {key:'read',icon:'DownloadOutlined',label:'collectorMonitoring.receivedTraffic',value:props.object.monitoring?.readRate,ids:['transport.readBytes'],unit:'B/s'},
  {key:'write',icon:'UploadOutlined',label:'collectorMonitoring.sentTraffic',value:props.object.monitoring?.writeRate,ids:['transport.writtenBytes'],unit:'B/s'},
] : runtimePrimaryMetrics(props.object,props.kind)).filter(item=>showRuntimeMetric(props.object,item.value,item.ids)).map(item=>{
  const scaled=props.kind === 'channel' ? formatMetricQuantity(item.value || 0,'bytes',number) : undefined
  return {...item,display:scaled ? {value:scaled.value,unit:`${scaled.unit}/s`} : {value:number(item.value || 0),unit:item.unit}}
}))
const trends=useMetricTrends(()=>props.nodes)
const hasTrends=computed(()=>[...trends.value.values()].some(trend=>trend.points.length > 1))
const nodeOptions=computed(()=>[{value:'',label:t('collectorMonitoring.allNodes'),available:true},...props.nodes.map(node=>({value:node.serverId,label:node.serverId,available:node.available}))])
const metricView=computed(()=>runtimeMetricSections(props.nodes,query.value,nodeId.value,showMissing.value))
const sections=computed(()=>metricView.value.sections)
const groupIcons={current:'DashboardOutlined',duration:'ClockCircleOutlined',counter:'NumberOutlined',activity:'FieldTimeOutlined',other:'AppstoreOutlined'}
// 节点退出后回到当前集群视图，避免筛选残留造成空白。
watch(()=>props.nodes.map(node=>node.serverId),ids=>{if(nodeId.value && !ids.includes(nodeId.value))nodeId.value=''})
</script>
