<template>
  <CollectorPointPage :collector="collector" @back="backToList">
    <section class="point-batch-editor" :aria-label="$t('DataCollect.index.400152-13')">
      <div v-if="loading || (!renderReady && !loadFailed && !renderFailed)" class="point-batch-state">
        <a-spin :tip="$t('PointBatch.loading')" />
      </div>
      <div v-else-if="loadFailed || renderFailed" class="point-batch-state">
        <a-result status="error" :title="$t('PointBatch.loadFailed')">
          <template #extra><a-button @click="load">{{ $t('PointBatch.retry') }}</a-button></template>
        </a-result>
      </div>
      <template v-if="jsonData && !renderFailed">
        <!-- 未使用共享编辑表格的旧资源仍保留页面保存入口。 -->
        <div v-if="ready && !hasTable" class="point-batch-fallback-actions">
          <a-button type="primary" :loading="saveLoading" @click="handleSave">
            {{ $t('DataCollect.index.400152-3') }}
          </a-button>
        </div>
        <div v-show="renderReady" class="point-batch-protocol">
          <RenderComponents
            ref="pointBatchRef"
            :value="jsonData"
            @ready="renderReady = true"
            @error="renderFailed = true"
          />
        </div>
      </template>
    </section>
  </CollectorPointPage>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import RenderComponents from '@data-collector-ui/components/RenderComponents/RenderComponents.vue'
import CollectorPointPage from '../CollectorPointPage.vue'
import { usePointBatchSave } from './usePointBatchSave'

const { t: $t } = useI18n()
const {
  collector, jsonData, pointBatchRef, loading, loadFailed, renderReady, renderFailed,
  saveLoading, hasTable, ready, load, handleSave, backToList,
} = usePointBatchSave()
</script>

<style scoped lang="less">
.point-batch-editor, .point-batch-protocol {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
}
.point-batch-state { display: grid; flex: 1; place-items: center; min-height: 16rem; }
.point-batch-fallback-actions { display: flex; justify-content: flex-end; padding: 1rem; }
</style>
