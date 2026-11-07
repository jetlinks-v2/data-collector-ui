<template>
  <div class="right-header-warp">
    <div class="header-left">
      <div style="max-width: 200px;">
        <j-ellipsis>
          <div class="title" :class="{'_title': type !== 'all'}" @click="onDetail">{{ title }}</div>
        </j-ellipsis>
      </div>
        <a-tag v-if="type === 'channel'" :color="ChannelState[getState(data).value]">{{ getState(data).text }}</a-tag>
        <!--通讯协议类型-->
        <a-tag v-if="type !== 'all'">{{ data.provider }}</a-tag>
        <!--通道/采集器ID-->
        <a-tag v-if="type !== 'all'">
            <j-ellipsis style="max-width: 120px; white-space: normal">{{ data.id }}</j-ellipsis>
        </a-tag>
    </div>
    <div class="header-right">
      <div class="header-right-item" v-for="item in countList" :key="item.type">
        <span class="header-right-item-label">
          <j-ellipsis>{{ item.title }}</j-ellipsis>
        </span>
        <span class="header-right-item-value">
          <span class="error" @click="onClick(item)" :class="{'active': getActive(item.type)}">{{
              item.value
            }}</span> / {{ item.total }}
        </span>
      </div>
    </div>
  </div>
  <ChannelDetail :data="data" v-if="visible.channel" @close="visible.channel = false" @refresh="onRefresh"/>
  <CollectorDetail :data="data" v-if="visible.collector" @close="visible.collector = false" @refresh="onRefresh"/>
</template>

<script setup lang="ts">
import ChannelDetail from './Detail/Channel/index.vue'
import CollectorDetail from './Detail/Collector/index.vue'
import { useCollectHeader } from './useCollectHeader'
const { $t, title, type, data, visible, countList, getActive, onClick, onDetail, onRefresh, loadData, getState, ChannelState } = useCollectHeader()
defineExpose({ loadData })
</script>
<style scoped>
.right-header-warp { display: flex; justify-content: space-between; align-items: center; gap: var(--space-4); flex-wrap: wrap; padding-bottom: var(--space-3); border-bottom: 1px solid var(--jet-theme-border-secondary); }
.header-left, .header-right, .header-right-item { display: flex; align-items: center; gap: var(--space-2); min-width: 0; }
.header-left, .header-right { flex-wrap: wrap; }
.header-right { margin-left: auto; gap: var(--space-4); font-size: var(--fs-13); color: var(--jet-theme-text-secondary); }
.title { font-size: var(--fs-16); font-weight: 600; color: var(--jet-theme-text-title); }
._title, .error { color: var(--jet-theme-primary); cursor: pointer; }
.error.active { color: var(--jet-theme-error, #f84343); }
.header-left :deep(.ant-tag) { margin-inline-end: 0; }
</style>
