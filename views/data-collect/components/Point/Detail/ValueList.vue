<template>
  <div class="value-list">
    <div class="value-item">
      <div class="value-label">点位值</div>
      <div class="value">
        <div>1321334(int8)</div>
        <a-space>
          <a
              v-if="getAccessModes(data).includes('write')"
              @click.stop="clickEdit(data)"
          >
            <AIcon type="EditOutlined"/>
          </a>
          <a
              v-if="getAccessModes(data).includes('read')"
              @click.stop="clickRead(data)"
          >
            <AIcon type="RedoOutlined"/>
          </a>
        </a-space>
      </div>
    </div>
    <div class="value-item">
      <div class="value-label">原数据</div>
      <div class="value">{{ data.value || '--' }}</div>
    </div>
    <div class="value-item">
      <div class="value-label">更新时间</div>
      <div class="value">{{ dayjs(data?.createTime).format('YYYY-MM-DD HH:mm:ss') || '--' }}</div>
    </div>
  </div>
</template>

<script setup>
import {wsClient} from "@jetlinks-web/core";
import dayjs from "dayjs";
import {getAccessModes} from "@data-collector-ui/views/data-collect/components/Point/data";
import {cloneDeep} from "lodash-es";

const props = defineProps({
  data: {
    type: Object,
    default: () => ({})
  }
})
const subRef = ref(null);
const value = ref({})
// 订阅获取值
const subscribeProperty = () => {
  if (subRef.value) {
    subRef.value?.unsubscribe?.()
  }
  const channel = props.data?.channelId || '*'
  const collector = props.data.collectorId || '*'
  const id = `collector-${channel}-${collector}-data-${props.data.id}`;
  const topic = `/collector/${channel}/${collector}/data`;
  subRef.value = wsClient.getWebSocket(id, topic, {
    pointId: props.data.id,
  }).subscribe((payload) => {
    console.log(payload)
    value.value = payload
  });
};

const clickEdit = async (data) => {

};

// ReadIdMap
const clickRead = async (data) => {

};


watch(() => props.data.id, (newValue) => {
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
