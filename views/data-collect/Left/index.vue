<template>
  <section class="collect-sidebar">
    <a-input v-model:value="state.treeSearch" allow-clear :placeholder="$t('DataCollect.index.400150-10')">
      <template #prefix><AIcon type="SearchOutlined" /></template>
    </a-input>
    <div class="collect-sidebar__options">
      <a-segmented v-model:value="state.viewType" :options="viewOptions" />
      <a-button type="text" :class="{ 'filter-active': filterActive }" :title="$t('PointWorkspace.filters')" @click="filterModalVisible = true">
        <AIcon type="FilterOutlined" />
      </a-button>
    </div>
    <div class="collect-sidebar__scroll">
      <a-alert v-if="failed" type="error" :message="$t('PointWorkspace.loadFailed')" show-icon>
        <template #action><a-button type="link" @click="loadAllData">{{ $t('PointWorkspace.retry') }}</a-button></template>
      </a-alert>
      <a-spin :spinning="loading">
        <a-button class="collect-sidebar__all" type="text" block :class="{ active: state.scopeType === 'all' }" @click="select({ id: 'all' })">
          <AIcon type="AppstoreOutlined" />
          <span>{{ $t('PointWorkspace.allPoints') }}</span><span class="collect-sidebar__count">{{ totalPoints }}</span>
        </a-button>
        <template v-if="state.viewType === 'compact'">
          <a-tree v-if="filteredTree.length" block-node :show-line="{ showLeafIcon: false }"
            :tree-data="filteredTree" :selected-keys="selectedKeys" :field-names="{ key: 'id' }"
            v-model:expanded-keys="expandedKeys" @select="treeSelect">
            <template #title="node"><NodeItem :node="node" :actions="node.isChannel ? channelActions : collectorActions" /></template>
          </a-tree>
          <CloudEmpty v-else-if="!loading && !failed" :search="Boolean(state.treeSearch)" />
        </template>
        <div v-else class="collect-sidebar__separate">
          <div>
            <div v-for="node in filteredTree" :key="node.id" role="button" tabindex="0" class="collect-sidebar__node" :class="{ active: state.scopeId === node.id }" @click="select(node)" @keydown.enter.self="select(node)" @keydown.space.self.prevent="select(node)">
              <NodeItem :node="node" :actions="channelActions" />
            </div>
          </div>
          <div>
            <a-input v-model:value="collectorSearch" allow-clear :placeholder="$t('DataCollect.index.400150-10')" />
            <div v-for="node in filteredCollectors" :key="node.id" role="button" tabindex="0" class="collect-sidebar__node" :class="{ active: state.scopeId === node.id }" @click="select(node)" @keydown.enter.self="select(node)" @keydown.space.self.prevent="select(node)">
              <NodeItem :node="node" :actions="collectorActions" />
            </div>
            <CloudEmpty v-if="!filteredCollectors.length && !loading" />
          </div>
        </div>
      </a-spin>
    </div>
    <ActionButtons :channel-list="channels" @add="addChannel" />
  </section>
  <SaveChannel v-if="saveChannelVisible" :data="currentChannel" @close="saveChannelVisible = false"
    @save-success="saveChannelVisible = false; loadAllData()" />
  <SaveCollector v-if="saveCollectorVisible" :channel="currentChannel" :data="currentCollector"
    @close="saveCollectorVisible = false" @save="loadAllData" />
  <FilterModal v-if="filterModalVisible" :value="state.filters" @close="filterModalVisible = false" @save="filterSave" />
</template>
<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import SaveChannel from './SaveChannel/index.vue'
import SaveCollector from './SaveCollector/index.vue'
import FilterModal from './components/FilterModal.vue'
import NodeItem from './components/NodeItem.vue'
import ActionButtons from './components/ActionButtons.vue'
import { useCollectTree } from './useCollectTree'
import type { CollectRecord, ScopeType } from '../hook/context'
const emit = defineEmits<{ change: [type: ScopeType, node: CollectRecord] }>()
const { t: $t } = useI18n()
const {
  state, channels, loading, failed, expandedKeys, selectedKeys, filteredTree, filteredCollectors, totalPoints,
  saveChannelVisible, saveCollectorVisible, filterModalVisible, currentChannel, currentCollector,
  collectorSearch, filterActive, loadAllData, select, treeSelect, addChannel, filterSave, channelActions, collectorActions,
} = useCollectTree((type, node) => emit('change', type, node))
const viewOptions = computed(() => [
  { label: $t('DataCollect.index.400150-1'), value: 'compact' },
  { label: $t('DataCollect.index.400150-2'), value: 'separate' },
])
defineExpose({ loadAllData })
</script>
<style scoped>
.collect-sidebar { display: flex; flex-direction: column; height: 100%; min-height: 0; gap: var(--space-3); min-width: 0; }
.collect-sidebar__options { display: flex; justify-content: space-between; gap: var(--space-2); }
.collect-sidebar__scroll { flex: 1; min-height: 0; overflow: auto; }
.collect-sidebar__all { display: flex; align-items: center; gap: var(--space-2); text-align: left; margin-bottom: var(--space-2); }
.collect-sidebar__count { margin-left: auto; color: var(--jet-theme-text-secondary); }
.active { color: var(--jet-theme-primary); background: var(--accent-soft); }
.filter-active { color: var(--jet-theme-primary); }
.collect-sidebar :deep(.ant-tree-title) { display: block; min-width: 0; width: 100%; }
.collect-sidebar :deep(.ant-tree-node-content-wrapper) { min-width: 0; flex: 1; }
.collect-sidebar :deep(.ant-tree-treenode) { align-items: center; padding-bottom: var(--space-2); }
.collect-sidebar__separate { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-3); }
.collect-sidebar__node { display: block; width: 100%; border: 0; border-radius: var(--r-3); padding: var(--space-2); background: transparent; cursor: pointer; text-align: left; color: inherit; }
.collect-sidebar__node:hover { background: var(--bg-hover); }
.collect-sidebar__node.active { background: var(--accent-soft); }
</style>
