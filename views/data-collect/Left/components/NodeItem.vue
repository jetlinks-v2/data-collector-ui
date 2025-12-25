<template>
  <a-dropdown
      :key="node.id"
      class="menu-icon"
      :trigger="['contextmenu']"
  >
    <div :class="node.isChannel ? 'channel-node' : 'device-node'">
      <div class="hover-dropdown">
        <a-flex align="center" :gap="16">
          <div style="display: flex; align-items: center;" v-if="node.isChannel">
            <AIcon
                :type="protocolIcon[node.provider]"
                style="font-size: 20px"
            ></AIcon>
          </div>
          <j-ellipsis>
            {{ node.name }}
          </j-ellipsis>
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
        </a-flex>
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
      <a-flex v-if="!node.isChannel" align="center" class="collector-point-state">
        <div style="color: #1677FF;">
          <AIcon type="EnvironmentFilled"></AIcon>
        </div>
        <div class="collector-point-state-count">
          <j-badge-status status="success"/>
          <a-space>
            <span style="color: #777777;">运行中</span>
            <span>{{ node.pointStateCount?.running || 0 }}</span>
          </a-space>
        </div>
        <div class="collector-point-state-count">
          <j-badge-status status="error"/>
          <a-space>
            <span style="color: #777777;">已停止</span>
            <span>{{ node.pointStateCount?.stopped || 0 }}</span>
          </a-space>
        </div>
      </a-flex>
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
              :hasPermission="`DataCollection:${item.key}`"
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
import {protocolIcon, colorMap, updateStatus} from "../type";

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
</script>

<style lang="less" scoped>
.hover-dropdown {
  display: flex;
  justify-content: space-between;

  .more-button {
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
  display: flex;
  align-items: center;
  gap: 24px;
}
</style>
