<template>
  <Collapsible
      title="数据解析"
      tip="将点位原始数据解析为平台可用数值或状态"
      v-model:value="data"
      :showSwitch="showSwitch"
  >
    <template #extraTemplate>
      123
    </template>
    <a-row :gutter="24">
      <a-col :span="12">
        <a-form-item label="数据类型" :name="['configuration', 'codec', 'provider']" :rules="[{required: true, message: '请选择'}]">
          <a-select v-model:value="formData.configuration.codec.provider" placeholder="请选择" :options="dataTypeOptions"/>
        </a-form-item>
      </a-col>
      <a-col :span="12">
        <a-form-item label="内存布局" name="memoryLayout" :rules="[{required: true, message: '请选择'}]">
          <a-select v-model:value="formData.memoryLayout" placeholder="请选择" :options="memoryOptions"/>
        </a-form-item>
      </a-col>
    </a-row>
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

const formData = inject('formData', reactive({}))

if (!('configuration' in formData)) {
  formData.configuration = {
    function: undefined,
    interval: 3000,
    parameter: {
      quantity: 1,
      writeByteCount: undefined,
      byteCount: undefined,
      address: undefined,
    },
    codec: {
      provider: undefined,
      configuration: {
        scaleFactor: 1,
        scale: undefined,
      },
    },
  }
}

if (!('codec' in formData.configuration)) {
  formData.configuration.codec = {
    provider: undefined,
    configuration: {
      scaleFactor: 1,
      scale: undefined,
    },
  }
}

const data = ref(!props.showSwitch)

const dataTypeOptions = [] // todo: 根据接口查询
const memoryOptions = [] // todo: 根据接口查询

console.log(formData)
</script>

<style lang="less" scoped>

</style>
