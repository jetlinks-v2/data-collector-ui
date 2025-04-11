<template>
  <div class="top">
    <a-descriptions layout="vertical" :column="4">
      <template #title>
        <a-space v-if="type === 'channel'">
          <j-ellipsis>{{ data.name }}</j-ellipsis>
          <j-badge-status
              :status="stateData?.value"
              :statusNames="{
                  running: 'success',
                  stopped: 'error',
              }"
          />
        </a-space>
        <a-space v-else-if="type === 'collector'">
          <j-ellipsis>{{ data.name }}</j-ellipsis>
          <a-tag v-if="stateData.value" :color="StatusColorEnum[stateData.value]">{{ stateData.text }}</a-tag>
        </a-space>
        <span v-else>{{ $t('DataCollection.Right.Top.index.476751-1') }}</span>
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
                :hasPermission="`${item.permission}`"
                :danger="item.key === 'delete'"
            >
              <AIcon :type="item.icon"/>
            </j-permission-button>
          </template>
        </a-space>
      </template>
      <template v-if="type === 'channel'">
        <a-descriptions-item :label="$t('Dashboard.tool.772451-2')">
          <div class="value">
            <div class="error">{{ count.collectorError }}</div>
            /
            <div class="count">{{ count.collectorTotal }}</div>
          </div>
        </a-descriptions-item>
        <a-descriptions-item :label="$t('Channel.index.290640-4')">{{ data.provider }}</a-descriptions-item>
        <a-descriptions-item :label="$t('DataCollection.Right.Top.index.476751-2')">
          <j-ellipsis>{{ data.id }}</j-ellipsis>
        </a-descriptions-item>
        <a-descriptions-item :label="$t('Channel.index.290640-2')">
          <j-ellipsis>{{ data.description || "--" }}</j-ellipsis>
        </a-descriptions-item>
      </template>
      <template v-else-if="type === 'collector'">
        <a-descriptions-item :label="$t('Channel.index.290640-3')">
          <j-ellipsis>{{ data.channelName }}</j-ellipsis>
        </a-descriptions-item>
        <a-descriptions-item :label="$t('Channel.index.290640-4')">{{ data.provider }}</a-descriptions-item>
        <a-descriptions-item :label="$t('DataCollection.Right.Top.index.476751-3')">
          <j-ellipsis>{{ data.id }}</j-ellipsis>
        </a-descriptions-item>
        <a-descriptions-item :label="$t('Channel.index.290640-2')">
          <j-ellipsis>{{ data.description || "--" }}</j-ellipsis>
        </a-descriptions-item>
      </template>
      <template v-else>
        <a-descriptions-item :label="$t('Dashboard.tool.772451-0')">
          <div class="value">
            <div class="error">{{ count.channelError }}</div>
            /
            <div class="count">{{ count.channelTotal }}</div>
          </div>
        </a-descriptions-item>
        <a-descriptions-item :label="$t('Dashboard.tool.772451-2')">
          <div class="value">
            <div class="error">{{ count.collectorError }}</div>
            /
            <div class="count">{{ count.collectorTotal }}</div>
          </div>
        </a-descriptions-item>
        <a-descriptions-item :label="$t('Dashboard.tool.772451-4')">
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

const onRefresh = () => {

}

const onSaveChannelSuccess = () => {

}

const onSaveCollector = () => {

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
        permission: `DataCollection:update${permission}`,
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
        permission: `DataCollection:action${permission}`,
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
              onRefresh()
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
        },
        permission: `DataCollection:delete${permission}`,
        popConfirm: {
          placement: 'topRight',
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
              onRefresh()
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

const queryCollector = async (terms = {}) => {
  const resp = await queryCollectorCount({terms: [terms]})
  if (resp.success) {
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
  if (response.success) {
    count.collectorError = response.result || 0
  }
}
const handleSearch = async () => {
  if (!data.value?.id || data.value?.id === '*') {
    const resp1 = await queryCount({})
    if (resp1.success) {
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
    if (resp2.success) {
      count.channelError = resp2.result || 0
    }
    await queryCollector()
    const resp3 = await queryPointCount({})
    if (resp3.success) {
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
    if (resp3.success) {
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
