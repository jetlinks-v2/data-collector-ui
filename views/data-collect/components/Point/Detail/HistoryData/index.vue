<template>
  <div class="history-data-item">
    <PointHistoryData/>
  </div>
  <div class="history-data-item">
    <AbnormalDataTrend/>
  </div>
  <div class="history-data-item">
    <Header title="异常类型占比"/>
    <div style="height: 300px">
      <JEcharts :option="errorTypeOptions"/>
    </div>
  </div>
  <div class="history-data-item">
    <Header title="死区数据统计"/>
    <div style="height: 300px">
      <JEcharts :option="deathAreaOptions"/>
    </div>
  </div>
</template>

<script setup>
import {useI18n} from "vue-i18n";
import Header from '../../../Detail/Echarts/Header.vue'
import PointHistoryData from './PointHistoryData/index.vue'
import AbnormalDataTrend from "../../../Detail/Echarts/AbnormalDataTrend.vue";

const {t: $t} = useI18n();

const errorTypeOptions = computed(() => {
  return {
    // title: {
    //   text: 'Referer of a Website',
    //   subtext: 'Fake Data',
    //   left: 'center'
    // },
    tooltip: {
      trigger: 'item'
    },
    legend: {
      orient: 'vertical',
      left: 'right',
      top: 'center'
    },
    grid: {
      left: 0,
      right: '3%',
      bottom: 0,
      containLabel: true
    },
    series: [
      {
        type: 'pie',
        radius: ['40%', '70%'],
        itemStyle: {
          borderRadius: 10,
          borderColor: '#fff',
          borderWidth: 2
        },
        label: {
          show: true,
          position: 'center',
          formatter: `{a|${65}}\n{b|异常总数}`,
          rich: {
            a: {
              fontSize: 24,
              fontWeight: 'bold',
              lineHeight: 36,
              color: '#1A1A1A',
            },
            b: {
              fontSize: 14,
              color: '#777777',
              lineHeight: 16
            }
          }
        },
        labelLine: {
          show: false
        },
        data: [
          {value: 1048, name: 'Search Engine'},
          {value: 735, name: 'Direct'},
          {value: 580, name: 'Email'},
          {value: 484, name: 'Union Ads'},
          {value: 300, name: 'Video Ads'}
        ]
      }
    ]
  }
})
const deathAreaOptions = computed(() => {
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
      },
      {
        data: [12, 678, 32, 1400, 235, 1330, 123],
        type: 'line',
        smooth: true
      }
    ]
  }
})
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
