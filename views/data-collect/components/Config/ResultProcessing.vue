<template>
  <Collapsible title="结果处理" tip="对数据进行告警触发、数据聚合、转发等操作" v-model:value="data"
               :show-switch="showSwitch">
    <template #extraTemplate>
      木有写
    </template>
    <a-form-item>
      <div style="display: flex; align-items: center;">
        <a-switch v-model:checked="formData.managedConfiguration.handler.enabled" style="margin-right: 12px"/>
        <template v-if="!flag">当点位发生异常时，触发告警</template>
        <template v-else>
          <a-select style="width: 100px;" :options="options"/>
          异常时，
          <a-input-number/>
          秒内最多触发
          <a-input-number/>
          次同一类型 告警
        </template>
      </div>
    </a-form-item>
  </Collapsible>
</template>
<script setup>
import Collapsible from "./Collapsible/index.vue";

const props = defineProps({
  showSwitch: {
    type: Boolean,
    default: true
  }
})
const data = ref(!props.showSwitch)

const formData = inject('plugin-form', reactive({}))

const flag = computed(() => !!formData.managedConfiguration?.handler?.enabled)

const options = [
  {
    label: '通讯异常',
    value: '1'
  },
  {
    label: '请求超时',
    value: '2'
  },
  {
    label: '数据异常',
    value: '3'
  },
  {
    label: '解析失败',
    value: '4'
  },
  {
    label: '点位死区',
    value: '5'
  }
]

if (!('managedConfiguration' in formData)) {
  formData.managedConfiguration = {
    byteLayout: undefined,
    codec: undefined,
    converter: {
      enabled: false
    },
    outlier: {
      enabled: false
    },
    deadband: {
      enabled: false
    },
    handler: {
      enabled: false
    },
  }
}

if (!('handler' in formData.managedConfiguration)) {
  formData.managedConfiguration.handler = {
    enabled: false
  }
}
</script>

<style lang="less" scoped>

</style>
