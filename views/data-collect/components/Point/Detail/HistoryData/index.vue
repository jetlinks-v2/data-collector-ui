<template>
  <div class="history-data-item">
    <PointHistoryData />
  </div>
  <div class="history-data-item">
    <AbnormalDataTrend />
  </div>
  <div class="history-data-item">
    <ErrorTypeRatio />
  </div>
  <div class="history-data-item">
    <DeadArea />
  </div>
</template>

<script setup>
import { useI18n } from "vue-i18n";
import Header from '../../../Detail/Echarts/Header.vue'
import PointHistoryData from './PointHistoryData/index.vue'
import AbnormalDataTrend from "../../../Detail/Echarts/AbnormalDataTrend.vue";
import ErrorTypeRatio from "./ErrorTypeRatio.vue";
import DeadArea from "./DeadArea.vue";

const { t: $t } = useI18n();


const onChange = (val) => {
  console.log(val)
}
</script>

<style lang="less" scoped>
.history-data-item {
  &:not(:last-child) {
    margin-bottom: 16px;
  }
}
</style>
