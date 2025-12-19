<template>
  <a-drawer open width="900px" @close="emits('close')">
    <template #title>
      <div class="header">
        <InputEditable
            :value="info.name"
            @change="(val) => onSave('name', val)"
            :maxLength="64"
        />
        <j-badge-status
            :status="info?.runningState?.value"
            :text="info?.runningState?.text"
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
        <a-descriptions-item label="采集器ID">
          <j-ellipsis>
            {{ info.id }}
          </j-ellipsis>
        </a-descriptions-item>
        <a-descriptions-item label="所属通道">
          <j-ellipsis>
            {{ info.channelName || '--' }}
          </j-ellipsis>
        </a-descriptions-item>
        <a-descriptions-item :label="item.text" v-for="item in countList" :key="item.type">{{
            item.total
          }}
        </a-descriptions-item>
        <a-descriptions-item label="说明">
          <InputEditable
              :value="info.description"
              @change="(val) => onSave('description', val)"
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
import {ChannelState, DATA_COLLECTOR_SAVE_TYPE} from "@data-collector-ui/views/data-collect/data";
import {tabs} from "./asyncComponent";
import {
  getCollectorActions,
  getCountList,
  onCollectorSave
} from "@data-collector-ui/views/data-collect/utils";
import {detail} from "@data-collector-ui/api/data-collect/collector";

const props = defineProps({
  data: {
    type: Object,
    default: () => ({})
  },
})
const emits = defineEmits(['close'])

provide(DATA_COLLECTOR_SAVE_TYPE, 'collector')

const activeKey = ref('Info', 'refresh')
const countList = ref([])
const info = ref({})
const loading = ref(false)

provide('collector-info', info)

const tabsList = [
  {
    key: 'Info',
    tab: '详情'
  },
  {
    key: 'PointTemplate',
    tab: '点位模板'
  },
  {
    key: 'CollectorLogs',
    tab: '采集器日志'
  }
]

const getActions = () => {
  return getCollectorActions(info.value, onActions).filter(item => !['update'].includes(item.key))
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
  getCountList('collector', id).then(resp => {
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
const onSave = (key, value) => {
  const params = {
    name: info.value.name,
    [key]: value
  }
  onCollectorSave(info.value.id, params, () => {
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
