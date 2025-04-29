<template>
  <div class="top">
    <a-descriptions layout="vertical" :column="4">
      <template #title>
        <a-space style="white-space: normal;">
          <j-permission-button
            v-if="foldTree"
            style="font-size: 20px;padding: 0"
            :hasPermission="true"
            :tooltip="{title: $t('DataCollection.Right.index.476751-1')}"
            type="text"
            @click="foldTree = !foldTree"
          >
          <AIcon type="InboxOutlined"></AIcon>
          </j-permission-button>
          <template v-if="type === 'channel'">
            <j-ellipsis style="max-width: 400px">{{ data.name }}</j-ellipsis>
            <j-badge-status
                :status="stateData?.value"
                :statusNames="{
                    running: 'success',
                    stopped: 'error',
                }"
            />
          </template>
          <template v-else-if="type === 'collector'">
            <j-ellipsis style="max-width: 400px">{{ data.name }}</j-ellipsis>
            <a-tag v-if="stateData.value" :color="StatusColorEnum[stateData.value]">{{ stateData.text }}</a-tag>
          </template>
          <span v-else>{{ $t('DataCollection.Right.Top.index.476751-1') }}</span>
        </a-space>
      </template>
      <template #extra>
        <a-space v-if="type === 'channel' || type === 'collector'" style="margin-left: 24px">
          <template v-for="item in getActions()" :key="item.key">
            <j-permission-button
                :disabled="item.disabled"
                :popConfirm="item.popConfirm"
                :tooltip="{...item.tooltip}"
                size="small"
                type="link"
                @click="item.onClick"
                :hasPermission="`${item.permission}`"
                :danger="item.key === 'delete'"
            >
              <AIcon :type="item.icon"/>
            </j-permission-button>
          </template>
        </a-space>
      </template>
      <template v-if="type === 'channel'">
        <a-descriptions-item>
          <template #label>
            <AIcon type="PieChartOutlined"></AIcon>
            {{ $t('Dashboard.tool.772451-2') }}
          </template>
          <div class="value">
            <div class="error">{{ count.collectorError }}</div>
            /
            <div class="count">{{ count.collectorTotal }}</div>
          </div>
        </a-descriptions-item>
        <a-descriptions-item>
          <template #label>
            <AIcon type="ForkOutlined"></AIcon>
            {{ $t('Channel.index.290640-4') }}
          </template>
          {{ data.provider }}
        </a-descriptions-item>
        <a-descriptions-item>
          <template #label>
            <AIcon type="ProfileOutlined"></AIcon>
            {{ $t('DataCollection.Right.Top.index.476751-2') }}
          </template>
          <j-ellipsis>{{ data.id }}</j-ellipsis>
        </a-descriptions-item>
        <a-descriptions-item>
          <template #label>
            <AIcon type="FileTextOutlined"></AIcon>
            {{ $t('Channel.index.290640-2') }}
          </template>
          <j-ellipsis>{{ data.description || "--" }}</j-ellipsis>
        </a-descriptions-item>
      </template>
      <template v-else-if="type === 'collector'">
        <a-descriptions-item>
          <template #label>
            <AIcon type="InboxOutlined"></AIcon>
            {{ $t('Channel.index.290640-3') }}
          </template>
          <j-ellipsis>{{ data.channelName }}</j-ellipsis>
        </a-descriptions-item>
        <a-descriptions-item>
          <template #label>
            <AIcon type="ForkOutlined"></AIcon>
            {{ $t('Channel.index.290640-4') }}
          </template>
          {{ data.provider }}
        </a-descriptions-item>
        <a-descriptions-item>
          <template #label>
            <AIcon type="ProfileOutlined"></AIcon>
            {{ $t('DataCollection.Right.Top.index.476751-3') }}
          </template>
          <j-ellipsis>{{ data.id }}</j-ellipsis>
        </a-descriptions-item>
        <a-descriptions-item>
          <template #label>
            <AIcon type="FileTextOutlined"></AIcon>
            {{ $t('Channel.index.290640-2') }}
          </template>
          <j-ellipsis>{{ data.description || "--" }}</j-ellipsis>
        </a-descriptions-item>
      </template>
      <template v-else>
        <a-descriptions-item>
          <template #label>
            <AIcon type="PieChartOutlined"></AIcon>
            {{ $t('Dashboard.tool.772451-0') }}
          </template>
          <div class="value">
            <div class="error">{{ count.channelError }}</div>
            /
            <div class="count">{{ count.channelTotal }}</div>
          </div>
        </a-descriptions-item>
        <a-descriptions-item>
          <template #label>
            <AIcon type="PieChartOutlined"></AIcon>
            {{ $t('Dashboard.tool.772451-2') }}
          </template>
          <div class="value">
            <div class="error">{{ count.collectorError }}</div>
            /
            <div class="count">{{ count.collectorTotal }}</div>
          </div>
        </a-descriptions-item>
        <a-descriptions-item>
          <template #label>
            <AIcon type="PieChartOutlined"></AIcon>
            {{ $t('Dashboard.tool.772451-4') }}
          </template>
          <div class="value">
            <div class="error">{{ count.pointError }}</div>
            /
            <div class="count">{{ count.pointTotal }}</div>
          </div>
        </a-descriptions-item>
      </template>
    </a-descriptions>
  </div>
  <SaveChannel
      v-if="saveChannel.visible"
      :data="saveChannel.current"
      @close="saveChannel.visible = false"
      @saveSuccess="onSaveChannelSuccess"
  />
  <SaveCollector
      v-if="saveCollector.visible"
      :data="saveCollector.current"
      @close="saveCollector.visible = false"
      @save="onSaveCollector"
  />
