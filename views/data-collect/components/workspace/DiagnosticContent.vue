<template>
  <section class="cw-diagnostic" :aria-label="$t('collectorWorkspace.diagnostics')">
    <div class="cw-between"><strong>{{ $t('collectorWorkspace.diagnostics') }}</strong><button class="cw-icon-button" :aria-label="$t('collectorWorkspace.close')" @click="$emit('close')"><AIcon type="CloseOutlined" /></button></div>
    <a-spin :spinning="state.loading">
      <a-alert v-if="state.error" type="warning" :message="state.error" show-icon />
      <p v-else-if="state.snapshot && !state.snapshot.available" class="cw-muted">{{ $t('collectorWorkspace.unavailable') }}</p>
      <template v-else-if="state.snapshot">
        <div class="cw-runtime-meta"><WorkspaceStatus :object="runtimeObject" /><small>{{ state.snapshot.serverId }}</small></div>
        <div v-if="metrics.length" class="cw-diagnostic-metrics"><div v-for="metric in metrics.slice(0,6)" :key="metric.id" :title="metric.description"><span><AIcon :type="metric.icon" />{{ metric.name || metric.id }}</span><strong>{{ metric.text }}</strong></div></div>
        <a-collapse v-if="metrics.length > 6" ghost><a-collapse-panel key="metrics" :header="$t('collectorWorkspace.moreMetrics')"><div class="cw-diagnostic-metrics"><div v-for="metric in metrics.slice(6)" :key="metric.id" :title="metric.description"><span>{{ metric.name || metric.id }}</span><strong>{{ metric.text }}</strong></div></div></a-collapse-panel></a-collapse>
        <div v-if="failure" class="cw-failure-summary">
          <AIcon type="WarningOutlined" /><div><strong>{{ $t(state.snapshot.currentFailure ? 'collectorRuntime.states.collectionError' : 'collectorWorkspace.lastFailure') }}</strong><span>{{ time(failure.timestamp) }} · {{ translated('stages', failure.stage) }} · {{ code(failure.code) }}</span><p>{{ reason(failure.reason) }}</p></div>
        </div>
      </template>
      <div v-if="state.recording" class="cw-recording">
        <div class="cw-recording-toolbar">
          <div class="cw-recording-switch" role="group" :aria-label="$t('collectorWorkspace.execution')">
            <button v-for="item in recordingViews" :key="item.key" :disabled="!item.execution" :aria-pressed="selectedView === item.key" :title="item.execution?.actions.length ? time(item.execution.actions[0].timestamp) : $t(item.key === 'failed' ? 'collectorProcessing.noRecentFailure' : 'collectorProcessing.waitingExecution')" @click="recordingView = item.key"><AIcon :type="item.key === 'failed' ? 'WarningOutlined' : 'HistoryOutlined'" :class="{ bad:item.key === 'failed' && item.execution }" />{{ $t(item.label) }}</button>
          </div>
          <span class="cw-recording-state" :title="$t(state.recording.active ? 'collectorProcessing.diagnosticsEnabled' : 'collectorProcessing.diagnosticsDisabled')"><i class="cw-dot" :class="state.recording.active ? 'ok' : 'gray'" /><AIcon type="VideoCameraOutlined" /></span>
        </div>
        <small v-if="!state.recording.executions.length" class="cw-muted">{{ $t(state.recording.active ? 'collectorProcessing.waitingExecution' : 'collectorProcessing.diagnosticsSettingHint') }}</small>
        <template v-for="execution in selectedExecutions" :key="execution.id">
          <div class="cw-execution-title"><span>{{ execution.actions.length ? time(execution.actions[0].timestamp) : '—' }}</span><span :class="{ 'cw-error': !!execution.failure }">{{ execution.failure ? reason(execution.failure.reason) : translated('states', execution.status) }}</span></div>
          <div class="cw-timeline-scale"><small :title="$t('collectorProcessing.relativeTimeHint')">{{ $t('collectorProcessing.relativeTime') }}<span v-if="!timeline.precise" :title="$t('collectorProcessing.approximateTimeHint')"> ≈</span></small><div><span v-for="(tick,index) in timeline.ticks" :key="index">{{ timelineNumber(tick,timeline.divisor) }}<small v-if="index === 2"> {{ timeline.unit }}</small></span></div></div>
          <ol class="cw-timeline"><li v-for="row in timeline.rows" :key="row.action.id" :class="actionTone(row.action)">
            <div class="cw-timeline-step" :style="{paddingLeft:`${row.depth * 8}px`}"><AIcon :type="actionIcons[actionTone(row.action)]" /><strong>{{ translated('stages', row.action.action) }}</strong></div>
            <div class="cw-timeline-track" :title="timingHint(row)"><i v-if="row.start != null" class="cw-timeline-bar" :style="{left:`${row.left}%`,width:`${row.width}%`}" /><span>{{ row.start == null ? translated('states',row.action.status) : `${timelineNumber(row.action.useNanos,timeline.divisor)} ${timeline.unit}` }}</span></div>
            <p v-if="actionSummary(row.action) || row.action.errorMessage" class="cw-action-summary">{{ [actionSummary(row.action),row.action.errorMessage ? reason(row.action.errorMessage) : ''].filter(Boolean).join(' · ') }}</p>
          </li></ol>
          <small v-if="execution.truncated" class="cw-muted">{{ $t('collectorWorkspace.truncated') }}</small>
        </template>
      </div>
    </a-spin>
  </section>
