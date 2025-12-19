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
      <a-descriptions>
        <a-descriptions-item label="通讯协议">{{ info.provider }}</a-descriptions-item>
        <a-descriptions-item label="所属采集器">{{
            info.collectorName || info.collectorId || '--'
          }}
        </a-descriptions-item>
        <a-descriptions-item label="所属通道">{{ info.channelName || '--' }}</a-descriptions-item>
        <a-descriptions-item label="说明">
          <InputEditable
              :value="info.description"
              @change="(val) => onSave('description', val)"
              :maxLength="200"
          />
        </a-descriptions-item>
      </a-descriptions>
      <ValueList />
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
import ValueList from "./ValueList.vue";
import {tabs} from "./asyncComponent";
import {pointDetail} from "@data-collector-ui/api/data-collect/collector";
import {
  getPointActions,
  onPointSave
} from "@data-collector-ui/views/data-collect/utils";

const props = defineProps({
  data: {
    type: Object,
    default: () => ({})
  },
})
const emits = defineEmits(['close'])
const info = ref(props.data)
const loading = ref(false)
const activeKey = ref('Info')

const tabsList = [
  {
    key: 'Info',
    tab: '详情'
  },
  {
    key: 'AdvancedConfiguration',
    tab: '高级配置'
  },
  {
    key: 'HistoryData',
    tab: '历史数据'
  },
  {
    key: 'RelatedDevice',
    tab: '关联设备'
  },
  {
    key: 'PointLogs',
    tab: '点位日志'
  },
  {
    key: 'Alarm',
    tab: '告警'
  }
]

const getActions = () => {
  return getPointActions(info.value, onActions)
}
const queryInfo = async (id) => {
  loading.value = true
  const resp = await pointDetail(id).finally(() => {
    loading.value = false
  })
  if (resp.success) {
    info.value = resp.result
  }
}

const onActions = () => {
  emits('refresh')
}

const handleSearch = (id) => {
  queryInfo(id)
}

const onSave = (key, value) => {
  const params = {
    name: info.value.name,
    [key]: value
  }
  onPointSave(info.value.id, params, () => {
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

provide(DATA_COLLECTOR_SAVE_TYPE, 'point')
provide('point-info', info)
provide('point-refresh', {
  refresh: () => {
    handleSearch(info.value.id)
  }
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
