<template>
  <Collapsible title="异常判断" tip="定义正常数据范围（仅适用于数值类型）,异常数据默认丢弃" v-model:value="data" :show-switch="showSwitch">
    <!--todo: 异常判断配置-->
    异常判断配置
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

const formData = inject('formData', reactive({}))
</script>

<style lang="less" scoped>

</style>
