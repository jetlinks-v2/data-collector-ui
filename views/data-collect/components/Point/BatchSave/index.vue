<template>
  <PageChrome>
    <a-button type="text" class="point-batch-back" @click="backToList">
      <template #icon><AIcon type="LeftOutlined" /></template>
      {{ $t('PointBatch.back') }}
    </a-button>
  </PageChrome>
  <main class="point-batch-page">
    <header class="point-batch-summary">
      <img
        v-if="collector.provider"
        class="point-batch-summary__icon"
        :src="getCollectorProviderIcon(collector.provider)"
        alt=""
      />
      <div v-else class="point-batch-summary__icon point-batch-summary__placeholder">
        <AIcon type="DatabaseOutlined" />
      </div>
      <div class="point-batch-summary__info">
        <div class="point-batch-summary__heading">
          <h1><j-ellipsis>{{ collector.name || '—' }}</j-ellipsis></h1>
          <a-tag v-if="collector.provider" color="blue">{{ collector.provider }}</a-tag>
        </div>
        <div class="point-batch-summary__id">
          <span>{{ $t('DataCollect.index.400155-34') }}</span>
          <j-ellipsis>{{ collector.id || '—' }}</j-ellipsis>
        </div>
      </div>
    </header>
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
  </main>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import RenderComponents from '@data-collector-ui/components/RenderComponents/RenderComponents.vue'
import { getCollectorProviderIcon } from '@data-collector-ui/utils/collectorIcon'
import { usePointBatchSave } from './usePointBatchSave'

const { t: $t } = useI18n()
const {
  collector, jsonData, pointBatchRef, loading, loadFailed, renderReady, renderFailed,
  saveLoading, hasTable, ready, load, handleSave, backToList,
} = usePointBatchSave()
</script>

<style scoped lang="less">
.point-batch-back { padding-inline: 0; }
.point-batch-page {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  background: var(--bg, #fff);
  border-radius: var(--panel-radius, 8px);
}
.point-batch-summary {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1rem;
  border-bottom: 1px solid var(--line, #f0f0f0);
  &__icon { flex: none; width: 3.5rem; height: 3.5rem; object-fit: contain; }
  &__placeholder { display: grid; place-items: center; color: var(--text-color-secondary); font-size: 2rem; }
  &__info { min-width: 0; flex: 1; }
  &__heading {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: .5rem;
    h1 { min-width: 0; max-width: 100%; margin: 0; font-size: var(--fs-18); font-weight: 600; }
    .ant-tag { margin: 0; }
  }
  &__id {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-top: .5rem;
    color: var(--text-color-secondary);
    > span:first-child { flex: none; }
    > :last-child { min-width: 0; color: var(--text-color); }
  }
}
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
