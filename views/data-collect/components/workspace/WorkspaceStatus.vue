<template><span class="cw-badge" :class="objectTone(object)" :title="title"><AIcon :type="icons[stateValue(objectDisplayState(object))] || toneIcons[objectTone(object)]" />{{ text }}</span></template>
<script setup lang="ts">
import { computed } from 'vue'
import type { CollectorObject } from '../../../../types/workspace'
import { useI18n } from 'vue-i18n'
import { objectDisplayState, objectStateText, objectTone, stateValue } from '../../../../types/workspace'
const { t, te } = useI18n()
const props = defineProps<{ object: CollectorObject }>()
const text = computed(() => objectStateText(props.object, value => {
  if (value === 'disabled') return t('collectorWorkspace.disabled')
  if (value === 'unavailable') return t('collectorWorkspace.unavailable')
  const key = `collectorRuntime.states.${value}`
  return te(key) ? t(key) : undefined
}) || t('collectorWorkspace.unknown'))
const title = computed(() => {
  const failure = props.object.runtime?.currentFailure || props.object.runtime?.lastFailure
  if (!failure) return undefined
  const key = `collectorRuntime.errors.${failure.reason}`
  return `${te(key) ? t(key) : failure.reason} · 0x${(failure.code >>> 0).toString(16).toUpperCase()}`
})
const icons: Record<string, string> = { open:'StopOutlined', retrying:'ClockCircleOutlined', halfOpen:'SyncOutlined', paused:'PauseCircleOutlined', disabled:'PauseCircleOutlined', stopped:'PauseCircleOutlined', collectionError:'CloseCircleOutlined', recentError:'WarningOutlined', recovered:'CheckCircleOutlined' }
const toneIcons = { ok: 'CheckCircleOutlined', warn: 'ClockCircleOutlined', bad: 'CloseCircleOutlined', gray: 'QuestionCircleOutlined' }
</script>
