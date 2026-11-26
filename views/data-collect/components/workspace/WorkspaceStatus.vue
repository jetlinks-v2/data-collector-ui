<template><span class="cw-badge" :class="objectTone(object)" :title="title || (iconOnly ? text : undefined)" :role="iconOnly ? 'img' : undefined" :aria-label="iconOnly ? text : undefined"><AIcon :type="icons[stateValue(objectDisplayState(object))] || toneIcons[objectTone(object)]" />{{ iconOnly ? '' : text }}</span></template>
<script setup lang="ts">
import { computed } from 'vue'
import type { CollectorObject } from '../../../../types/workspace'
import { useI18n } from 'vue-i18n'
import { objectDisplayState, objectStateText, objectTone, stateValue } from '../../../../types/workspace'
import { runtimeFailureReason } from '../../../../utils/runtimePresentation'
const { t, te } = useI18n()
const props = defineProps<{ object: CollectorObject; iconOnly?: boolean }>()
const text = computed(() => objectStateText(props.object, value => {
  if (value === 'disabled') return t('collectorWorkspace.disabled')
  if (value === 'unavailable') return t('collectorWorkspace.unavailable')
  const key = `collectorRuntime.states.${value}`
  return te(key) ? t(key) : undefined
}) || t('collectorWorkspace.unknown'))
const title = computed(() => {
  const failure = props.object.runtime?.currentFailure || (!props.object.runtime?.failureSettled ? props.object.runtime?.lastFailure : undefined)
  if (!failure) return undefined
  return `${runtimeFailureReason(failure.reason,t,te)} · 0x${(failure.code >>> 0).toString(16).toUpperCase()}`
})
const icons: Record<string, string> = { pending:'ClockCircleOutlined', open:'StopOutlined', retrying:'ClockCircleOutlined', halfOpen:'SyncOutlined', paused:'PauseCircleOutlined', disabled:'PauseCircleOutlined', stopped:'PauseCircleOutlined', collectionError:'CloseCircleOutlined', recentError:'WarningOutlined', recovered:'CheckCircleOutlined' }
const toneIcons = { ok: 'CheckCircleOutlined', warn: 'ClockCircleOutlined', bad: 'CloseCircleOutlined', gray: 'QuestionCircleOutlined' }
</script>
