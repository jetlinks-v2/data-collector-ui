<template>
  <Collapsible title="存储配置" tip="配置点位数据存储类型" v-model:value="data">
    <a-form-item>
      <j-card-select
          v-model:value="formData.h"
          :multiple="true"
          :options="list"
      />
    </a-form-item>
  </Collapsible>
</template>

<script setup>
import Collapsible from "./Collapsible/index.vue";

const formData = inject('formData', reactive({}))

const data = ref('template')
const list = [
  {
    label: '存储点位数据',
    value: '1',
    describe: '将采集到的点位数据保存到平台'
  },
  {
    label: '存储异常数据',
    value: '2',
    describe: '将异常数据上报平台并存储'
  },
  {
    label: '存储死区数据',
    value: '3',
    describe: '将死区数据上报平台并存储'
  }
]
</script>

<style lang="less" scoped>

</style>
