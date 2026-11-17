<template>
  <span class="cw-change-config">
    <a-input-number :value="configuration.threshold ?? 0" string-mode :min="0" :controls="false" size="small" :aria-label="$t('collectorSignal.threshold')" @update:value="update('threshold',$event)" /><span v-if="configuration.type === 'spanPercent'" class="cw-muted">%</span>
    <template v-if="configuration.type === 'spanPercent'"><span class="cw-muted">{{ $t('collectorSignal.range') }}</span><a-input-number :value="configuration.low" string-mode :controls="false" size="small" :placeholder="$t('collectorSignal.lower')" @update:value="update('low',$event)" /><span class="cw-muted">～</span><a-input-number :value="configuration.high" string-mode :controls="false" size="small" :placeholder="$t('collectorSignal.upper')" @update:value="update('high',$event)" /></template>
    <ProcessingTiming :value="configuration.maxSilenceMillis || 0" :label="$t('collectorSignal.maxSilence')" :hint="$t('collectorSignal.silenceHint')" @update:value="update('maxSilenceMillis',$event)" />
  </span>
</template>
<script setup lang="ts">
import type { PluginConfiguration } from '../../../../types/workspace'
import ProcessingTiming from './ProcessingTiming.vue'
const props=defineProps<{ configuration:PluginConfiguration }>()
const emit=defineEmits<{ 'update:configuration':[value:PluginConfiguration] }>()
function update(key:string,value:unknown){emit('update:configuration',{...props.configuration,[key]:value ?? undefined})}
</script>
<style scoped>
.cw-change-config{display:flex;align-items:center;flex-wrap:wrap;gap:4px;min-width:0}
.cw-change-config :deep(.ant-input-number){width:76px;max-width:100%}
.cw-change-config :deep(.ant-btn){padding-inline:4px}
</style>
