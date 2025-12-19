<template>
  <div class="value-list">
    <div class="value-item">
      <div class="value-label">点位值</div>
      <ValueItem :value="value" type="detail" :data="info" @refresh="onRefresh"/>
    </div>
    <div class="value-item">
      <div class="value-label">原数据</div>
      <div class="value">{{ value.hex || '--' }}</div>
    </div>
    <div class="value-item">
      <div class="value-label">更新时间</div>
      <div class="value">{{ value.timestamp ? dayjs(value.timestamp).format('YYYY-MM-DD HH:mm:ss') : '--' }}</div>
    </div>
  </div>
</template>

<script setup>
import {wsClient} from "@jetlinks-web/core";
import dayjs from "dayjs";
import ValueItem from "../components/ValueItem.vue";

const info = inject('point-info', ref({}))
const refreshFn = inject('point-refresh')
const subRef = ref(null);
const value = ref({})
// 订阅获取值
const subscribeProperty = () => {
  if (subRef.value) {
    subRef.value?.unsubscribe?.()
  }
  const channel = info.value?.channelId || '*'
  const collector = info.value.collectorId || '*'
  const id = `collector-${channel}-${collector}-data-${info.value.id}`;
  const topic = `/collector/${channel}/${collector}/data`;
  subRef.value = wsClient.getWebSocket(id, topic, {
    pointId: info.value.id,
  }).subscribe((res) => {
    value.value = res.payload
  });
};

const onRefresh = () => {
  refreshFn?.refresh?.()
}

watch(() => info.value.id, (newValue) => {
  if (newValue) {
    subscribeProperty()
  }
}, {
  immediate: true
})

onUnmounted(() => {
  if (subRef.value) {
    subRef.value?.unsubscribe?.()
  }
})
</script>

<style lang="less" scoped>
.value-list {
  border: 1px solid #e8e8e8;
  padding: 12px;
  border-radius: 6px;
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  grid-gap: 12px;

  .value-item {
    .value-label {
      font-size: 12px;
      color: #a6a6a6;
      margin-bottom: 8px;
    }

    .value {
      display: flex;
      align-items: center;
      gap: 12px;
    }
  }
}
</style>
