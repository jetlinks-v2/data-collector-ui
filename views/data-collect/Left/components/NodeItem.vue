<template>
  <DefineMenu>
    <a-menu>
      <a-menu-item v-for="item in actions(node)" :key="item.key">
        <j-permission-button type="text" block :pop-confirm="item.popConfirm" :disabled="item.disabled"
          :tooltip="item.tooltip" :has-permission="'data-collect:' + item.key" @click="item.onClick">
          <AIcon :type="item.icon" /> {{ item.text }}
        </j-permission-button>
      </a-menu-item>
    </a-menu>
  </DefineMenu>
  <a-dropdown :trigger="['contextmenu']">
    <div class="collect-node" :class="{ 'collect-node--disabled': node.state?.value === 'disabled' }">
      <AIcon class="collect-node__icon" :type="node.isChannel ? 'ApartmentOutlined' : 'DatabaseOutlined'" />
      <span class="collect-node__name"><j-ellipsis>{{ node.name }}</j-ellipsis></span>
      <a-tooltip v-if="!node.isChannel" :title="$t('PointWorkspace.pointCounts', { running: node.pointStateCount?.running || 0, stopped: node.pointStateCount?.stopped || 0 })">
        <span class="collect-node__counts"><span>{{ node.pointStateCount?.running || 0 }}</span> / {{ node.pointStateCount?.stopped || 0 }}</span>
      </a-tooltip>
      <a-tooltip :title="node.state?.value === 'disabled' ? node.state?.text : node.runningState?.text">
        <a-badge class="collect-node__state" :status="node.state?.value === 'disabled' ? 'default' : node.runningState?.value === 'running' ? 'success' : 'error'" />
      </a-tooltip>
      <a-dropdown :trigger="['click']">
        <a-button class="collect-node__more" type="text" size="small" :title="$t('PointWorkspace.more')" @click.stop><AIcon type="MoreOutlined" /></a-button>
        <template #overlay><NodeMenu /></template>
      </a-dropdown>
    </div>
    <template #overlay><NodeMenu /></template>
  </a-dropdown>
</template>
<script setup lang="ts">
import { createReusableTemplate } from '@vueuse/core'
import { useI18n } from 'vue-i18n'
import type { CollectRecord } from '../../hook/context'
defineProps<{ node: CollectRecord; actions: (node: CollectRecord) => any[] }>()
const { t: $t } = useI18n()
const [DefineMenu, NodeMenu] = createReusableTemplate()
</script>
<style scoped>
.collect-node { position: relative; display: flex; align-items: center; gap: var(--space-2); min-height: 2.25rem; min-width: 0; width: 100%; }
.collect-node__icon { flex: none; color: var(--jet-theme-text-secondary); }
.collect-node__name { flex: 1; min-width: 0; }
.collect-node__counts { white-space: nowrap; color: var(--jet-theme-text-disabled); font-size: var(--fs-12); }
.collect-node__counts > span { color: var(--jet-theme-success); }
.collect-node--disabled, .collect-node--disabled .collect-node__counts > span { color: var(--jet-theme-text-disabled); }
.collect-node__state { flex: none; }
/* 更多操作覆盖状态点的位置，不挤占长名称；键盘聚焦时同样显示。 */
.collect-node__more { position: absolute; right: 0; width: 1.25rem; opacity: 0; }
.collect-node:hover .collect-node__more, .collect-node:focus-within .collect-node__more { opacity: 1; }
.collect-node:hover .collect-node__state, .collect-node:focus-within .collect-node__state { opacity: 0; }
</style>
