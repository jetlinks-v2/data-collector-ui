<template>
  统计周期:
  <a-select style="width: 120px" value="actual">
    <a-select-option value="actual">实际值</a-select-option>
  </a-select>
  <div style="height: 300px">
    <JEcharts :option="errorDataOptions"/>
  </div>
</template>

<script setup>
import { queryPointAggregation } from '@data-collector-ui/api/data-collect/collector'
import { useRequest } from '@jetlinks-web/hooks';

const { data: aggregationData, run: runAggregation } = useRequest(queryPointAggregation, {
  
})

const info = inject('point-info', ref({}))
const errorDataOptions = computed(() => {
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
        data: [820, 932, 901, 934, 1290, 1330, 1320],
        type: 'line',
        smooth: true
      }
    ]
  }
})

onMounted(() => {
  runAggregation(info.value.id, {})
})
</script>

<style lang="less" scoped>

</style>
