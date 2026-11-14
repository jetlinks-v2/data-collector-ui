<template>
  <div class="cw-fleet">
    <article v-for="item in collectors" :key="item.id" class="cw-collector-card" @click="$emit('select', item)">
      <div class="cw-row">
        <WorkspaceIcon :object="item" :size="24" />
        <button class="cw-collector-name" @click.stop="$emit('select', item)"><strong :title="item.name">{{ item.name }}</strong></button>
        <WorkspaceStatus v-if="item.runtime" :object="item" /><a-skeleton-input v-else active size="small" class="cw-metric-skeleton" :aria-label="$t('collectorWorkspace.loading')" />
        <RuntimeCardMetrics :object="item" kind="collector" />
        <AIcon type="RightOutlined" class="cw-collector-enter" aria-hidden="true" />
      </div>
      <div class="cw-collector-summary"><small>{{ providerName(item.provider) }}</small><small v-if="item.pointNumber != null">{{ item.pointNumber }} {{ $t('collectorWorkspace.points') }}</small><span class="cw-card-channel" :title="item.channelName"><AIcon type="ApiOutlined" />{{ item.channelName || $t('collectorWorkspace.unassigned') }}</span></div>
      <RuntimeCardMetrics :object="item" kind="collector" variant="summary" />
    </article>
  </div>
</template>
<script setup lang="ts">
import type { CollectorObject, ProviderDescriptor } from '../../../../types/workspace'
import WorkspaceIcon from './WorkspaceIcon.vue'
import WorkspaceStatus from './WorkspaceStatus.vue'
import RuntimeCardMetrics from './RuntimeCardMetrics.vue'
const props = defineProps<{ collectors: CollectorObject[]; providers: ProviderDescriptor[] }>()
defineEmits<{ select: [value: CollectorObject] }>()
const providerName = (id: string) => props.providers.find(item => item.id === id)?.name || id
</script>
