<template>
  <div class="history-data-item">
    <PointHistoryData />
  </div>
  <div class="history-data-item">
    <AbnormalDataTrend v-if="info.id" type="point" :id="info.id" />
  </div>
  <div class="history-data-item">
    <ErrorTypeRatio />
  </div>
  <div class="history-data-item">
    <DeadArea />
  </div>
</template>

<script setup lang="ts">
import {inject, ref} from "vue";
import PointHistoryData from './PointHistoryData/index.vue'
import AbnormalDataTrend from "../../../Detail/Echarts/AbnormalDataTrend.vue";
import ErrorTypeRatio from "./ErrorTypeRatio.vue";
import DeadArea from "./DeadArea.vue";

const info = inject('point-info', ref({id: ''}))
</script>

<style lang="less" scoped>
.history-data-item {
  &:not(:last-child) {
    margin-bottom: 16px;
  }
}
</style>
