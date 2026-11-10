<template>
  <section class="collect-sidebar">
    <a-input v-model:value="state.treeSearch" allow-clear :placeholder="$t('PointWorkspace.searchTree')">
      <template #prefix><AIcon type="SearchOutlined" /></template>
    </a-input>
    <div class="collect-sidebar__scroll">
      <a-alert v-if="failed" type="error" :message="$t('PointWorkspace.loadFailed')" show-icon>
        <template #action><a-button type="link" @click="loadAllData">{{ $t('PointWorkspace.retry') }}</a-button></template>
      </a-alert>
      <a-spin :spinning="loading">
        <a-tree block-node :show-line="{ showLeafIcon: false }"
          :tree-data="displayTree" :selected-keys="selectedKeys" :field-names="{ key: 'id' }"
          v-model:expanded-keys="expandedKeys" @select="treeSelect">
          <template #switcherIcon="{ expanded }"><AIcon :type="expanded ? 'CaretDownOutlined' : 'CaretRightOutlined'" /></template>
          <template #title="node">
            <div v-if="node.id === 'all'" class="collect-sidebar__all">
              <AIcon type="AppstoreOutlined" />
              <span>{{ $t('PointWorkspace.allPoints') }}</span><span class="collect-sidebar__count">{{ totalPoints }}</span>
            </div>
            <NodeItem v-else :node="node" :actions="node.isChannel ? channelActions : collectorActions" />
          </template>
        </a-tree>
        <CloudEmpty v-if="!filteredTree.length && !loading && !failed" :search="Boolean(state.treeSearch)" />
      </a-spin>
    </div>
    <footer class="collect-sidebar__footer">
      <ActionButtons :channel-list="channels" @add="addChannel" />
    </footer>
  </section>
  <SaveChannel v-if="saveChannelVisible" :data="currentChannel" @close="saveChannelVisible = false"
    @save-success="saveChannelVisible = false; loadAllData()" />
  <SaveCollector v-if="saveCollectorVisible" :channel="currentChannel" :data="currentCollector"
    @close="saveCollectorVisible = false" @save="loadAllData" />
</template>
<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import SaveChannel from './SaveChannel/index.vue'
import SaveCollector from './SaveCollector/index.vue'
import NodeItem from './components/NodeItem.vue'
import ActionButtons from './components/ActionButtons.vue'
import { useCollectTree } from './useCollectTree'
import type { CollectRecord, ScopeType } from '../hook/context'
const emit = defineEmits<{ change: [type: ScopeType, node: CollectRecord] }>()
const { t: $t } = useI18n()
const {
  state, channels, loading, failed, expandedKeys, selectedKeys, filteredTree, displayTree, totalPoints,
  saveChannelVisible, saveCollectorVisible, currentChannel, currentCollector,
  loadAllData, treeSelect, addChannel, channelActions, collectorActions,
} = useCollectTree((type, node) => emit('change', type, node))
defineExpose({ loadAllData })
</script>
<style scoped>
.collect-sidebar { display: flex; flex-direction: column; height: 100%; min-height: 0; gap: var(--space-3); min-width: 0; }
.collect-sidebar__scroll { flex: 1; min-height: 0; overflow: auto; }
.collect-sidebar__all { display: flex; align-items: center; gap: var(--space-2); min-height: 2.25rem; min-width: 0; width: 100%; }
.collect-sidebar__count { margin-left: auto; color: var(--jet-theme-text-secondary); }
.collect-sidebar__footer { flex: none; padding-top: var(--space-2); }
.collect-sidebar :deep(.ant-tree-title) { display: block; min-width: 0; width: 100%; }
.collect-sidebar :deep(.ant-tree-node-content-wrapper) { min-width: 0; flex: 1; }
.collect-sidebar :deep(.ant-tree-treenode) { align-items: center; padding: var(--space-1) 0; }
.collect-sidebar :deep(.ant-tree-switcher) { align-self: stretch; display: flex; align-items: center; justify-content: center; color: var(--jet-theme-text-disabled); }
</style>
