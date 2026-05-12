<template>
  <a-drawer open :mask="loading" :maskStyle="{opacity: 0}" width="1000px" @close="onClose" destroy-on-close
            :maskClosable="false" :closable="false">
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
      <a-descriptions :column="4">
        <a-descriptions-item :label="$t('DataCollect.index.400155-33')">
          <j-ellipsis>{{ info.provider }}</j-ellipsis>
        </a-descriptions-item>
        <a-descriptions-item :label="$t('DataCollect.index.400155-34')">
          <j-ellipsis>
            {{ info.id }}
          </j-ellipsis>
        </a-descriptions-item>
        <a-descriptions-item :label="$t('DataCollect.index.400155-35')">
          <j-ellipsis>
            {{ info.channelName || '--' }}
          </j-ellipsis>
        </a-descriptions-item>
        <a-descriptions-item :label="item.text" v-for="item in countList" :key="item.type">{{
            item.total
          }}
        </a-descriptions-item>
        <a-descriptions-item :label="$t('DataCollect.index.400155-36')">
          <InputEditable
              :value="info.description"
              @change="(val) => onSave([{name: 'description', value: val}])"
              :maxLength="200"
          />
        </a-descriptions-item>
      </a-descriptions>
      <a-tabs :activeKey="activeKey" @change="onChange">
        <a-tab-pane v-for="item in tabsList" :key="item.key" :tab="item.tab"/>
      </a-tabs>
      <full-page>
        <component :is="tabs[activeKey]" ref="componentsRef" @save="onSave"/>
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
  onCollectorSave, onPointSave
} from "@data-collector-ui/views/data-collect/utils";
import {detail} from "@data-collector-ui/api/data-collect/collector";
import {omit, pick, set} from "lodash-es";
import {useI18n} from "vue-i18n";
import {onlyMessage} from "@jetlinks-web/utils";
import {Modal} from "ant-design-vue";

const {t: $t} = useI18n();
const props = defineProps({
  data: {
    type: Object,
    default: () => ({})
  },
})
const emits = defineEmits(['close', 'refresh'])

provide(DATA_COLLECTOR_SAVE_TYPE, 'collector')

const activeKey = ref('Info')
const countList = ref([])
const errorList = ref([])
const info = ref({})
const loading = ref(false)
const defaultKeys = ['accessModes', 'features', 'interval', 'managedConfiguration']
const componentsRef = ref()

provide('point-template-error-list', errorList)
provide('collector-info', info)

const tabsList = [
  {
    key: 'Info',
    tab: $t('DataCollect.index.400155-37')
  },
  {
    key: 'PointTemplate',
    tab: $t('DataCollect.index.400155-38')
  },
  {
    key: 'CollectorLogs',
    tab: $t('DataCollect.index.400155-39')
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
  emits('refresh')
  // 刷新
  if (key === 'delete') {
    emits('close')
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
  const _params = {
    ...omit(params, defaultKeys),
    configuration: {
      ...params.configuration,
      template: {
        ...(params.configuration.template || {}),
        ...pick(params, defaultKeys),
        managedConfiguration: {
          ...(params.configuration?.template?.managedConfiguration || {}),
          ...params.managedConfiguration
        }
      }
    },
    circuitBreaker: {
      type: 'Ignore'
    }
  };
  onCollectorSave(info.value.id, _params, () => {
    handleSearch(info.value.id)
    emits('refresh')
  })
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

const onChange = async (e) => {
  if (activeKey.value === 'PointTemplate') {
    await componentsRef.value?.onSave?.()
    handleClose(() => {
      activeKey.value = e
    })
  } else {
    activeKey.value = e
  }
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
