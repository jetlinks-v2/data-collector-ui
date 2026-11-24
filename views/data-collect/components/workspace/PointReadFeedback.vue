<template>
  <div v-if="state?.total" class="cw-read-feedback" :class="{'is-compact':compact,failed:state.error,success:!state.running && !state.cancelled && state.completed === state.total}" role="status" :aria-label="label" aria-live="polite">
    <small v-if="point && !compact">{{ $t('collectorTrial.title') }}</small>
    <AIcon :type="state.running ? 'LoadingOutlined' : state.error ? 'ExclamationCircleOutlined' : state.cancelled ? 'PauseCircleOutlined' : state.completed === state.total ? 'CheckCircleOutlined' : 'InfoCircleOutlined'" />
    <PointValueDisplay v-if="resultPoint" :point="resultPoint" :empty-text="$t('collectorWorkspace.noData')" :unit="point?.unit || point?.metadata?.dataType?.unit || ''" />
    <a-tooltip v-if="!compact || !resultPoint || state.error" :title="state.error || label"><span class="cw-read-result-label">{{ label }}</span></a-tooltip>
    <a-button v-if="state.running" type="text" size="small" @click="$emit('stop')">{{ $t('collectorTrial.stop') }}</a-button>
  </div>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { PointTrialState } from '../../hook/usePointTrial'
import type { PointRow } from '../../../../types/workspace'
import PointValueDisplay from './PointValueDisplay.vue'
const props=defineProps<{state?:PointTrialState;point?:PointRow;compact?:boolean}>()
defineEmits<{stop:[]}>()
const {t}=useI18n()
const resultPoint=computed(()=>props.point && props.state?.result?.pointId === props.point.id ? {...props.point,latest:props.state.result} : undefined)
const label=computed(()=>{
  const state=props.state
  if(!state)return ''
  const key=state.running ? 'reading' : state.cancelled ? 'cancelled' : state.error ? 'failed' : state.completed === state.total ? 'complete' : 'partial'
  return t(`collectorTrial.${state.total === 1 ? 'single.' : ''}${key}`,{count:state.completed,total:state.total})
})
</script>
<style scoped>
.cw-read-feedback{display:flex;align-items:center;gap:6px;min-height:24px;font-size:12px;color:var(--jet-theme-text-secondary,var(--cw-muted));flex-wrap:wrap}
.cw-read-feedback.success{color:var(--jet-theme-success,#52c41a)}
.cw-read-feedback.failed{color:var(--jet-theme-error,#ff4d4f)}
.cw-read-feedback :deep(.ant-btn){height:22px;padding-inline:4px;font-size:12px}
.cw-read-feedback>small{font-size:11px;color:var(--cw-sub)}
.cw-read-feedback :deep(.cw-reading){font-size:14px;font-weight:500}
.cw-read-feedback.is-compact{min-width:0;max-width:220px;flex-wrap:nowrap;gap:4px}
.cw-read-feedback.is-compact>.anticon,.cw-read-feedback.is-compact :deep(.ant-btn){flex:none}
.cw-read-feedback.is-compact>.cw-read-result-label{overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
.cw-read-feedback.is-compact :deep(.cw-value-display){flex:0 1 auto;min-width:0;max-width:120px}
.cw-read-feedback.is-compact :deep(.cw-value-trigger){max-width:100%;min-height:22px}
.cw-read-feedback.is-compact :deep(.cw-reading){font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
</style>
