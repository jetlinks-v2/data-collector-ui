<template>
  <ContentPanel class="point-summary" fill>
    <div class="point-summary__icon"><AIcon type="ApiOutlined" /></div>
    <div class="point-summary__body">
      <div class="point-summary__heading">
        <InputEditable :value="info.name" :max-length="64" :text-style="{ fontSize: 'var(--fs-18)', fontWeight: 600 }" @change="(value: string) => emit('save-field', 'name', value)" />
        <StatusTag :status="info.state?.value === 'disabled' ? 'disabled' : info.runningState?.value === 'running' ? 'success' : 'default'"
          :text="info.state?.value === 'disabled' ? info.state?.text : info.runningState?.text" />
        <span class="point-summary__id">{{ info.identifier || info.id }}</span>
      </div>
      <div class="point-summary__meta">
        <span>{{ $t('DataCollect.index.400151-36') }}：{{ info.provider || '—' }}</span>
        <span>{{ $t('DataCollect.index.400151-37') }}：{{ info.collectorName || info.collectorId || '—' }}</span>
        <span>{{ $t('DataCollect.index.400151-38') }}：{{ info.channelName || info.channelId || '—' }}</span>
      </div>
      <div class="point-summary__description">
        <span>{{ $t('DataCollect.index.400151-39') }}：</span>
        <InputEditable :value="info.description" :max-length="200" @change="(value: string) => emit('save-field', 'description', value)" />
      </div>
      <ValueList />
    </div>
    <a-space class="point-summary__actions">
      <j-permission-button :has-permission="true" :loading="editing" @click="emit('edit')"><AIcon type="EditOutlined" /> {{ $t('Channel.index.290640-13') }}</j-permission-button>
      <j-permission-button danger :has-permission="true" :pop-confirm="{ title: $t('DataCollect.utils.400158-2'), onConfirm: onDelete }"><AIcon type="DeleteOutlined" /> {{ $t('Channel.index.290640-16') }}</j-permission-button>
    </a-space>
  </ContentPanel>
</template>
<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import StatusTag from '@jetlinks-web-core/components/StatusTag/index.vue'
import ValueList from './ValueList.vue'
import type { CollectRecord } from '../../../hook/context'
defineProps<{ info: CollectRecord; editing: boolean; onDelete: () => Promise<void> }>()
const emit = defineEmits<{ 'save-field': [name: string, value: unknown]; edit: [] }>()
const { t: $t } = useI18n()
</script>
<style scoped>
.point-summary.content-panel { display: flex; flex-direction: row; align-items: flex-start; gap: var(--space-4); min-width: 0; }
.point-summary__icon { flex: none; display: grid; place-items: center; width: 3.5rem; height: 3.5rem; border: 1px solid var(--jet-theme-border-secondary); border-radius: var(--r-3); color: var(--jet-theme-primary); font-size: var(--fs-24); }
.point-summary__body { flex: 1; min-width: 0; }
.point-summary__heading, .point-summary__meta, .point-summary__description { display: flex; align-items: center; gap: var(--space-3); flex-wrap: wrap; }
.point-summary__heading { font-size: var(--fs-18); font-weight: 600; }
.point-summary__id { font-size: var(--fs-13); color: var(--jet-theme-text-disabled); font-weight: normal; }
.point-summary__meta, .point-summary__description { margin-top: var(--space-2); color: var(--jet-theme-text-secondary); font-size: var(--fs-13); }
.point-summary__description { margin-bottom: var(--space-3); gap: 0; }
.point-summary__actions { align-self: center; flex: none; }
@media (max-width: 960px) { .point-summary { flex-wrap: wrap; } .point-summary__actions { width: 100%; justify-content: flex-end; } }
@media (max-width: 600px) { .point-summary__icon { display: none; } .point-summary__body { flex-basis: 100%; } }
</style>
