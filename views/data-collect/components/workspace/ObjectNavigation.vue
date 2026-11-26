<template>
  <nav class="cw-object-navigation" :aria-label="$t('collectorWorkspace.navigation')">
    <div class="cw-navigation-controls">
    <div class="cw-navigation-controls-content">
    <div ref="headingContent" class="cw-navigation-heading">
      <a-segmented v-model:value="view" block :options="viewOptions"><template #label="{payload}"><span class="cw-row"><AIcon :type="payload.icon" />{{ payload.title }}</span></template></a-segmented>
      <PanelCollapseButton v-if="!drawer" :collapsed="false" :aria-controls="controls" :label="$t('collectorWorkspace.collapse')" @toggle="$emit('collapse')" />
    </div>
    <div ref="searchContent" class="cw-navigation-search"><a-input v-model:value="keyword" allow-clear :placeholder="$t(view === 'channel' ? 'collectorWorkspace.searchChannels' : 'collectorWorkspace.searchCollectors')"><template #prefix><AIcon type="SearchOutlined" /></template></a-input></div>
    </div>
    </div>
    <div class="cw-navigation-list">
    <button class="cw-nav-item" :aria-current="!selected && !selectedChannel" @click="$emit('select')"><WorkspaceIcon name="grid" :size="16" /><span>{{ $t('collectorWorkspace.allCollectors') }}</span><small v-if="!loading && total != null">{{ total }}</small></button>
    <WorkspaceSkeleton v-if="loading" kind="navigation" />
    <template v-else><section v-for="group in groups" :key="group.id" :class="view === 'space' ? 'cw-nav-group' : 'cw-nav-flat'">
      <div v-if="view === 'space'" class="cw-nav-group-heading">
      <div class="cw-nav-group-toggle" :class="{ current: group.id === selectedChannel || group.items.some(item => item.id === selected) }">
        <button class="cw-nav-group-fold" :aria-label="$t(collapsed.has(group.id) ? 'collectorWorkspace.expandNavigation' : 'collectorWorkspace.collapse')" :aria-expanded="!collapsed.has(group.id)" @click="toggle(group.id)"><AIcon type="DownOutlined" :class="{ folded: collapsed.has(group.id) }" /></button><button class="cw-nav-group-name" @click="toggle(group.id)"><span>{{ group.name }}</span><small>{{ group.items.length }}</small></button>
      </div>
      </div>
      <div v-if="!collapsed.has(group.id)" class="cw-nav-children" role="group" :aria-label="group.name">
        <div v-for="item in group.items" :key="item.id" class="cw-nav-child" :class="{selected:item.id === selectedId}" @click="view === 'channel' ? $emit('selectChannel', item) : $emit('select', item)">
          <button class="cw-nav-select" :aria-current="item.id === selectedId"><WorkspaceIcon :object="item" :size="16" /><span class="cw-nav-name" :title="item.name">{{ item.name }}</span><small v-if="itemCount(item) != null" class="cw-nav-point-count" :title="$t(view === 'channel' ? 'collectorWorkspace.collectorCount' : 'collectorWorkspace.pointCount', { count: itemCount(item) })" :aria-label="$t(view === 'channel' ? 'collectorWorkspace.collectorCount' : 'collectorWorkspace.pointCount', { count: itemCount(item) })"><AIcon v-if="view === 'channel'" type="ApartmentOutlined" /><WorkspaceIcon v-else name="grid" :size="12" />{{ itemCount(item) }}</small></button>
          <RuntimeCardMetrics :object="item" :kind="view === 'channel' ? 'channel' : 'collector'" variant="navigation" />
        </div>
      </div>
    </section></template>
    </div>
  </nav>
</template>
<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useElementSize } from '@vueuse/core'
import { PanelCollapseButton } from '@jetlinks-web-core/components'
import type { CollectorObject } from '../../../../types/workspace'
import WorkspaceIcon from './WorkspaceIcon.vue'
import RuntimeCardMetrics from './RuntimeCardMetrics.vue'
import WorkspaceSkeleton from './WorkspaceSkeleton.vue'
const props = defineProps<{ collectors: CollectorObject[]; channels: CollectorObject[]; selected?: string; selectedChannel?: string; total?: number; loading?: boolean; drawer?: boolean; controls?: string; spaces?: Array<{ id: string; name: string; collectorIds: string[] }> }>()
defineEmits<{ select: [value?: CollectorObject]; selectChannel: [value: CollectorObject]; collapse: [] }>()
const { t } = useI18n(), view = ref<'collector' | 'space' | 'channel'>('collector'), collapsed = ref(new Set<string>())
const keywords = ref({ collector:'', channel:'', space:'' })
const keyword = computed({ get:() => keywords.value[view.value], set:(value: string) => { keywords.value[view.value] = value } })
const selectedId = computed(() => view.value === 'channel' ? props.selectedChannel || props.collectors.find(item => item.id === props.selected)?.channelId : props.selected)
const channelCounts = computed(() => {
  const counts = new Map<string, number>()
  for (const collector of props.collectors) if (collector.channelId) counts.set(collector.channelId, (counts.get(collector.channelId) || 0) + 1)
  return counts
})
function itemCount(item: CollectorObject) { return view.value === 'channel' ? channelCounts.value.get(item.id) || 0 : item.pointNumber }
const headingContent = ref<HTMLElement>(), searchContent = ref<HTMLElement>()
const { height: headingHeight } = useElementSize(headingContent)
const { height: searchHeight } = useElementSize(searchContent)
const controlsHeight = computed(() => headingHeight.value + searchHeight.value + 17)
defineExpose({ controlsHeight })
const viewOptions = computed(() => [
  {value:'collector',payload:{icon:'ApartmentOutlined',title:t('collectorNavigation.byCollector')}},
  {value:'channel',payload:{icon:'ApiOutlined',title:t('collectorNavigation.byChannel')}},
  ...(props.spaces?.length ? [{value:'space',payload:{icon:'EnvironmentOutlined',title:t('collectorWorkspace.space')}}] : []),
])
const groups = computed(() => {
  const source = view.value === 'channel' ? props.channels : props.collectors
  const candidates = source.filter(item => !keyword.value || `${item.name || ''} ${item.id}`.toLowerCase().includes(keyword.value.toLowerCase()))
  if (view.value !== 'space') return [{id:'_all',name:t(view.value === 'channel' ? 'collectorWorkspace.channel' : 'collectorWorkspace.allCollectors'),items:candidates}]
  const descriptors = props.spaces || []
  const known = new Set<string>()
  const result = descriptors.map(group => {
    const items = candidates.filter(item => group.collectorIds.includes(item.id))
    items.forEach(item => known.add(item.id)); return { id: group.id, name: group.name, items }
  }).filter(group => group.items.length)
  const unassigned = candidates.filter(item => !known.has(item.id))
  if (unassigned.length) result.push({ id: '_unassigned', name: t('collectorWorkspace.unassigned'), items: unassigned })
  return result
})
function toggle(id: string) { const next = new Set(collapsed.value); if (next.has(id)) next.delete(id); else next.add(id); collapsed.value = next }
watch([selectedId, view], () => {
  const group = groups.value.find(item => item.items.some(child => child.id === selectedId.value))
  if (group && collapsed.value.has(group.id)) toggle(group.id)
})
</script>
