<template>
  <Collapsible
      title="数据解析"
      tip="将点位原始数据解析为平台可用数值或状态"
      v-model:value="data"
  >
    <template #extraTemplate>
      123
    </template>
    <a-row :gutter="24">
      <a-col :span="12">
        <a-form-item label="数据类型" name="dataType" :rules="[{required: true, message: '请选择'}]">
          <a-select v-model:value="formData.dataType" placeholder="请选择"/>
        </a-form-item>
      </a-col>
      <a-col :span="12">
        <a-form-item label="内存布局" name="memoryLayout" :rules="[{required: true, message: '请选择'}]">
          <a-select v-model:value="formData.memoryLayout" placeholder="请选择"/>
        </a-form-item>
      </a-col>
    </a-row>
  </Collapsible>
</template>

<script setup>
import Collapsible from "./Collapsible/index.vue";

const formData = inject('formData', reactive({}))

const data = ref('template')
</script>

<style lang="less" scoped>

</style>
