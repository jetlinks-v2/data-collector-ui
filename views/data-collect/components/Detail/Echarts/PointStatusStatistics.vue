<template>
  <div>
    <Header title="点位状态统计"/>
    <div style="height: 300px">
      <JEcharts :option="pointStatusOptions"/>
    </div>
  </div>
</template>

<script setup>
import Header from "./Header.vue";

const pointStatusOptions = computed(() => {
  return {
    grid: {
      left: '3%',
      right: '3%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    },
    yAxis: {
      type: 'value'
    },
    series: [
      {
        data: [1, 2, 3, 4, 5, 6, 7],
        type: 'line',
        smooth: true
      }
    ]
  }
})
</script>

<style lang="less" scoped>

</style>

