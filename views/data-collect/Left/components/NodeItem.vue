<template>
  <a-dropdown
    :key="node.id"
    class="menu-icon"
    :trigger="['contextmenu']"
  >
    <div>
      <div class="hover-dropdown">
        <a-space align="center" style="width: 100%">
          <div style="display: flex; align-items: center;">
            <AIcon
              v-if="node.isChannel"
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
        </a-space>
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
      <a-space v-if="!node.isChannel" class="collector-point-state">
        <AIcon type="icon-caijiqichufa"></AIcon>
        <div class="collector-point-state-count">
          <span>
            <j-badge-status
              status="success"
            >
            </j-badge-status>
            <a-space>
              <span>运行中</span>{{ node.pointStateCount?.running || 0 }}
            </a-space>
          </span>
          <span>
            <j-badge-status status="error"/>
            <a-space>
              <span>已停止</span>{{ node.pointStateCount?.stopped || 0 }}
            </a-space>
          </span>
        </div>
      </a-space>
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
import { protocolIcon, colorMap, updateStatus } from "../type";
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
.collector-point-state{
  font-size: 12px;
  margin-left: 10px;
  .collector-point-state-count {
    display: flex;
    justify-content: space-between;
    gap: 50px
  }
}
</style>