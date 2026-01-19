<template>
  <a-dropdown
      :key="node.id"
      class="menu-icon"
      :trigger="['contextmenu']"
  >
    <div :class="node.isChannel ? 'channel-node' : 'device-node'">
      <div class="hover-dropdown">
        <div style="height: 100%; display: flex; align-items: center; gap: 16px">
          <div style="width: 20px; height: 20px;" v-if="node.isChannel">
            <Image :src="`/protocol/${node.provider}/icon.png`" alt=""/>
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
      <a-flex v-if="!node.isChannel" align="center" class="collector-point-state">
        <div style="color: #1677FF;">
          <AIcon type="EnvironmentFilled"></AIcon>
        </div>
        <div class="collector-point-state-count">
          <j-badge-status status="success"/>
          <a-space>
            <span style="color: #777777;">{{ $t('DataCollect.index.400150-8') }}</span>
            <span>{{ node.pointStateCount?.running || 0 }}</span>
          </a-space>
        </div>
        <div class="collector-point-state-count">
          <j-badge-status status="error"/>
          <a-space>
            <span style="color: #777777;">{{ $t('DataCollect.index.400150-9') }}</span>
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
