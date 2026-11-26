<template>
  <section class="cw-history-storage" :aria-label="$t('collectorHistory.storageTitle')">
    <h2 class="cw-settings-title"><AIcon type="DatabaseOutlined" />{{ $t('collectorHistory.storageTitle') }}</h2>
    <div class="cw-history-options" role="group" :aria-label="$t('collectorHistory.storageTitle')"><a-checkbox v-for="option in options" :key="option.value" :checked="value.includes(option.value)" :title="option.description" @change="toggle(option.value, $event.target.checked)">{{ option.label }}</a-checkbox></div>
    <small class="cw-muted">{{ $t('collectorHistory.storageHint') }}</small>
  </section>
</template>
<script setup lang="ts">
const props = defineProps<{ value: string[]; options: Array<{ value: string; label: string; icon: string; description: string }> }>()
const emit = defineEmits<{ 'update:value': [value: string[]] }>()
function toggle(value: string, checked: boolean) {
  const remaining = props.value.filter(item => item !== value)
  emit('update:value', checked ? [...remaining, value] : remaining)
}
</script>
<style scoped>
.cw-history-storage { display:grid; gap:6px; padding-top:10px; margin-top:10px; border-top:1px solid var(--cw-line); }
.cw-history-storage h2 { margin:0; }.cw-history-storage small { font-size:11px; }
.cw-history-options { display:flex; align-items:center; flex-wrap:wrap; gap:8px 16px; }
.cw-history-options>.ant-checkbox-wrapper { margin:0; font-size:12px; }
</style>
