<template>
  <div class="right-header-warp">
    <div class="header-left">
      <div style="max-width: 200px;">
        <j-ellipsis>
          <div class="title" @click="onDetail">{{ title }}</div>
        </j-ellipsis>
      </div>
      <a-space>
        <!--运行状态-->
        <j-badge-status
            v-if="type === 'channel'"
            :status="getState(data).value"
            :text="getState(data).text"
            :statusNames="ChannelState"
        />
        <!--通讯协议类型-->
        <a-tag v-if="type !== 'all'">{{ data.provider }}</a-tag>
        <!--通道/采集器ID-->
        <a-tag v-if="type !== 'all'">
          <j-ellipsis style="max-width: 120px; white-space: normal">{{ data.id }}</j-ellipsis>
        </a-tag>
      </a-space>
    </div>
    <div class="header-right">
      <div class="header-right-item" v-for="item in StatusData" :key="item.type">
        <span class="header-right-item-label">{{ item.title }}</span>
        <span class="header-right-item-value">
          <span class="error" @click="onClick">{{ item.value }}</span> / {{ item.total }}
        </span>
      </div>
    </div>
  </div>
  <ChannelDetail :data="data" v-if="visible.channel" @close="visible.channel = false"/>
  <CollectorDetail :data="data" v-if="visible.collector" @close="visible.collector = false"/>
</template>

<script setup>
import {
  ChannelState,
  COLLECTOR_DATA,
  COLLECTOR_TYPE,
  getState,
  statusData
} from "@data-collector-ui/views/data-collect/data";
import {queryCount} from "@data-collector-ui/api/data-collect/dashboard";
import ChannelDetail from './Detail/Channel/index.vue'
import CollectorDetail from './Detail/Collector/index.vue'

const type = inject(COLLECTOR_TYPE, ref('all'))
const data = inject(COLLECTOR_DATA, ref({}))

const visible = reactive({
  channel: false,
  collector: false,
})

const title = computed(() => {
  if (type.value === 'all') {
    return '全部点位'
  } else {
    return data.value?.name || "--"
  }
})

const StatusData = ref([]);
// 查询数量
const handleSearch = (_type, id) => {
  const _terms = []
  if (_type === 'all') {
    StatusData.value = statusData
  }
  if (_type === 'channel') {
    StatusData.value = statusData.filter(i => i.type !== 'channel')
    _terms.push({
      column: 'channelId',
      termType: 'eq',
      value: id,
    })
  }
  if (_type === 'collector') {
    StatusData.value = statusData.filter(i => i.type !== 'collector')
    _terms.push({
      column: 'collectorId',
      termType: 'eq',
      value: id,
    })
  }
  StatusData.value.forEach(async (item) => {
    const res = await queryCount(item.type, {
      terms: _terms,
    });
    const resp = await queryCount(item.type, {
      terms: [
        ..._terms,
        {
          column: 'runningState',
          termType: 'not',
          value: 'running',
          type: 'and'
        },
      ]
    });
    item.total = res?.result;
    item.value = resp?.result;
  });
}

const onClick = () => {

}

const onDetail = () => {
  if (type.value === 'channel') {
    visible.channel = true
  } else {
    visible.collector = true
  }
}

watch(() => [type.value, data.value.id], () => {
  handleSearch(type.value || 'all', data.value.id || '')
}, {
  immediate: true
})
</script>

<style lang="less" scoped>
.right-header-warp {
  display: flex;
  gap: 24px;
  align-items: center;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(0, 0, 0, .1);

  .header-left {
    display: flex;
    align-items: center;
    gap: 8px;

    .title {
      font-size: 20px;
      font-weight: bold;
      cursor: pointer;
    }
  }

  .header-right {
    display: flex;
    gap: 16px;
    align-items: center;

    .header-right-item {
      display: flex;
      align-items: center;
      gap: 8px;

      &-label {
        color: #8c8c8c;
      }

      &-value {
        color: #262626;

        .error {
          color: @error-color;
          cursor: pointer;
        }
      }
    }
  }
}
</style>
