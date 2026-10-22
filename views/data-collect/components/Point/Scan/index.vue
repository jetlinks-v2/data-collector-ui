<template>
  <section class="point-scan-editor" :aria-label="$t('data-collector-ui.index.237811-1')">
    <div class="point-scan-toolbar">
      <div class="point-scan-toolbar__heading">
        <h2>{{ $t('data-collector-ui.index.237811-1') }}</h2>
        <span>{{ $t('PointBatch.count', { count: scanSetting.selectedData.length }) }}</span>
      </div>
      <a-button
        type="primary"
        :loading="saveLoading"
        :disabled="!ready || !scanSetting.selectedData.length"
        @click="handleSave"
      >
        {{ $t('DataCollect.index.400152-3') }}
      </a-button>
    </div>
    <div v-if="loading || (!renderReady && !loadFailed && !renderFailed)" class="point-scan-state">
      <a-spin :tip="$t('PointBatch.loading')" />
    </div>
    <div v-else-if="loadFailed || renderFailed" class="point-scan-state">
      <a-result status="error" :title="$t('PointBatch.loadFailed')">
        <template #extra><a-button @click="load">{{ $t('PointBatch.retry') }}</a-button></template>
      </a-result>
    </div>
    <div v-if="jsonData && !renderFailed" v-show="renderReady" class="point-scan-protocol">
      <RenderComponents
        ref="renderRef"
        :value="jsonData"
        @ready="renderReady = true"
        @error="renderFailed = true"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { toRef } from 'vue'
import type { PropType } from 'vue'
import { useI18n } from 'vue-i18n'
import RenderComponents from '@data-collector-ui/components/RenderComponents/RenderComponents.vue'
import type { CollectorPointSummary } from '../types'
import { usePointScan } from './usePointScan'

const props = defineProps({ collector: { type: Object as PropType<CollectorPointSummary>, required: true } })
const emit = defineEmits<{ (event: 'saved'): void }>()
const { t: $t } = useI18n()
const {
  scanSetting, jsonData, renderRef, loading, loadFailed, renderReady, renderFailed,
  saveLoading, ready, load, handleSave,
} = usePointScan(toRef(props, 'collector'), () => emit('saved'))

defineExpose({ handleSave })
</script>

<style scoped lang="less">
.point-scan-editor, .point-scan-protocol {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
}
.point-scan-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
  padding: 1rem;
  &__heading {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: .75rem;
    min-width: 0;
    h2 { margin: 0; font-size: var(--fs-16, 1rem); font-weight: 600; }
    > span { color: var(--text-color-secondary); }
  }
}
.point-scan-state { display: grid; flex: 1; place-items: center; min-height: 16rem; }
.point-scan-protocol { margin: 0 1rem 1rem; overflow: auto; }
</style>
