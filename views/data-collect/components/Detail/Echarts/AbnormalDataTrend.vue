<template>
  <a-spin :spinning="loading">
    <Header title="异常数据趋势"/>
    <div style="height: 300px">
      <JEcharts :option="errorDataOptions"/>
    </div>
  </a-spin>
</template>

<script setup>
import Header from "./Header.vue";
import {useI18n} from "vue-i18n";

const {t: $t} = useI18n()
const loading = ref(false);

const data = reactive({
  xAxis: [],
  y: []
})

const errorDataOptions = computed(() => {
  const _y = [...data.y];
  const maxY = _y.sort((a, b) => {
    return b - a
  })?.[0]
  return {
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: data.xAxis,
    },
    yAxis: {
      type: 'value',
    },
    grid: {
      left: maxY < 1000 ? 60 : String(maxY).length * 10,
      right: '60px',
    },
    tooltip: {
      trigger: 'axis',
    },
    color: ['#979AFF'],
    series: [
      {
        name: $t('components.Card.772454-4'),
        data: data.y,
        type: 'line',
        smooth: true,
        color: '#60DFC7',
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              {
                offset: 0,
                color: '#60DFC7', // 100% 处的颜色
              },
              {
                offset: 1,
                color: '#FFFFFF', //   0% 处的颜色
              },
            ],
            global: false, // 缺省为 false
          },
        }
      },
    ]
  }
})
</script>

<style lang="less" scoped>

</style>
