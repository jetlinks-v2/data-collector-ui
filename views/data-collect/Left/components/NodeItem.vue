<template>
  <a-dropdown
      :key="node.id"
      class="menu-icon"
      :trigger="['contextmenu']"
  >
    <div :class="node.isChannel ? 'channel-node' : 'device-node'">
      <div class="hover-dropdown">
        <div class="node-heading">
          <div class="node-provider-icon" v-if="node.isChannel">
            <Image :src="getCollectorProviderIcon(node.provider)" alt=""/>
          </div>
          <div style="flex: 1; min-width: 0;">
            <j-ellipsis>
              {{ node.name }}
            </j-ellipsis>
          </div>
          <j-badge-status
              v-if="node.isChannel"
              :status="node.runningState?.value"
              :statusNames="{
              running: 'success',
              stopped: 'error',
            }"
          ></j-badge-status>
          <a-tag
              class="tree-left-tag"
              v-if="!node.isChannel"
              :color="
              colorMap.get(
                node.state?.value === 'disabled'
                  ? node.state?.value
                  : node?.runningState?.value
              )
            "
          >{{
              node.state?.value === "disabled"
                  ? node.state?.text
                  : node?.runningState?.text
            }}
          </a-tag>
        </div>
        <a-dropdown trigger="click" @click.stop>
          <div class="more-button">
            <AIcon type="MoreOutlined"></AIcon>
          </div>
          <template #overlay>
            <a-menu>
              <a-menu-item
                  v-for="item in actions(node)"
                  :key="item.key"
              >
                <j-permission-button
                    type="text"
                    block
                    style="text-align: left"
                    :popConfirm="item.popConfirm"
                    :disabled="item.disabled"
                    :tooltip="item.tooltip"
                    :hasPermission="`${permissionKey}:${item.key}`"
                    @click="item.onClick"
                >
                  <AIcon :type="item.icon"></AIcon>
                  {{ item.text }}
                </j-permission-button>
              </a-menu-item>
            </a-menu>
          </template>
        </a-dropdown>
      </div>
      <div v-if="!node.isChannel" class="collector-point-state">
        <div style="color: #1677FF;">
          <AIcon type="EnvironmentFilled"></AIcon>
        </div>
        <div class="collector-point-state-count">
          <j-badge-status status="success"/>
          <j-ellipsis class="collector-point-state-label">{{ $t('DataCollect.index.400150-8') }}</j-ellipsis>
          <j-ellipsis class="collector-point-state-value">{{ node.pointStateCount?.running || 0 }}</j-ellipsis>
        </div>
        <div class="collector-point-state-count">
          <j-badge-status status="error"/>
          <j-ellipsis class="collector-point-state-label">{{ $t('DataCollect.index.400150-9') }}</j-ellipsis>
          <j-ellipsis class="collector-point-state-value">{{ node.pointStateCount?.stopped || 0 }}</j-ellipsis>
        </div>
      </div>
    </div>
    <template #overlay>
      <a-menu v-if="node.id !== 'all'">
        <a-menu-item
            v-for="item in actions(node)"
            :key="item.key"
        >
          <j-permission-button
              type="text"
              block
              style="text-align: left"
              :popConfirm="item.popConfirm"
              :disabled="item.disabled"
              :tooltip="item.tooltip"
              :hasPermission="`${permissionKey}:${item.key}`"
              @click="item.onClick"
          >
            <AIcon :type="item.icon"></AIcon>
            {{ item.text }}
          </j-permission-button>
        </a-menu-item>
      </a-menu>
    </template>
  </a-dropdown>
</template>

<script setup lang="ts">
import {colorMap} from "../type";
import {useI18n} from "vue-i18n";
import {getCollectorProviderIcon} from "@data-collector-ui/utils/collectorIcon";

const {t: $t} = useI18n();

const props = defineProps({
  node: {
    type: Object,
    default: () => ({}),
  },
  actions: {
    type: Function,
    default: () => [],
  },
})

const permissionKey = 'data-collect'
</script>

<style lang="less" scoped>
.hover-dropdown {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 24px;
  min-width: 0;

  .node-heading {
    display: flex;
    flex: 1;
    min-width: 0;
    height: 100%;
    align-items: center;
    gap: var(--space-2);
  }

  .node-provider-icon {
    flex: none;
    width: 20px;
    height: 20px;
  }

  .tree-left-tag {
    flex: none;
    margin-inline-end: 0;
  }

  .more-button {
    flex: none;
    display: none;
    padding: 0 5px;
  }

  &:hover {
    .more-button {
      display: block;
    }
  }
}

.collector-point-state {
  font-size: 12px;
  margin-top: 4px;
  // 固定高度树节点内保持单行，数字增大或英文标签较长时由省略组件承接。
  display: grid;
  grid-template-columns: auto repeat(2, minmax(0, 1fr));
  align-items: center;
  gap: var(--space-2);
  white-space: nowrap;

  .collector-point-state-count {
    display: flex;
    min-width: 0;
    align-items: center;
    gap: var(--space-1);
  }

  :deep(.collector-point-state-label),
  :deep(.collector-point-state-value) {
    font-size: inherit;
    white-space: normal;
  }

  :deep(.collector-point-state-label) {
    min-width: 0;
    color: var(--ink-2);
  }

  :deep(.collector-point-state-value) {
    flex-shrink: 0;
    max-width: 60%;
    min-width: 0;
  }
}
</style>
