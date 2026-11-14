<template>
  <div class="cw-processing-formula">
    <MathExpressionEditor v-if="editor.editing.value" :model-value="editor.pending.value" :context="editor.context.value" :functions-error="editor.functionsError.value" autofocus @update:model-value="editor.update" @invalid="editor.invalid.value=$event" @retry-functions="editor.refreshFunctions">
      <template #view-tools="{finish}"><a-button type="text" size="small" :aria-label="$t('collectorProcessing.cancelFormula')" @click="editor.cancel"><AIcon type="CloseOutlined" /></a-button><a-button type="text" size="small" :disabled="editor.invalid.value" :aria-label="$t('collectorProcessing.doneFormula')" @click="editor.done(finish)"><AIcon type="CheckOutlined" /></a-button></template>
    </MathExpressionEditor>
    <div v-else-if="editor.value.value" class="cw-processing-formula-preview">
      <ArithmeticSteps v-if="!formulaOnly && editor.simple.value && editor.steps.value" :steps="editor.steps.value" :labels="editor.labels.value" @change="editor.updateSteps" />
      <slot v-else>
        <a-popover :open="previewOpen" :trigger="['hover', 'focus']" placement="topRight" :destroy-tooltip-on-hide="true" @open-change="previewOpen=$event">
          <template #content><div class="cw-formula-preview"><MathExpressionView :node="editor.value.value.root" :context="editor.context.value" compact /></div></template>
          <button type="button" class="cw-formula-button" :aria-label="$t('collectorProcessing.editFormula')" @click="previewOpen=false; editor.start()" @keydown.esc.stop="previewOpen=false"><MathExpressionView :node="editor.value.value.root" :context="editor.context.value" compact /><AIcon type="EditOutlined" /></button>
        </a-popover>
      </slot>
    </div>
    <span v-else class="cw-muted">{{ $t('collectorProcessing.extendedCondition') }}</span>
    <small v-if="editor.typeError.value" class="cw-error" role="alert">{{ $t('collectorProcessing.formulaTypeMismatch') }}</small>
  </div>
</template>
<script setup lang="ts">
import { ArithmeticSteps,MathExpressionEditor,MathExpressionView } from '@jetlinks-web-core/components/Expression'
import { ref } from 'vue'
import type { useProcessingFormula } from '../../hook/useProcessingFormula'
defineProps<{editor:ReturnType<typeof useProcessingFormula>;formulaOnly?:boolean}>()
const previewOpen=ref(false)
</script>
<style scoped>
.cw-processing-formula { min-width:0; width:100% }
.cw-processing-formula-preview { display:flex; align-items:center; gap:4px; min-width:0; flex-wrap:wrap }
.cw-formula-button { display:flex; align-items:center; justify-content:space-between; gap:6px; min-width:0; width:100%; padding:1px 6px; border:0; border-radius:3px; background:var(--bg-sunken,var(--cw-bg)); color:inherit; font:inherit; cursor:pointer }
.cw-formula-button:hover,.cw-formula-button:focus-visible { background:var(--jet-theme-primary-soft); outline:1px solid var(--jet-theme-primary,var(--cw-blue)) }
.cw-formula-button :deep(.expression-math-shell) { flex:1; min-width:0 }
.cw-formula-button :deep(.expression-math) { white-space:nowrap; overscroll-behavior-x:contain }
.cw-formula-button > .anticon { flex:none; color:var(--jet-theme-text-secondary,var(--cw-muted)) }
.cw-formula-preview { width:max-content; max-width:min(720px,calc(100vw - 48px)) }
.cw-formula-preview :deep(.expression-math) { white-space:nowrap; overscroll-behavior-x:contain }
</style>
