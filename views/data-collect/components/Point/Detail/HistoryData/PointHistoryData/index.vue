<template>
  <div>
    <Header :title="$t('DataCollect.index.400155-25')" @change="onChange"/>
    <div>
      <a-tabs v-model:activeKey="activeKey">
        <a-tab-pane key="list" :tab="$t('DataCollect.index.400155-26')"></a-tab-pane>
        <a-tab-pane key="chart" :tab="$t('DataCollect.index.400155-27')"></a-tab-pane>
      </a-tabs>
      <div>
        <!-- 时间就绪后再挂载，避免首查读取空时间、补查时表格引用尚未赋值。 -->
        <component v-if="time" :is="components[activeKey]" :time="time" />
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
