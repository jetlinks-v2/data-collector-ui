<template>
  <a-spin :spinning="loading">
    <Header :title="$t('components.Card.772454-0')" @change="onChange"/>
    <div style="height: 300px">
      <JEcharts :option="dataOptions"/>
    </div>
  </a-spin>
</template>

<script setup>
import Header from "./Header.vue";
import {useI18n} from "vue-i18n";
import {dashboard} from "@data-collector-ui/api/data-collect/dashboard";
import {pointParams} from "./tool";

const props = defineProps({
  id: { // todo: 传入的各种id
    type: String,
    default: ''
  },
  type: {
    type: String,
    default: '' //channel | collector
  }
})

const {t: $t} = useI18n()
const loading = ref(false);

const data = reactive({
  xAxis: [],
  y: []
})

const dataOptions = computed(() => {
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
      right: '30px',
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

const onChange = async (val) => {
  loading.value = true;
  const resp = await dashboard(pointParams(val, props.type, props.id));
  if (resp.success && resp?.result?.length) {
    const x = resp.result
        .map((item) => item.data.timeString)
        .reverse();
    const y = resp.result.map((item) => item.data.value).reverse();
    data.xAxis = x
    data.y = y
  }
  setTimeout(() => {
    loading.value = false;
  }, 300)
}
</script>

<style lang="less" scoped>

</style>

