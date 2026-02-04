<template>
  <Header :title="$t('DataCollect.index.400151-56')" @change="onChange"/>
  <div style="height: 300px;">
    <JEcharts v-if="deathAreaData?.length" :option="deathAreaOptions" />
    <j-empty v-else />
  </div>
</template>

<script setup>
import Header from '../../../Detail/Echarts/Header.vue'
import { dashboard } from '@data-collector-ui/api/data-collect/dashboard'
import { useRequest } from "@jetlinks-web/hooks";
import { getParams } from '@data-collector-ui/views/data-collect/components/Detail/Echarts/tool';
import { isNil } from 'lodash-es';
import {useI18n} from "vue-i18n";

const {t: $t} = useI18n();

const info = inject('point-info')

const { data: deathAreaData, run } = useRequest(dashboard, {
  immediate: false,
})

const deathAreaOptions = computed(() => {
  const arr = deathAreaData.value.reverse()
  return {
    tooltip: {
      trigger: 'axis',
      position: function (pt) {
        const left = pt[0] - 80;
        return [left, '10%'];
      },
      valueFormatter: (value) => {
        return !isNil(value) ? value : '--'
      }
    },
    grid: {
      left: '3%',
      right: '3%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: arr?.map(item => item.data?.timeString) || []
    },
    yAxis: {
      type: 'value'
    },
    series: [
      {
        name: $t('DataCollect.index.400151-57'),
        data: arr?.map(item => item.data?.value) || [],
        type: 'line',
        smooth: true
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
      measurement: "result",
      dimension: "agg",
      params: {
        limit: 24,
        from: e.start,
        to: e.end,
        interval: obj.interval,
        format: "YYYY-MM-dd HH:mm",
        collectorId: info.value?.collectorId,
        pointId: info.value?.id,
        reason: "deadband"
      }
    }
  ])
}
</script>
