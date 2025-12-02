<!--
可编辑表单项:
鼠标移入背景颜色:#f5f6f8
点击后变成可编辑的状态, 点击其他地方则变回不可编辑状态,
对于复杂的组件可编辑的状态需要留插槽,把相应的原始值传入,然后得到值之后emits出去
根据情况把现有的需要的组件添加进来
考虑不可编辑状态的展示
 -->

<template>
  <div>

  </div>
</template>

<script setup>
import {Input, InputNumber, Select} from 'ant-design-vue'

const props = defineProps({
  value: {
    type: String,
  },
  type: {
    type: String,
    default: 'string'
  }
})

const emit = defineEmits(['update:value', 'change'])

const componentObj = {
  'string': Input,
  'number': InputNumber,
  'select': Select
}

const isEdit = ref(false)
</script>

<style lang="less" scoped>

</style>
