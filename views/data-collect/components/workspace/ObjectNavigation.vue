<template>
  <nav class="cw-object-navigation" :aria-label="$t('collectorWorkspace.navigation')">
    <div class="cw-navigation-heading">
      <a-segmented v-model:value="view" block :options="[{value:'space',disabled:!spaces?.length,payload:{icon:'EnvironmentOutlined',title:$t('collectorWorkspace.space')}},{value:'channel',payload:{icon:'ApiOutlined',title:$t('collectorWorkspace.channel')}}]"><template #label="{payload}"><span class="cw-row"><AIcon :type="payload.icon" />{{ payload.title }}</span></template></a-segmented>
      <button v-if="expandable" class="cw-icon-button" :aria-label="$t('collectorWorkspace.expandNavigation')" :title="$t('collectorWorkspace.expandNavigation')" @click="$emit('expand')"><AIcon type="MenuUnfoldOutlined" /></button>
      <button class="cw-icon-button" :aria-label="$t(drawer ? 'collectorWorkspace.close' : 'collectorWorkspace.collapse')" :title="$t(drawer ? 'collectorWorkspace.close' : 'collectorWorkspace.collapse')" @click="drawer ? $emit('close') : $emit('collapse')"><AIcon :type="drawer ? 'CloseOutlined' : 'MenuFoldOutlined'" /></button>
    </div>
    <a-input v-model:value="keyword" allow-clear class="cw-navigation-search" :placeholder="$t('collectorWorkspace.searchCollectors')"><template #prefix><AIcon type="SearchOutlined" /></template></a-input>
    <button class="cw-nav-item" :aria-current="!selected" @click="$emit('select')"><WorkspaceIcon name="grid" :size="16" /><span>{{ $t('collectorWorkspace.allCollectors') }}</span><small>{{ total }}</small></button>
    <section v-for="group in groups" :key="group.id" class="cw-nav-group">
      <button class="cw-nav-group-toggle" :class="{ current: group.items.some(item => item.id === selected) }" :aria-expanded="!collapsed.has(group.id)" @click="toggle(group.id)">
        <AIcon type="DownOutlined" :class="{ folded: collapsed.has(group.id) }" /><span>{{ group.name }}</span><small>{{ group.items.length }}</small>
      </button>
      <RuntimeCardMetrics v-if="group.channel" :object="group.channel" kind="channel" variant="navigation" />
      <div v-if="!collapsed.has(group.id)" class="cw-nav-children" role="group" :aria-label="group.name">
        <div v-for="item in group.items" :key="item.id" class="cw-nav-child" :class="{selected:item.id === selected}">
          <button class="cw-nav-select" :aria-current="item.id === selected" @click="$emit('select', item)"><WorkspaceIcon :object="item" :size="16" /><span class="cw-nav-name" :title="item.name">{{ item.name }}</span></button>
          <RuntimeCardMetrics :object="item" kind="collector" variant="navigation" />
        </div>
      </div>
    </section>
  </nav>
</template>
<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { CollectorObject } from '../../../../types/workspace'
import WorkspaceIcon from './WorkspaceIcon.vue'
import RuntimeCardMetrics from './RuntimeCardMetrics.vue'
const props = defineProps<{ collectors: CollectorObject[]; channels: CollectorObject[]; selected?: string; total: number; drawer?: boolean; expandable?: boolean; spaces?: Array<{ id: string; name: string; collectorIds: string[] }> }>()
defineEmits<{ select: [value?: CollectorObject]; close: []; collapse: []; expand: [] }>()
const { t } = useI18n(), view = ref<'space' | 'channel'>('channel'), collapsed = ref(new Set<string>()), keyword = ref('')
const groups = computed(() => {
  const candidates = props.collectors.filter(item => !keyword.value || `${item.name} ${item.id}`.toLowerCase().includes(keyword.value.toLowerCase()))
  const descriptors = view.value === 'space' ? props.spaces || [] : props.channels
  const known = new Set<string>()
  const result = descriptors.map(group => {
    const items = candidates.filter(item => view.value === 'space' ? ('collectorIds' in group && group.collectorIds.includes(item.id)) : item.channelId === group.id)
    items.forEach(item => known.add(item.id)); return { id: group.id, name: group.name, items, channel: view.value === 'channel' ? props.channels.find(channel=>channel.id === group.id) : undefined }
  }).filter(group => group.items.length || view.value === 'channel' && !keyword.value)
  const unassigned = candidates.filter(item => !known.has(item.id))
  if (unassigned.length) result.push({ id: '_unassigned', name: t('collectorWorkspace.unassigned'), items: unassigned, channel:undefined })
  return result
})
function toggle(id: string) { const next = new Set(collapsed.value); if (next.has(id)) next.delete(id); else next.add(id); collapsed.value = next }
watch(() => [props.selected, view.value], () => {
  const group = groups.value.find(item => item.items.some(child => child.id === props.selected))
  if (group && collapsed.value.has(group.id)) toggle(group.id)
})
</script>
