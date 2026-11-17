<template>
  <a-popover trigger="click" placement="bottomRight" :arrow="true" overlay-class-name="cw-workspace-popover">
    <a-button type="text" size="small" :aria-label="$t('collectorSignal.advanced')"><AIcon type="SettingOutlined" /></a-button>
    <template #content><div class="cw-processing-timing"><span>{{ label }}<a-tooltip :title="hint"><AIcon type="InfoCircleOutlined" /></a-tooltip></span><span><a-input-number :value="value" :min="0" :precision="0" :controls="false" size="small" :aria-label="label" @update:value="$emit('update:value',$event == null ? undefined : Number($event))" /> ms</span></div></template>
  </a-popover>
</template>
<script setup lang="ts">
defineProps<{ value?:number; label:string; hint:string }>()
defineEmits<{ 'update:value':[value:number|undefined] }>()
</script>
<style scoped>
.cw-processing-timing{display:grid;gap:8px;max-width:240px;font-size:12px}
.cw-processing-timing>span{display:flex;align-items:center;gap:8px}
.cw-processing-timing :deep(.ant-input-number){height:24px;border:0;border-radius:3px 3px 0 0;background:var(--bg-sunken);box-shadow:inset 0 -1px 0 var(--line);font-size:inherit}
.cw-processing-timing :deep(.ant-input-number-focused){background:var(--jet-theme-primary-soft);box-shadow:inset 0 -1px 0 var(--jet-theme-primary)}
.cw-processing-timing :deep(.ant-input-number-input){height:24px;padding-inline:4px;text-align:center}
</style>
