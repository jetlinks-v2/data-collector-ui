<template>
  <Collapsible title="结果处理" tip="对数据进行告警触发、数据聚合、转发等操作" v-model:value="data">
    <a-form-item>
      <a-switch v-model:checked="formData.g1"/>
      当点位发生异常时，触发告警
    </a-form-item>
  </Collapsible>
</template>
<script setup>
import Collapsible from "./Collapsible/index.vue";

const formData = inject('formData', reactive({}))

const data = ref('template')
</script>

<style lang="less" scoped>

</style>
