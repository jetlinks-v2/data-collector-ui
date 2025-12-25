<template>
  <Collapsible title="异常判断" tip="定义正常数据范围（仅适用于数值类型）,异常数据默认丢弃" v-model:value="data" :show-switch="showSwitch">
    <template #extraTemplate>
      木有写
    </template>
    <TermsCascader
        v-model:value="terms"
        :builtinOptions="builtinParams"
    />
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
const terms = ref({
  column: undefined,
  termType: undefined,
  value: {
    source: 'fixed',
    value: undefined
  }
})

const builtinParams = [
  { label: '当前用户', value: 'userId' },
  { label: '当前时间', value: 'timestamp' }
]
</script>

<style lang="less" scoped>

</style>
