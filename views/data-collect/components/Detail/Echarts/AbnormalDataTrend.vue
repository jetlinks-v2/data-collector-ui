<template>
  <a-spin :spinning="loading">
    <Header title="异常数据趋势" @change="onChange"/>
    <div style="height: 300px">
      <JEcharts :option="errorDataOptions"/>
    </div>
  </a-spin>
</template>

<script setup>
import Header from "./Header.vue";
import {useI18n} from "vue-i18n";
import { dashboard } from "@data-collector-ui/api/others";
import {abnormalParams} from "./tool";

const {t: $t} = useI18n()
const props = defineProps({
  type: {
    type: String,
    default: '' //channel | collector
  }
})

const info = inject('collector-info', ref({}))
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
        name: '异常数据量',
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

const onChange = async (val) => {
  loading.value = true;
  const resp = await dashboard(abnormalParams(val, props.type, info.value.id)).finally(() => {
    loading.value = false;
  });
  if (resp.success && resp?.result?.length) {
    const x = resp.result
        .map((item) => item.data.timeString)
        .reverse();
    const y = resp.result.map((item) => item.data.value).reverse();
    data.xAxis = x
    data.y = y
  }
}
</script>

<style lang="less" scoped>

</style>
