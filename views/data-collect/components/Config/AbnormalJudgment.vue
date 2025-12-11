<template>
  <Collapsible title="异常判断" tip="定义正常数据范围（仅适用于数值类型）,异常数据默认丢弃" v-model:value="data">
    <!--todo: 异常判断配置-->
    异常判断配置
  </Collapsible>
</template>

<script setup>
import Collapsible from "./Collapsible/index.vue";

const formData = inject('formData', reactive({}))

const data = ref('template')
</script>

<style lang="less" scoped>

</style>
