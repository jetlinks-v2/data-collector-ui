<template>
  <div class="top">
    <a-descriptions layout="vertical" :column="4">
      <template #title>
        <a-space v-if="type === 'channel' || type === 'collector'">
          <j-ellipsis>{{ data.name }}</j-ellipsis>
          <a-tag v-if="stateData.value" :color="StatusColorEnum[stateData.value]">{{ stateData.text }}</a-tag>
        </a-space>
        <span v-else>数据总览</span>
      </template>
      <template #extra>
        <a-space v-if="type === 'channel' || type === 'collector'">
          <template v-for="item in getActions()" :key="item.key">
            <j-permission-button
                :disabled="item.disabled"
                :popConfirm="item.popConfirm"
                :tooltip="item.tooltip"
                size="small"
                type="link"
                @click="item.onClick"
                :hasPermission="`${item.permission}:${item.key}`"
                :danger="item.key === 'delete'"
            >
              <AIcon :type="item.icon"/>
            </j-permission-button>
          </template>
        </a-space>
      </template>
      <template v-if="type === 'channel'">
        <a-descriptions-item label="异常采集器">
          <div class="value">
            <div class="error">{{ count.collectorError }}</div>/
            <div class="count">{{ count.collectorTotal }}</div>
          </div>
        </a-descriptions-item>
        <a-descriptions-item label="通讯协议">{{ data.provider }}</a-descriptions-item>
        <a-descriptions-item label="通道ID">{{ data.id }}</a-descriptions-item>
        <a-descriptions-item label="说明">{{ data.description || "--" }}</a-descriptions-item>
      </template>
      <template v-else-if="type === 'collector'">
        <a-descriptions-item label="通道名称">
          <j-ellipsis>{{ data.channelName }}</j-ellipsis>
        </a-descriptions-item>
        <a-descriptions-item label="通讯协议">{{ data.provider }}</a-descriptions-item>
        <a-descriptions-item label="采集器ID">{{ data.id }}</a-descriptions-item>
        <a-descriptions-item label="说明">{{ data.description || "--" }}</a-descriptions-item>
      </template>
      <template v-else>
        <a-descriptions-item label="异常通道">
          <div class="value">
            <div class="error">{{ count.channelError }}</div>/
            <div class="count">{{ count.channelTotal }}</div>
          </div>
        </a-descriptions-item>
        <a-descriptions-item label="异常采集器">
          <div class="value">
            <div class="error">{{ count.collectorError }}</div>/
            <div class="count">{{ count.collectorTotal }}</div>
          </div>
        </a-descriptions-item>
        <a-descriptions-item label="异常点位">
          <div class="value">
            <div class="error">{{ count.pointError }}</div>/
            <div class="count">{{ count.pointTotal }}</div>
          </div>
        </a-descriptions-item>
      </template>
    </a-descriptions>
  </div>
</template>

<script setup>
import {StatusColorEnum} from "./tool";
import {useI18n} from "vue-i18n";
import {queryCount} from "@collector/api/data-collect/channel";
import {queryCollectorCount, queryPointCount} from "@collector/api/data-collect/collector";

const {t: $t} = useI18n();

const data = inject('collector-data')
const type = inject('collector-type')
const count = reactive({
  channelTotal: 0,
  channelError: 0,
  collectorTotal: 0,
  collectorError: 0,
  pointTotal: 0,
  pointError: 0,
})

const stateData = computed(() => {
  if (type.value === 'channel') {
    if (data.value?.state?.value === 'enabled') {
      return {...data.value?.runningState};
    } else {
      return {
        text: $t('Channel.index.290640-7'),
        value: 'disabled',
      };
    }
  } else if (type.value === 'collector') {
    return {...data.value?.state}
  } else {
    return {}
  }
})

const getActions = () => {
  if (type.value === 'channel' || type.value === 'collector') {
    const permission = type.value !== 'channel' ? 'DataCollect/Collector' : 'DataCollect/Channel'
    const state = data.value.state.value;
    const stateText = state === 'enabled' ? $t('Channel.index.290640-7') : $t('Channel.index.290640-12');
    const _disabled = type.value === 'collector' && data.value?.runningState?.value === 'stopped' && data.value?.state?.value !== 'disabled'
    return [
      {
        key: 'update',
        tooltip: {
          title: $t('Channel.index.290640-13'),
        },
        permission,
        icon: 'EditOutlined',
        onClick: () => {

        },
      },
      {
        key: 'action',
        tooltip: {
          title: stateText,
        },
        permission,
        icon: state === 'enabled' ? 'StopOutlined' : 'CheckCircleOutlined',
        disabled: _disabled,
        popConfirm: {
          title: $t('Channel.index.290640-14', [stateText]),
          onConfirm: () => {

          },
        },
      },
      {
        key: 'delete',
        disabled: state === 'enabled',
        tooltip: {
          title:
              state === 'enabled' ? $t('Channel.index.290640-17') : $t('Channel.index.290640-16'),
        },
        permission,
        popConfirm: {
          placement: 'topRight',
          title: $t('Channel.index.290640-18'),
          onConfirm: () => {

          },
        },
        icon: 'DeleteOutlined',
      },
    ];
  }
  return []
};

const queryCollector = async (terms = {}) => {
  const resp = await queryCollectorCount({terms: [terms]})
  if(resp.success){
    count.collectorTotal = resp.result || 0
  }
  const response = await queryCollectorCount({
    terms: [
      {
        "value": "running",
        "termType": "not",
        "column": "runningState",
        type: "and"
      },
      terms,
    ]
  })
  if(response.success){
    count.collectorError = response.result || 0
  }
}
const handleSearch = async () => {
  if (!data.value?.id || data.value?.id === '*') {
    const resp1 = await queryCount({})
    if(resp1.success){
      count.channelTotal = resp1.result || 0
    }
    const resp2 = await queryCount({
      terms: [
        {
          "value": "running",
          "termType": "not",
          "column": "runningState"
        }
      ]
    })
    if(resp2.success){
      count.channelError = resp2.result || 0
    }
    await queryCollector()
    const resp3 = await queryPointCount({})
    if(resp3.success){
      count.pointTotal = resp3.result || 0
    }
    const resp4 = await queryPointCount({
      terms: [
        {
          "value": "running",
          "termType": "not",
          "column": "runningState"
        }
      ]
    })
    if(resp3.success){
      count.pointError = resp4.result || 0
    }
  } else {
    if (type.value === 'channel') {
      queryCollector({
        column: "channelId",
        value: data.value.id
      })
    }
  }
}

watch(() => data.value, () => {
  handleSearch()
}, {
  immediate: true,
  deep: true
})
</script>

<style lang="less" scoped>
.value {
  display: flex;
  align-items: center;
  gap: 8px;

  .error {
    font-size: 20px;
    color: #e50012;
  }
}
</style>
