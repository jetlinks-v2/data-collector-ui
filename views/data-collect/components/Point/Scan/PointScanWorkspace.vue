<template>
  <div class="point-scan-workspace">
    <aside class="point-scan-workspace__sidebar"><slot name="sidebar" /></aside>
    <div ref="viewport" class="point-scan-workspace__table" :style="{ '--point-scan-body-height': `${bodyHeight}px` }">
      <slot :bodyHeight="bodyHeight" />
      <div v-if="empty" class="point-scan-workspace__empty" :style="{ top: `${headerHeight}px` }">
        <CloudEmpty :description="$t('PointBatch.empty')" :image-style="{ height: '8rem' }">
          <template #description>
            <div class="point-scan-workspace__empty-title">{{ $t('PointBatch.empty') }}</div>
            <div>{{ $t('PointScan.emptyHint') }}</div>
          </template>
        </CloudEmpty>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { usePointTableSize } from '../usePointTableSize'

defineProps({ empty: { type: Boolean, default: false } })
const { t: $t } = useI18n()
const { viewport, bodyHeight, headerHeight } = usePointTableSize()
</script>

<style scoped lang="less">
.point-scan-workspace {
  display: flex;
  flex: 1;
  height: 100%;
  min-height: 0;
  min-width: 0;
  &__sidebar {
    flex: 0 0 16rem;
    min-height: 0;
    min-width: 0;
    margin-right: 1rem;
    padding-right: 1rem;
    border-right: 1px solid var(--line, #f0f0f0);
    overflow: hidden;
  }
  &__table {
    position: relative;
    flex: 1;
    min-height: 20rem;
    min-width: 0;
    overflow: hidden;
    :deep(.ant-table-body) { height: var(--point-scan-body-height); }
  }
  &__empty {
    position: absolute;
    inset-inline: 0;
    bottom: 0;
    display: grid;
    place-items: center;
    padding: 1rem;
    pointer-events: none;
  }
  &__empty-title { margin-bottom: .5rem; color: var(--text-color); font-weight: 500; }
}
@media (max-width: 767px) {
  .point-scan-workspace {
    flex-direction: column;
    &__sidebar {
      flex-basis: 12rem;
      margin: 0 0 1rem;
      padding: 0 0 1rem;
      border-right: 0;
      border-bottom: 1px solid var(--line, #f0f0f0);
    }
  }
}
</style>
