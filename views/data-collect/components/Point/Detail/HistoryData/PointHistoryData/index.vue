<template>
  <div>
    <Header title="点位历史数据" @change="onChange"/>
    <div>
      <a-tabs v-model:activeKey="activeKey">
        <a-tab-pane key="list" tab="列表"></a-tab-pane>
        <a-tab-pane key="chart" tab="图表"></a-tab-pane>
      </a-tabs>
      <div>
        <component :is="components[activeKey]" :time="time" />
      </div>
    </div>
  </div>
</template>

<script setup>
import Header from "../../../../Detail/Echarts/Header.vue";
import Table from "./Table.vue";
import Chart from "./Chart.vue";

const activeKey = ref('list')
const info = inject('point-info')
const time = ref()
const components = {
  list: Table,
  chart: Chart,
}

const onChange = (e) => {
  time.value = e
}
</script>

<style lang="less" scoped>

</style>