</template>
<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import dayjs from 'dayjs'
import WorkspaceStatus from './WorkspaceStatus.vue'
import { actionTone, runtimeMetricRows, recordingChoices } from '../../../../utils/runtimePresentation'
import { recordingTimeline, timelineNumber } from '../../../../utils/recordingTimeline'
import type { MetricDefinition, RecordedAction, RecordingSnapshot, RuntimeSnapshot } from '../../../../types/workspace'
const props = defineProps<{ state: { loading: boolean; error: string; snapshot?: RuntimeSnapshot; definitions: MetricDefinition[]; recording?: RecordingSnapshot } }>()
defineEmits<{ close: [] }>()
const { t, te } = useI18n()
const reason = (value: string) => te(`collectorRuntime.errors.${value}`) ? t(`collectorRuntime.errors.${value}`) : te(value) ? t(value) : value
const code = (value: number) => `0x${(value >>> 0).toString(16).toUpperCase()}`
const runtimeObject = computed(() => ({id:props.state.snapshot?.id || '',name:'',provider:'',configuration:{},runtime:props.state.snapshot,runningState:props.state.snapshot?.state}))
const failure = computed(() => props.state.snapshot?.currentFailure || props.state.snapshot?.lastFailure)
const translated = (group: string, value: string) => te(`collectorRuntime.${group}.${value}`) ? t(`collectorRuntime.${group}.${value}`) : reason(value)
const actionIcons = { ok: 'CheckCircleOutlined', warn: 'ClockCircleOutlined', bad: 'CloseCircleOutlined', gray: 'MinusCircleOutlined' }
const time = (value: number) => dayjs(value).format('HH:mm:ss')
const recordingView = ref<'latest'|'failed'>()
const choices = computed(() => recordingChoices(props.state.recording?.executions || []))
const selectedView = computed(() => recordingView.value === 'latest' || !choices.value.failed ? 'latest' : 'failed')
const recordingViews = computed(() => [{key:'latest' as const,label:'collectorProcessing.latestExecution',execution:choices.value.latest},{key:'failed' as const,label:'collectorProcessing.latestFailure',execution:choices.value.failed}])
const selectedExecutions = computed(() => {
  const selected = choices.value[selectedView.value]
  return selected ? [selected] : []
})
const timeline = computed(() => recordingTimeline(selectedExecutions.value[0]?.actions || []))
function timingHint(row: ReturnType<typeof recordingTimeline>['rows'][number]) {
  if (row.start == null) return translated('states',row.action.status)
  const format = (value: number) => `${timelineNumber(value,timeline.value.divisor)} ${timeline.value.unit}`
  return `${t('collectorProcessing.stepStart')}: ${timeline.value.precise ? '' : '≈'}${format(row.start)} · ${t('collectorMonitoring.duration')}: ${format(row.action.useNanos)}${row.gap ? ` · ${t('collectorProcessing.stepGap')}: ${format(row.gap)}` : ''}`
}
watch(()=>props.state.recording?.sessionId,()=>{recordingView.value=undefined})
function actionSummary(action: RecordedAction) {
  const data = action.attributes || {}, parts: string[] = []
  if (data.decision) parts.push(translated('decisions', String(data.decision)))
  if (data.input != null && data.output != null) parts.push(`${data.input} → ${data.output}`)
  else if (data.output != null) parts.push(`→ ${data.output}`)
  if (data.code != null && Number(data.code) !== 0) parts.push(`0x${(Number(data.code) >>> 0).toString(16).toUpperCase()}`)
  return parts.join(' · ')
}
const metrics = computed(() => runtimeMetricRows(props.state.snapshot,props.state.definitions,time,t))
</script>
