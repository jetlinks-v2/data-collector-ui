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
    <div class="collect-node">
      <AIcon class="collect-node__icon" :type="node.isChannel ? 'ApartmentOutlined' : 'DatabaseOutlined'" />
      <span class="collect-node__name"><j-ellipsis>{{ node.name }}</j-ellipsis></span>
      <a-tooltip :title="$t('PointWorkspace.pointCounts', { running: node.pointStateCount?.running || 0, stopped: node.pointStateCount?.stopped || 0 })">
        <span class="collect-node__counts"><span>{{ node.pointStateCount?.running || 0 }}</span> / {{ node.pointStateCount?.stopped || 0 }}</span>
      </a-tooltip>
      <a-tooltip :title="node.state?.value === 'disabled' ? node.state?.text : node.runningState?.text">
        <a-badge :status="node.state?.value === 'disabled' ? 'default' : node.runningState?.value === 'running' ? 'success' : 'error'" />
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
.collect-node { display: flex; align-items: center; gap: var(--space-2); min-height: 2rem; min-width: 0; width: 100%; }
.collect-node__icon { flex: none; color: var(--jet-theme-text-secondary); }
.collect-node__name { flex: 1; min-width: 0; }
.collect-node__counts { white-space: nowrap; color: var(--jet-theme-text-disabled); font-size: var(--fs-12); }
.collect-node__counts > span { color: var(--jet-theme-success, #06c170); }
.collect-node__more { flex: none; width: 1.25rem; opacity: 0; }
.collect-node:hover .collect-node__more, .collect-node:focus-within .collect-node__more { opacity: 1; }
</style>
