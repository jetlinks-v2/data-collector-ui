<template>
  <div class="cw-state-counts" :class="{'is-compact':compact}" :title="$t('collectorMonitoring.instanceHint')">
    <small>{{ $t('collectorMonitoring.pointInstances') }}<strong v-if="summary">{{ summary.total }}</strong></small>
    <span v-for="item in compact ? counts.slice(0,2) : counts" :key="item.state" :class="item.tone"><AIcon :type="icons[item.tone]" />{{ stateText(item.state) }} <strong>{{ item.count }}</strong></span>
    <span v-if="compact && counts.length > 2" class="cw-muted">+{{ counts.length - 2 }}</span>
    <span v-if="summary?.longGap" class="warn" :title="$t('collectorMonitoring.longGapHint')"><AIcon type="HistoryOutlined" />{{ $t('collectorMonitoring.attentionShort.longGap',{count:summary.longGap}) }}</span>
    <span v-if="!compact && summary?.awaitingFirst" class="cw-muted" :title="$t('collectorMonitoring.awaitingHint')"><AIcon type="HourglassOutlined" />{{ $t('collectorMonitoring.awaitingCount',{count:summary.awaitingFirst}) }}</span>
    <span v-if="!summary" class="cw-muted">{{ $t('collectorMonitoring.empty.waiting') }}</span>
    <span v-else-if="!summary.total" class="cw-muted">0</span>
  </div>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { objectTone, type PointRuntimeSummary } from '../../../../types/workspace'
const props=defineProps<{summary?:PointRuntimeSummary;compact?:boolean}>()
const {t,te}=useI18n()
const stateText=(state:string)=>te(`collectorRuntime.states.${state}`) ? t(`collectorRuntime.states.${state}`) : state === 'unavailable' ? t('collectorWorkspace.unavailable') : state
const icons={ok:'CheckCircleOutlined',bad:'CloseCircleOutlined',warn:'ClockCircleOutlined',gray:'PauseCircleOutlined'}
const rank={bad:0,warn:1,ok:2,gray:3}
const counts=computed(()=>Object.entries(props.summary?.states || {}).filter(([,count])=>count > 0).map(([state,count])=>({state,count,tone:objectTone({id:'',name:'',provider:'',configuration:{},runningState:state})})).sort((a,b)=>rank[a.tone]-rank[b.tone]))
</script>
