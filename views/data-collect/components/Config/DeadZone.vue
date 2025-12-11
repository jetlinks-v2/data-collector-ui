<template>
  <Collapsible title="点位死区" tip="死区范围内的数据将被过滤（仅适用于数值类型）,减少抖动和冗余" v-model:value="data">
    <!--todo: 点位死区配置-->
    点位死区配置
  </Collapsible>
</template>

<script setup>
import Collapsible from "./Collapsible/index.vue";

const formData = inject('formData', reactive({}))

const data = ref('template')
</script>

<style lang="less" scoped>

</style>