</template>

<script setup>
import {StatusColorEnum} from "./tool";
import {useI18n} from "vue-i18n";
import {queryCount, update as updateChannel, remove as removeChannel} from "@collector/api/data-collect/channel";
import {
  queryCollectorCount,
  queryPointCount,
  update as updateCollector,
  remove as removeCollector
} from "@collector/api/data-collect/collector";
import {updateStatus} from "./tool";
import {onlyMessage} from "@jetlinks-web/utils";
import SaveCollector from "@collector/views/DataCollection/LeftTree/SaveCollector/index.vue";
import SaveChannel from "@collector/views/DataCollection/LeftTree/SaveChannel/index.vue";

const emits = defineEmits(['refresh'])
const {t: $t} = useI18n();

const data = inject('collector-data')
const type = inject('collector-type')
const foldTree = inject('fold-tree')
const count = reactive({
  channelTotal: 0,
  channelError: 0,
  collectorTotal: 0,
  collectorError: 0,
  pointTotal: 0,
  pointError: 0,
})

const saveChannel = reactive({
  visible: false,
  current: {}
})

const saveCollector = reactive({
  visible: false,
  current: {}
})

const stateData = computed(() => {
  if (type.value === 'channel') {
    if (data.value?.runningState?.value === 'running') {
      return {...data.value?.runningState};
    } else {
      return {
        text: $t('Channel.index.290640-10'),
        value: 'stopped',
      };
    }
  } else if (type.value === 'collector') {
    if (data.value?.state?.value === 'disabled') {
      return data.value?.state
    }
    return {...data.value?.runningState}
  } else {
    return {}
  }
})

const onRefresh = (id, action) => {
  emits('refresh', id, action)
}

const onSaveChannelSuccess = (dt) => {
  saveChannel.visible = false
  emits('refresh', dt.id || data.value?.id, 'update')
}

const onSaveCollector = (dt) => {
  saveCollector.visible = false
  emits('refresh', dt.id || data.value?.id, 'update')
}

