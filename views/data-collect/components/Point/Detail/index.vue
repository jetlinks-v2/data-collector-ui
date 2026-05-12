<template>
  <a-drawer
      open
      :mask="loading"
      :maskStyle="{opacity: 0}"
      width="1000px"
      @close="onClose"
      destroy-on-close
      :maskClosable="false"
      :closable="false"
  >
    <template #title>
      <div class="header">
        <InputEditable
            :value="info.name"
            @change="(val) => onSave([{name: 'name', value: val}])"
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
        <a-button type="text" @click="onClose">
          <AIcon type="CloseOutlined" />
        </a-button>
      </a-space>
    </template>
    <a-spin :spinning="loading" :key="info.id">
      <a-descriptions>
        <a-descriptions-item :label="$t('DataCollect.index.400151-36')">
          <j-ellipsis>{{ info.provider }}</j-ellipsis>
        </a-descriptions-item>
        <a-descriptions-item :label="$t('DataCollect.index.400151-37')">
          <j-ellipsis>{{
              info.collectorName || info.collectorId || '--'
            }}
          </j-ellipsis>
        </a-descriptions-item>
        <a-descriptions-item :label="$t('DataCollect.index.400151-38')">
          <j-ellipsis>{{
              info.channelName || '--'
            }}
          </j-ellipsis>
        </a-descriptions-item>
        <a-descriptions-item :label="$t('DataCollect.index.400151-39')">
          <InputEditable
              :value="info.description"
              @change="(val) => onSave([{name: 'description', value: val}])"
              :maxLength="200"
          />
        </a-descriptions-item>
      </a-descriptions>
      <ValueList/>
      <a-tabs :activeKey="activeKey" @change="onTabChange">
        <a-tab-pane v-for="item in tabsList" :key="item.key" :tab="item.tab"/>
      </a-tabs>
      <full-page>
        <component :is="tabs[activeKey]" @save="onSaveData" ref="componentsRef"/>
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
import {omit, set} from "lodash-es";
import {useI18n} from 'vue-i18n';
import {Modal} from "ant-design-vue";

const {t: $t} = useI18n();
const props = defineProps({
  data: {
    type: Object,
    default: () => ({})
  },
})
const emits = defineEmits(['close', 'refresh'])
const info = ref(props.data)
const loading = ref(false)
const activeKey = ref('Info')
const errorList = ref([])
const componentsRef = ref()
const tabsList = [
  {
    key: 'Info',
    tab: $t('DataCollect.index.400151-31')
  },
  {
    key: 'AdvancedConfiguration',
    tab: $t('DataCollect.index.400151-32')
  },
  {
    key: 'HistoryData',
    tab: $t('DataCollect.index.400151-33')
  },
  {
    key: 'RelatedDevice',
    tab: $t('DataCollect.index.400152-0')
  },
  {
    key: 'PointLogs',
    tab: $t('DataCollect.index.400151-34')
  },
  {
    key: 'Alarm',
    tab: $t('DataCollect.index.400151-35')
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

const onActions = (key) => {
  emits('refresh')
  if (key === 'delete') {
    emits('close')
  }
}

const handleSearch = (id) => {
  queryInfo(id)
}

const handleClose = (next) => {
  if (errorList.value.length) {
    Modal.confirm({
      title: $t('DataCollect.index.400159-6'),
      onOk() {
        next?.()
        errorList.value = []
      },
    });
  } else {
    next?.()
  }
}

const onClose = () => {
  handleClose(() => {
    emits('close')
  })
}

const onTabChange = async (e) => {
  if (['AdvancedConfiguration', 'Info'].includes(activeKey.value)) {
    await componentsRef.value?.onSave?.()
    handleClose(() => {
      activeKey.value = e
    })
  } else {
    activeKey.value = e
  }
}

const onSave = (arr) => {
  const params = {
    ...omit(info.value, ['runningState', 'modifierId', 'modifyTime', 'state', 'creatorId', 'createTime']),
  }
  arr.map(i => {
    set(params, i.name, i.value)
  })
  onPointSave(info.value.id, params, () => {
    handleSearch(info.value.id)
    emits('refresh')
  })
}

const onSaveData = (data) => {
  const params = {
    ...omit(info.value, ['runningState', 'modifierId', 'modifyTime', 'state', 'creatorId', 'createTime']),
    ...data,
  }
  onPointSave(info.value.id, params, () => {
    handleSearch(info.value.id)
    emits('refresh')
  })
}

watch(() => props.data.id, (val) => {
  if (val) {
    handleSearch(val)
  }
}, {
  immediate: true
})

provide(DATA_COLLECTOR_SAVE_TYPE, 'collector') // 详情的时候不用复用模版
provide('point-info', info)
provide('point-info-error-list', errorList)
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
