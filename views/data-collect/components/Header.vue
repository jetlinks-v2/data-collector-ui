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
      <div class="header-right-item" v-for="item in countList" :key="item.type">
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
} from "@data-collector-ui/views/data-collect/data";
import ChannelDetail from './Detail/Channel/index.vue'
import CollectorDetail from './Detail/Collector/index.vue'
import {getCountList} from "@data-collector-ui/views/data-collect/utils";

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

const countList = ref([]);

const onClick = () => {

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