const getActions = () => {
  if (type.value === 'channel' || type.value === 'collector') {
    const permission = type.value !== 'channel' ? 'Collector' : 'Channel'
    const state = data.value.state.value;
    const stateText = state === 'enabled' ? $t('Channel.index.290640-7') : $t('Channel.index.290640-12');
    const _disabled = type.value === 'collector' && data.value?.runningState?.value === 'stopped' && data.value?.state?.value !== 'disabled'
    const _title = type.value === 'collector' ?
        (data?.state?.value !== 'disabled' ? $t('Tree.index.4001410-7') : $t('Tree.index.4001410-8')) :
        (state === 'enabled' ? $t('Channel.index.290640-17') : $t('Channel.index.290640-16'))
    return [
      {
        key: 'update',
        tooltip: {
          title: $t('Channel.index.290640-13'),
        },
        permission: `DataCollection:update`,
        icon: 'EditOutlined',
        onClick: () => {
          if (type.value === 'channel') {
            saveChannel.visible = true
            saveChannel.current = data.value
          }
          if (type.value === 'collector') {
            saveCollector.visible = true
            saveCollector.current = data.value
          }
        },
      },
      {
        key: 'action',
        tooltip: {
          title: stateText,
        },
        permission: `DataCollection:action`,
        icon: state === 'enabled' ? 'StopOutlined' : 'CheckCircleOutlined',
        disabled: _disabled,
        popConfirm: {
          title: $t('Channel.index.290640-14', [stateText]),
          onConfirm: async () => {
            let response;
            // 更新通道
            if (type.value === 'channel') {
              response = await updateChannel(data.value.id, updateStatus[state]);
            }
            // 更新采集器
            if (type.value === 'collector') {
              const state = data.value?.state?.value;
              response = await updateCollector(data.value?.id, {
                state: state !== 'disabled' ? 'disabled' : 'enabled',
                runningState: state !== 'disabled' ? 'stopped' : 'running',
              });
            }

            if (response && response.success) {
              onRefresh(response.result.id || data.value?.id, 'update')
              onlyMessage($t('Channel.index.290640-15'));
            }
          },
        },
      },
      {
        key: 'delete',
        disabled: state === 'enabled',
        tooltip: {
          title: _title,
          placement: 'topLeft'
        },
        permission: `DataCollection:delete`,
        popConfirm: {
          placement: 'topLeft',
          title: $t('Channel.index.290640-18'),
          onConfirm: async () => {
            let response;
            // 更新通道
            if (type.value === 'channel') {
              response = await removeChannel(data.value.id);
            }
            // 更新采集器
            if (type.value === 'collector') {
              response = await removeCollector(data.value?.id);
            }

            if (response && response.success) {
              onRefresh(response.result?.id || data.value?.id, 'delete')
              onlyMessage($t('Channel.index.290640-15'));
            }
          },
        },
        icon: 'DeleteOutlined',
      },
    ];
  }
  return []
};

const queryCollector = async (terms) => {
  let params = {}
  if(terms){
    params = {terms: [terms]}
  }
  const resp = await queryCollectorCount(params)
  if (resp.success) {
    count.collectorTotal = resp.result || 0
  }
  const _params = {
    terms: [
      {
        column: 'runningState',
        termType: 'not',
        value: 'running',
      },
    ]
  }
  if(terms){
    _params.terms.push(terms)
  }
  const response = await queryCollectorCount(_params)
  if (response.success) {
    count.collectorError = response.result || 0
  }
}
const handleSearch = async () => {
  if (!data.value?.id || data.value?.id === '*') {
    const obj = {
      column: 'runningState',
      termType: 'not',
      value: 'running',
    }
    const resp1 = await queryCount({})
    if (resp1.success) {
      count.channelTotal = resp1.result || 0
    }
    const resp2 = await queryCount({
      terms: [obj]
    })
    if (resp2.success) {
      count.channelError = resp2.result || 0
    }
    await queryCollector()
    const resp3 = await queryPointCount({})
    if (resp3.success) {
      count.pointTotal = resp3.result || 0
    }
    const resp4 = await queryPointCount({
      terms: [obj]
    })
    if (resp3.success) {
      count.pointError = resp4.result || 0
    }
  } else {
    if (type.value === 'channel') {
      await queryCollector({
        column: "channelId",
        value: data.value.id,
        type: "and"
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
.top {
  :deep(.ant-descriptions-item-label){
    display: flex;
    align-items: center;
    gap: 12px;

    &:after {
      content: '';
    }
  }
}
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
