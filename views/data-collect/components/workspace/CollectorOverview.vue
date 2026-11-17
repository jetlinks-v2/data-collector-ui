<template>
  <div class="cw-fleet">
    <article v-for="item in collectors" :key="item.id" class="cw-collector-card" @click="$emit('select', item)">
      <ObjectIdentity :object="item">
        <template #name><button class="cw-collector-name" @click.stop="$emit('select', item)"><strong :title="item.name">{{ item.name }}</strong></button></template>
        <RuntimeCardMetrics :object="item" kind="collector" />
        <j-permission-button type="text" size="small" hasPermission="data-collect:update" :aria-label="$t('collectorWorkspace.collectorSettings')" :title="$t('collectorWorkspace.collectorSettings')" @click.stop="edit(item, $event)"><AIcon type="SettingOutlined" /></j-permission-button>
        <AIcon type="RightOutlined" class="cw-collector-enter" aria-hidden="true" />
      </ObjectIdentity>
      <div class="cw-collector-summary"><small>{{ providerName(item.provider) }}</small><small v-if="item.pointNumber != null">{{ item.pointNumber }} {{ $t('collectorWorkspace.points') }}</small><span class="cw-card-channel" :title="item.channelName"><AIcon type="ApiOutlined" />{{ item.channelName || $t('collectorWorkspace.unassigned') }}</span></div>
      <RuntimeCardMetrics :object="item" kind="collector" variant="summary" />
    </article>
  </div>
</template>
<script setup lang="ts">
import type { CollectorObject, ProviderDescriptor } from '../../../../types/workspace'
import ObjectIdentity from './ObjectIdentity.vue'
import RuntimeCardMetrics from './RuntimeCardMetrics.vue'
const props = defineProps<{ collectors: CollectorObject[]; providers: ProviderDescriptor[] }>()
const emit = defineEmits<{ select: [value: CollectorObject]; edit: [value: CollectorObject, anchor: HTMLElement, trigger: HTMLElement] }>()
const providerName = (id: string) => props.providers.find(item => item.id === id)?.name || id
function edit(item:CollectorObject,event:MouseEvent) { const trigger=event.currentTarget as HTMLElement,anchor=trigger.closest<HTMLElement>('article'); if(anchor)emit('edit',item,anchor,trigger) }
</script>
