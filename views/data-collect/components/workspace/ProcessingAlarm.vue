<template>
  <div class="cw-processing-alarm">
    <I18nT :keypath="editor.limit.value.time === 0 ? 'collectorProcessing.alarmImmediateSentence' : 'collectorProcessing.alarmSentence'" scope="global" tag="span" class="cw-processing-clause">
      <template #trigger><ConfigSelect v-model:value="editor.trigger.value" :disabled="!editor.limit.value.enabled" :options="editor.options.value" :loading="editor.loading.value" show-search size="small" class="cw-alarm-trigger" :aria-label="$t('collectorProcessing.alarmTrigger')" /></template>
      <template #time><a-tooltip :title="$t('collectorProcessing.alarmWindowHint')"><a-input-number :value="editor.limit.value.time ?? undefined" :disabled="!editor.limit.value.enabled" :min="0" :precision="0" :controls="false" size="small" :aria-label="$t('collectorProcessing.alarmWindow')" @update:value="editor.setNumber('time', $event)" /></a-tooltip></template>
      <template #count><a-input-number :value="editor.limit.value.threshold ?? undefined" :disabled="!editor.limit.value.enabled || editor.limit.value.time === 0" :min="1" :precision="0" :controls="false" size="small" :aria-label="$t('collectorProcessing.alarmCount')" @update:value="editor.setNumber('threshold', $event)" /></template>
    </I18nT>
    <a-checkbox :checked="!!editor.limit.value.enabled" @update:checked="editor.setLimit({ enabled:$event })">{{ $t('collectorProcessing.alarmEnabled') }}</a-checkbox>
    <span v-if="editor.failed.value" class="cw-error" role="alert">{{ $t('collectorProcessing.errorsFailed') }}<a-button type="link" size="small" @click="editor.load">{{ $t('collectorWorkspace.retry') }}</a-button></span>
  </div>
</template>
<script setup lang="ts">
import { I18nT } from 'vue-i18n'
import ConfigSelect from '../../../../components/ConfigSelect.vue'
import type { useProcessingAlarm } from '../../hook/useProcessingAlarm'
defineProps<{ editor:ReturnType<typeof useProcessingAlarm> }>()
</script>
<style scoped lang="less">
.cw-processing-alarm { display:flex; align-items:center; flex-wrap:wrap; gap:4px 6px; width:100%; }
.cw-alarm-trigger { width:160px; max-width:100%; }
.cw-processing-alarm :deep(.ant-checkbox-wrapper) { color:var(--jet-theme-text-secondary,var(--cw-muted)); font-size:12px; }
</style>
