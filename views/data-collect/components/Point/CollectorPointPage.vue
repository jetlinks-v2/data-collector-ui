<template>
  <PageChrome>
    <a-button type="text" class="collector-point-back" @click="emit('back')">
      <template #icon><AIcon type="LeftOutlined" /></template>
      {{ $t('PointBatch.back') }}
    </a-button>
  </PageChrome>
  <main class="collector-point-page">
    <header class="collector-point-summary">
      <img
        v-if="collector.provider"
        class="collector-point-summary__icon"
        :src="getCollectorProviderIcon(collector.provider)"
        alt=""
      />
      <div v-else class="collector-point-summary__icon collector-point-summary__placeholder">
        <AIcon type="DatabaseOutlined" />
      </div>
      <div class="collector-point-summary__info">
        <div class="collector-point-summary__heading">
          <h1><j-ellipsis>{{ collector.name || '—' }}</j-ellipsis></h1>
          <a-tag v-if="collector.provider" color="blue">{{ collector.provider }}</a-tag>
        </div>
        <div class="collector-point-summary__id">
          <span>{{ $t('DataCollect.index.400155-34') }}</span>
          <j-ellipsis>{{ collector.id || '—' }}</j-ellipsis>
        </div>
      </div>
    </header>
    <slot />
  </main>
</template>

<script setup lang="ts">
import type { PropType } from 'vue'
import { useI18n } from 'vue-i18n'
import { getCollectorProviderIcon } from '@data-collector-ui/utils/collectorIcon'
import type { CollectorPointSummary } from './types'

defineProps({ collector: { type: Object as PropType<CollectorPointSummary>, required: true } })
const emit = defineEmits<{ (event: 'back'): void }>()
const { t: $t } = useI18n()
</script>

<style scoped lang="less">
.collector-point-back { padding-inline: 0; }
.collector-point-page {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  background: var(--bg, #fff);
  border-radius: var(--panel-radius, 8px);
}
.collector-point-summary {
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
</style>
