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
        <!--        <j-badge-status-->
        <!--            v-if="type === 'channel'"-->
        <!--            :status="getState(data).value"-->
        <!--            :text="getState(data).text"-->
        <!--            :statusNames="ChannelState"-->
        <!--        />-->
        <a-tag v-if="type === 'channel'" :color="ChannelState[getState(data).value]">{{ getState(data).text }}</a-tag>
        <!--通讯协议类型-->
        <a-tag v-if="type !== 'all'">{{ data.provider }}</a-tag>
        <!--通道/采集器ID-->
        <a-tag v-if="type !== 'all'">
          <j-ellipsis style="max-width: 120px; white-space: normal">{{ data.id }}</j-ellipsis>
        </a-tag>
      </a-space>
    </div>
    <div class="header-right">
      <div class="header-right-item" v-for="item in countList" :key="item.type">
        <span class="header-right-item-label">
          <j-ellipsis>{{ item.title }}</j-ellipsis>
        </span>
        <span class="header-right-item-value">
          <span class="error" @click="onClick(item)" :class="{'active': getActive(item.type)}">{{
              item.value
            }}</span> / {{ item.total }}
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
} from "@data-collector-ui/views/data-collect/data";
import ChannelDetail from './Detail/Channel/index.vue'
import CollectorDetail from './Detail/Collector/index.vue'
import {getCountList} from "@data-collector-ui/views/data-collect/utils";

const type = inject(COLLECTOR_TYPE, ref('all'))
const data = inject(COLLECTOR_DATA, ref({}))
const filterValue = inject('filter-value', reactive({}))

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

const countList = ref([]);
const getActive = (itemType) => {
  if (itemType === 'point') {
    return filterValue.pointState.includes('error')
  }
  if (itemType === 'channel') {
    return filterValue.runningState.includes('stopped')
  }
  if (itemType === 'collector') {
    return filterValue.collectorState.includes('stopped')
  }
  return false
}

const onClick = (item) => {
  if (item.type === 'point') {
    filterValue.pointState = filterValue.pointState.includes('error') ? [] : ['error']
  }
  if (item.type === 'channel') {
    filterValue.runningState = filterValue.runningState.includes('stopped') ? [] : ['stopped']
  }
  if (item.type === 'collector') {
    filterValue.collectorState = filterValue.collectorState.includes('stopped') ? [] : ['stopped']
  }
}

const onDetail = () => {
  if (type.value === 'channel') {
    visible.channel = true
  } else if (type.value === 'collector') {
    visible.collector = true
  }
}

watch(() => [type.value, data.value.id], () => {
  getCountList(type.value || 'all', data.value.id || '', true).then(resp => {
    countList.value = resp
  })
}, {
  immediate: true
})
</script>

<style lang="less" scoped>
.right-header-warp {
  display: flex;
  gap: 24px;
  align-items: center;
  padding: 12px 24px;
  height: 48px;
  border-radius: 6px;
  background: #F8FAFB;
  border: 1px solid #E7E9EF;

  .header-left {
    display: flex;
    align-items: center;
    gap: 8px;

    .title {
      font-size: 18px;
      font-weight: 500;
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
        color: #1A1A1A;
      }

      &-value {
        color: #262626;
        font-size: 16px;
        font-weight: bold;
        min-width: 50px;

        .error {
          color: @error-color;
          cursor: pointer;
          text-decoration: underline;

          &.active {
            color: @primary-color;
          }
        }
      }
    }
  }
}
</style>
