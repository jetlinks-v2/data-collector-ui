<template>
  <RuleLine class="cw-processing-line" layout="flow" :data-rule="rule.key" :icon="rule.icon" :title="rule.title" :color="rule.color">
    <template v-if="$slots.label" #label><a-tag :color="rule.color"><slot name="label" /></a-tag></template>
    <slot />
    <template #action><a-button type="text" size="small" :aria-label="$t('collectorProcessing.remove', { name: rule.title })" @click="$emit('remove')"><AIcon type="DeleteOutlined" /></a-button></template>
    <template v-if="$slots.details || error" #details><slot name="details" /><small v-if="error" class="cw-error" role="alert">{{ error }}</small></template>
  </RuleLine>
</template>
<script setup lang="ts">
import { RuleLine } from '@jetlinks-web-core/components'
import type { ProcessingRulePresentation } from '../../hook/useProcessingRules'
defineProps<{ rule: ProcessingRulePresentation; error?:string }>()
defineEmits<{ remove: [] }>()
</script>
<style scoped lang="less">
.cw-processing-line :deep(.cw-inline-mode) { width:max-content; max-width:100%; font:inherit; }
.cw-processing-line :deep(.rule-kind .ant-select-single) { --rule-control-height:20px; color:inherit; }
.cw-processing-line :deep(.rule-kind .ant-select-selection-item), .cw-processing-line :deep(.rule-kind .ant-btn) { color:inherit; }
.cw-processing-line :deep(.rule-kind .ant-btn) { height:20px; padding:0; line-height:20px; }
.cw-processing-line :deep(.rule-kind .collector-config-selection .anticon) { color:inherit; }
.cw-processing-line :deep(.cw-processing-clause) { display:contents; }
.cw-processing-line :deep(.cw-processing-phrase) { display:inline-flex; align-items:center; gap:4px; max-width:100%; white-space:nowrap; }
.cw-processing-line:has(.formula-editor) :deep(.rule-sentence) { flex-basis:100%; }
</style>
