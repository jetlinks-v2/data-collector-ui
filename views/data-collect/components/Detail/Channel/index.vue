<template>
  <a-drawer open width="900px" @close="emits('close')" destroy-on-close :maskClosable="false">
    <template #title>
      <div class="header">
        <InputEditable
            :value="info.name"
            @change="(val) => onSave([{name: 'name', value: val}])"
            :maxLength="64"
        />
        <j-badge-status
            :status="getState(info).value"
            :text="getState(info).text"
            :statusNames="ChannelState"
        />
      </div>
    </template>
    <template #extra>
      <a-space>
        <template v-for="item in getActions()" :key="item.key">
          <j-permission-button
              type="text"
              :popConfirm="item.popConfirm"
              :disabled="item.disabled"
              :tooltip="item.tooltip"
              :hasPermission="true"
              :danger="item.key === 'delete'"
              @click="item.onClick"
          >
            <AIcon :type="item.icon"></AIcon>
          </j-permission-button>
        </template>
      </a-space>
    </template>
    <a-spin :spinning="loading">
      <a-descriptions :column="4">
        <a-descriptions-item label="通讯协议">{{ info.provider }}</a-descriptions-item>
        <a-descriptions-item label="通道ID">
          <j-ellipsis>{{ info.id }}</j-ellipsis>
        </a-descriptions-item>
        <a-descriptions-item :label="item.text" v-for="item in countList" :key="item.type">{{
            item.total
          }}
        </a-descriptions-item>
        <a-descriptions-item label="说明">
          <InputEditable
              :value="info.description"
              @change="(val) => onSave([{name: 'description', value: val}])"
              :maxLength="200"
          />
        </a-descriptions-item>
      </a-descriptions>
      <a-tabs v-model:activeKey="activeKey">
        <a-tab-pane v-for="item in tabsList" :key="item.key" :tab="item.tab"/>
      </a-tabs>
      <full-page>
        <component :is="tabs[activeKey]" @save="onSave"/>
      </full-page>
    </a-spin>
  </a-drawer>
</template>

<script setup>
import {ChannelState, getState} from "@data-collector-ui/views/data-collect/data";
import {tabs} from "./asyncComponent";
import {
  getChannelActions,
  getCountList,
  onChannelSave,
  onCollectorSave
} from "@data-collector-ui/views/data-collect/utils";
import {detail} from "@data-collector-ui/api/data-collect/channel";
import {omit, set} from "lodash-es";

const props = defineProps({
  data: {
    type: Object,
    default: () => ({})
  },
})
const emits = defineEmits(['close', 'refresh'])

const activeKey = ref('Info')
const countList = ref([])
const info = ref({})
const loading = ref(false)

provide('channel-info', info)

const tabsList = [
  {
    key: 'Info',
    tab: '详情'
  },
  {
    key: 'ChannelLogs',
    tab: '通道日志'
  }
]

const getActions = () => {
  return getChannelActions(info.value, onActions).filter(item => !['add-collector', 'update'].includes(item.key))
}

const queryInfo = async (id) => {
  loading.value = true
  const resp = await detail(id).finally(() => {
    loading.value = false
  })
  if (resp.success) {
    info.value = resp.result
  }
}

const handleSearch = (id) => {
  queryInfo(id)
  getCountList('channel', id).then(resp => {
    countList.value = resp
  })
}

const onActions = (key) => {
  // 刷新
  if (key === 'delete') {
    emits('refresh')
  } else {
    handleSearch(info.value.id)
  }
}

// 修改点位信息
const onSave = (arr) => {
  const params = {
    ...omit(info.value, ['runningState', 'modifierId', 'modifyTime', 'state', 'creatorId', 'createTime']),
  }
  arr.map(i => {
    set(params, i.name, i.value)
  })
  onChannelSave(info.value.id, params, () => {
    handleSearch(info.value.id)
  })
}

watch(() => props.data.id, (val) => {
  if (val) {
    handleSearch(val)
  }
}, {
  immediate: true
})
</script>

<style lang="less" scoped>
.header {
  display: flex;
  align-items: center;
  gap: 16px;
}

:deep(.ant-descriptions) {
  .ant-descriptions-item-container {
    align-items: center;
  }
}
</style>
