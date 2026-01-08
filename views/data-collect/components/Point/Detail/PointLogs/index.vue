<template>
  <div>
    <Logs :id="`point-log-${currentPoint.id}`" :topic="`/collector/${currentPoint.collectorId}/${currentPoint.id}/*`">
    </Logs>
  </div>
</template>

<script setup>
import Logs from "../../../Detail/LogsManage/index.vue";

const currentPoint = inject('point-info')

</script>

<style lang="less" scoped>

</style>
