<template>
  <Header :title="$t('DataCollect.index.400151-58')" @change="onChange"/>
  <div style="height: 300px;display: flex;align-items: center;justify-content: center;">
    <JEcharts v-if="errorTypeData?.length" :option="errorTypeOptions" />
    <j-empty v-else />
  </div>
</template>

<script setup>
import Header from '../../../Detail/Echarts/Header.vue'
import { dashboard } from '@data-collector-ui/api/data-collect/dashboard'
import { useRequest } from "@jetlinks-web/hooks";
import { getParams } from '@data-collector-ui/views/data-collect/components/Detail/Echarts/tool';
import {useI18n} from "vue-i18n";

const {t: $t} = useI18n();

const info = inject('point-info')

const { data: errorTypeData, run } = useRequest(dashboard, {
  immediate: false,
})

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
      left: '50%',
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
        center: ['30%', '50%'],
        radius: ['50%', '70%'],
        itemStyle: {
          borderRadius: 10,
          borderColor: '#fff',
          borderWidth: 2
        },
        label: {
          show: true,
          position: 'center',
          formatter: `{a|${errorTypeData.value?.reduce((pre, cur) => pre + cur.data.value.count, 0)}}\n{b|${$t('DataCollect.index.400151-59')}}`,
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
        data: errorTypeData.value?.map(item => {
          return {
            name: item.data.value.errorDescription,
            value: item.data.value.count
          }
        })
      }
    ]
  }
})

const onChange = (e) => {
  const obj = getParams(e)
  run([
    {
      dashboard: "pointResult",
      object: "pointResult",
      measurement: "collector-error-rank",
      dimension: "agg",
      params: {
        limit: 24,
        from: e.start,
        to: e.end,
        interval: obj.interval,
        format: "YYYY-MM-dd HH:mm",
        collectorId: info.value?.collectorId,
        pointId: info.value?.id,
      }
    }
  ])
}
</script>