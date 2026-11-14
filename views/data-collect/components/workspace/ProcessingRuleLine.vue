<template>
  <div class="cw-processing-line" :data-rule="rule.key">
    <span class="cw-processing-kind"><slot name="label"><a-tag :color="rule.color" :title="rule.description"><AIcon :type="rule.icon" />{{ rule.title }}</a-tag></slot></span>
    <div class="cw-processing-sentence"><slot /></div>
    <a-button type="text" size="small" class="cw-processing-remove" :aria-label="$t('collectorProcessing.remove', { name: rule.title })" @click="$emit('remove')"><AIcon type="DeleteOutlined" /></a-button>
    <div v-if="$slots.details" class="cw-processing-details"><slot name="details" /></div>
    <small v-if="error" class="cw-processing-error cw-error" role="alert">{{ error }}</small>
  </div>
</template>
<script setup lang="ts">
import type { ProcessingRulePresentation } from '../../hook/useProcessingRules'
defineProps<{ rule: ProcessingRulePresentation; error?:string }>()
defineEmits<{ remove: [] }>()
</script>
<style scoped lang="less">
.cw-processing-line { display:grid; grid-template-columns:6.25rem minmax(0,1fr) 24px; align-items:start; gap:4px 8px; min-width:0; min-height:30px; font-size:12px; }
.cw-processing-kind { display:flex; align-items:center; min-width:0; min-height:30px; }
.cw-processing-kind :deep(.ant-tag) { display:inline-flex; align-items:center; gap:4px; height:22px; margin:0; padding-inline:4px; font:inherit; line-height:20px; }
.cw-processing-kind > :deep(.ant-btn) { height:22px; padding:0; font:inherit; }
.cw-processing-line :deep(.cw-inline-mode) { width:max-content; max-width:100%; font:inherit; }
.cw-processing-line :deep(.cw-inline-mode .ant-select-selector) { height:24px; padding-inline:0 16px; background:transparent; border:0; box-shadow:none; }
.cw-processing-line :deep(.cw-inline-mode .ant-select-selection-item) { padding-inline-end:0; line-height:24px; }
.cw-processing-line :deep(.cw-inline-mode .ant-select-arrow) { inset-inline-end:1px; font-size:10px; }
.cw-processing-line :deep(.cw-inline-mode:not(.ant-select-disabled):hover .ant-select-selector) { background:var(--bg-sunken,var(--cw-bg)); }
.cw-processing-line :deep(.cw-inline-mode.ant-select-focused .ant-select-selector) { background:var(--jet-theme-primary-soft); outline:1px solid var(--jet-theme-primary,var(--cw-blue)); }
.cw-processing-sentence { display:flex; align-items:center; flex-wrap:wrap; gap:4px 8px; min-width:0; min-height:30px; padding-block:3px; line-height:24px; }
.cw-processing-sentence :deep(.cw-processing-clause) { display:contents; }
.cw-processing-sentence :deep(.cw-processing-phrase) { display:inline-flex; align-items:center; gap:4px; max-width:100%; white-space:nowrap; }
.cw-processing-sentence :deep(.ant-input-number) { width:64px; height:24px; min-width:0; border:0; border-radius:3px 3px 0 0; background:var(--bg-sunken,var(--cw-bg)); box-shadow:inset 0 -1px 0 var(--line,var(--cw-line)); font-size:inherit; }
.cw-processing-sentence :deep(.ant-input-number-input) { height:24px; padding-inline:4px; text-align:center; }
.cw-processing-sentence :deep(.ant-input-number-focused) { background:var(--jet-theme-primary-soft); box-shadow:inset 0 -1px 0 var(--jet-theme-primary,var(--cw-blue)); }
.cw-processing-remove { grid-column:3; grid-row:1; width:24px; padding:0; margin-top:3px; color:var(--jet-theme-text-secondary,var(--cw-muted)); opacity:.5; }
.cw-processing-line:hover .cw-processing-remove, .cw-processing-line:focus-within .cw-processing-remove { opacity:1; }
.cw-processing-remove:hover { color:var(--jet-theme-error,#ff4d4f); }
.cw-processing-remove:focus-visible { outline:1px solid var(--jet-theme-primary,var(--cw-blue)); outline-offset:1px; }
.cw-processing-details { grid-column:1 / -1; line-height:20px; color:var(--jet-theme-text-secondary,var(--cw-muted)); }
.cw-processing-error { grid-column:2; line-height:20px; }
.cw-processing-sentence:has(.formula-editor) { grid-column:1 / -1; grid-row:2; }
/* Keep short sentences together; stack only when the controls need the full row. */
@container collector-processing (max-width:20rem) {
  .cw-processing-line { grid-template-columns:minmax(0,1fr) 24px; }
  .cw-processing-kind { grid-column:1; grid-row:1; }
  .cw-processing-sentence { grid-column:1 / -1; grid-row:2; padding-top:0; }
  .cw-processing-remove { grid-column:2; }
  .cw-processing-details, .cw-processing-error { grid-column:1 / -1; }
}
@media (pointer:coarse) { .cw-processing-remove { min-height:40px; opacity:1; } }
</style>
