<template>
  <a-drawer open width="900px" @close="emits('close')">
    <template #title>
      <div class="header">
        <InputEditable
            :value="data.name"
            @change="(val) => onSave('name', val)"
            :maxLength="64"
        />
        <j-badge-status
            :status="data?.runningState?.value"
            :text="data?.runningState?.text"
            :statusNames="ChannelState"
        />
      </div>
    </template>
    <template #extra>
      <a-button type="link" danger>
        <AIcon type="DeleteOutlined"/>
      </a-button>
    </template>
    <a-descriptions>
      <a-descriptions-item label="通讯协议">{{ data.provider }}</a-descriptions-item>
      <a-descriptions-item label="所属采集器">{{ data.collectorName }}</a-descriptions-item>
      <a-descriptions-item label="所属通道">{{ data.collectorName }}</a-descriptions-item>
      <a-descriptions-item label="说明">
        <InputEditable
            :value="data.description"
            @change="(val) => onSave('description', val)"
            :maxLength="200"
        />
      </a-descriptions-item>
    </a-descriptions>
    <a-tabs v-model:activeKey="activeKey">
      <a-tab-pane v-for="item in tabsList" :key="item.key" :tab="item.tab"/>
    </a-tabs>
    <full-page>
      <component :is="tabs[activeKey]" :data="data"/>
    </full-page>
  </a-drawer>
</template>

<script setup>
import {ChannelState, DATA_COLLECTOR_SAVE_TYPE} from "@data-collector-ui/views/data-collect/data";
import InputEditable from "@data-collector-ui/components/Editable/InputEditable.vue";
import {tabs} from "./asyncComponent";

const props = defineProps({
  data: {
    type: Object,
    default: () => ({})
  },
})
const emits = defineEmits(['close'])

provide(DATA_COLLECTOR_SAVE_TYPE, 'collector')

const activeKey = ref('Info')

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

// 修改点位信息
const onSave = (key, value) => {
  console.log(key, value)
  // const params = {
  //   ...props.data,
  //   [key]: value
  // }
  //
  // // 调用修改点位信息接口
  // updatePoint(props.data.id, params).then(res => {
  //   if (res.success) {
  //     // 刷新当前点位信息
  //     // props.data = res.data
  //   }
  // })
}
</script>

<style lang="less" scoped>
.header {
  display: flex;
  align-items: center;
  gap: 16px;
}
</style>
