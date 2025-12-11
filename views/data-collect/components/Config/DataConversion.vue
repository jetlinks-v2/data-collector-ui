<template>
  <Collapsible title="数据转换" tip="对数值进行缩放,换算或映射处理" v-model:value="data">
    <a-row :gutter="24">
      <a-col :span="12">
        <a-form-item
            :name="[
              'configuration',
              'codec',
              'configuration',
              'scaleFactor',
            ]"
            label="缩放因子"
            :rules="[
              {
                required: true,
                message: '请输入'
              }
            ]"
        >
          <a-input-number
              v-model:value="formData.configuration.codec.configuration.scaleFactor"
              :controls="false"
              :max="65535"
              placeholder="请输入"
              style="width: 100%"
              type="number"
          />
        </a-form-item>
      </a-col>
      <a-col :span="12">
        <a-form-item
            :name="['configuration', 'codec', 'configuration', 'scale']"
            label="小数位保留数"
        >
          <a-input-number
              v-model:value="formData.configuration.codec.configuration.scale"
              :controls="false"
              :max="65535"
              :min="0"
              :precision="0"
              placeholder="请输入"
              style="width: 100%"
          />
        </a-form-item>
      </a-col>
    </a-row>
  </Collapsible>
</template>

<script setup>
import Collapsible from "./Collapsible/index.vue";

const formData = inject('formData', reactive({}))

const data = ref('template')

if(!formData.configuration?.codec?.configuration) {
  formData.configuration = {
    ...formData.configuration,
    codec: {
      ...formData.configuration.codec,
      configuration: {}
    }
  }
}
</script>

<style lang="less" scoped>

</style>
