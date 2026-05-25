<template>
  <div class="right-header-warp">
    <a-tooltip :title="$t('DataCollect.index.400159-2')" v-if="foldTree">
      <a-button size="small" @click="foldTree = !foldTree">
        <AIcon type="DoubleRightOutlined" />
      </a-button>
    </a-tooltip>
    <div class="header-left">
      <div style="max-width: 200px;">
        <j-ellipsis>
          <div class="title" :class="{'_title': type !== 'all'}" @click="onDetail">{{ title }}</div>
        </j-ellipsis>
      </div>
      <a-space>
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
  <ChannelDetail :data="data" v-if="visible.channel" @close="visible.channel = false" @refresh="onRefresh"/>
  <CollectorDetail :data="data" v-if="visible.collector" @close="visible.collector = false" @refresh="onRefresh"/>
</template>

<script setup>
import {
  ChannelState,
  COLLECTOR_DATA,
  COLLECTOR_TYPE, FOLD_TREE,
  getState, REFRESH_HANDLER,
} from "@data-collector-ui/views/data-collect/data";
import ChannelDetail from './Detail/Channel/index.vue'
import CollectorDetail from './Detail/Collector/index.vue'
import {getCountList} from "@data-collector-ui/views/data-collect/utils";
import {useI18n} from "vue-i18n";

const {t: $t} = useI18n();

const refreshHandler = inject(REFRESH_HANDLER)
const type = inject(COLLECTOR_TYPE, ref('all'))
const data = inject(COLLECTOR_DATA, ref({}))
const filterValue = inject('filter-value', reactive({
  channel: false,
  collector: false,
  point: false,
  provider: [],
  runningState: [],
  state: [],
  collectorState: []
}))

const visible = inject('detail-visible')

const foldTree = inject(FOLD_TREE, ref(false));

const title = computed(() => {
  if (type.value === 'all') {
    return $t('DataCollect.index.400150-6')
  } else {
    return data.value?.name || "--"
  }
})

const countList = ref([]);
const getActive = (itemType) => {
  return !!filterValue[itemType]
}

const onClick = (item) => {
  Object.keys(filterValue).forEach(i => {
    if(['channel', 'collector', 'point'].includes(i)){
      filterValue[i] = item.type === i ? !filterValue[item.type] : false
    }
  })
}

const onRefresh = () => {
  refreshHandler?.refreshAll?.()
}

const onDetail = () => {
  visible.point = false
  if (type.value === 'channel') {
    visible.channel = true
    visible.collector = false
  } else if (type.value === 'collector') {
    visible.channel = false
    visible.collector = true
  }
}

const loadData = () => {
  getCountList(type.value || 'all', data.value.id || '', true, filterValue).then(resp => {
    countList.value = resp
  })
}

watch(() => [
  type.value,
  data.value.id,
  filterValue.channel,
  filterValue.collector,
  filterValue.point,
  filterValue.provider,
  filterValue.runningState,
  filterValue.state,
  filterValue.collectorState,
], () => {
  loadData()
}, {
  immediate: true,
  deep: true
})

defineExpose({
  loadData
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

    ._title {
      color: @primary-color;
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
          color: @primary-color;
          cursor: pointer;
          text-decoration: underline;

          &.active {
            color: @error-color;
          }
        }
      }
    }
  }
}
</style>
