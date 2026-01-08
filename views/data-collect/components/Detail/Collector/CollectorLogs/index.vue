<template>
  <div>
    <Logs :id="`collector-log-${currentChannel.id}`" :topic="`/collector/${currentChannel.id}/*`">
    </Logs>
  </div>
</template>

<script setup>
import Logs from "../../LogsManage/index.vue";
import {COLLECTOR_DATA, COLLECTOR_TYPE} from "@data-collector-ui/views/data-collect/data";

const currentChannel = inject(COLLECTOR_DATA)

</script>

<style lang="less" scoped>

</style>
