<template>
  <div class="value-list">
    <div class="value-item">
      <div class="value-label">{{ $t('DataCollect.index.400152-10') }}</div>
      <ValueItem :value="value" type="detail" :data="info" @refresh="onRefresh"/>
    </div>
    <div class="value-item">
      <div class="value-label">{{ $t('DataCollect.index.400152-11') }}</div>
      <div class="value">{{ formatPointValue(value.hex, $t('comm.table.empty-2')) }}</div>
      <small v-if="value.rawByteLength > (value.hex?.length || 0) / 2">{{ $t('collectorValue.previewLimit', { count: (value.hex?.length || 0) / 2 }) }}</small>
    </div>
    <div class="value-item">
      <div class="value-label">{{ $t('DataCollect.index.400152-12') }}</div>
      <div class="value">{{ value.timestamp != null ? dayjs(value.timestamp).format('YYYY-MM-DD HH:mm:ss') : $t('comm.table.empty-2') }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, ref, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import dayjs from 'dayjs'
import ValueItem from '../components/ValueItem.vue'
import { formatPointValue } from '@data-collector-ui/utils/pointValue'
import { usePointValues } from '../usePointValues'
import type { CollectRecord } from '../../../hook/context'
const { t: $t } = useI18n()
const info = inject<Ref<CollectRecord>>('point-info', ref({}))
const refreshFn = inject<{ refresh: () => Promise<void> }>('point-refresh')
const values = usePointValues(computed(() => info.value.id ? [info.value] : []), true)
const value = computed(() => values.value.get(info.value.id || '') || {})
const onRefresh = () => refreshFn?.refresh()
</script>
<style lang="less" scoped>
.value-list {
  border: 1px solid var(--jet-theme-border-secondary);
  padding: var(--space-3);
  border-radius: var(--r-3);
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  grid-gap: 12px;

  .value-item {
    .value-label {
      font-size: 12px;
      color: var(--jet-theme-text-secondary);
      margin-bottom: 8px;
    }

    .value {
      display: flex;
      align-items: center;
      gap: 12px;
    }
  }
}
@media (max-width: 600px) { .value-list { grid-template-columns: 1fr; } }
</style>
