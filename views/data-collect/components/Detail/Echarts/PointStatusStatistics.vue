<template>
  <a-spin :spinning="loading">
    <Header :title="$t('DataCollect.index.400155-42')" :showTimeSelect="false" />
    <div style="height: 300px">
      <JEcharts :option="pointStatusOptions" />
    </div>
  </a-spin>
</template>

<script setup>
import Header from "./Header.vue";
import { queryPointCount } from "@data-collector-ui/api/data-collect/collector";
import { useRequest } from "@jetlinks-web/hooks";
import {useI18n} from "vue-i18n";

const {t: $t} = useI18n();

const info = inject('collector-info', ref({}))
const { data: runningCount, run: runRunningCount } = useRequest(queryPointCount, {
  immediate: false,
})

const { data: stoppedCount, run: runStoppedCount } = useRequest(queryPointCount, {
  immediate: false,
})

const loading = ref(false);

const pointStatusOptions = computed(() => {
  return {
    tooltip: {
      trigger: 'item',
      formatter: (params) => $t('DataCollect.index.400159-7', [params.name, params.value, params.percent])
    },
    legend: {
      top: 'center',
      right: '20%',
      orient: 'vertical',
      itemWidth: 8,
      itemHeight: 8,
      itemGap: 20,
      formatter: (name) => {
        const data = pointStatusOptions.value.series[0].data;
        const item = data.find(d => d.name === name);
        const dt = data.reduce((sum, d) => sum + d.value, 0)
        const percent = item && !!dt ? ((item.value / dt) * 100).toFixed(2) : '0.00';
        return `{name|${name}}  {value|${item?.value || 0}}  {percent|${percent}%}`;
      },
      textStyle: {
        rich: {
          name: {
            fontSize: 14,
            color: '#333',
            padding: [0, 0, 0, 0]
          },
          value: {
            fontSize: 14,
            fontWeight: 'bold',
            color: '#333',
            padding: [0, 10, 0, 10]
          },
          percent: {
            fontSize: 14,
            color: '#999'
          }
        }
      }
    },
    series: [
      {
        name: $t('DataCollect.index.400156-26'),
        type: 'pie',
        radius: ['55%', '75%'],
        center: ['30%', '50%'],
        avoidLabelOverlap: false,
        label: {
          show: false,
          position: 'center'
        },
        labelLine: {
          show: false
        },
        data: [
          {
            value: runningCount.value || 0,
            name: $t('DataCollect.index.400150-8'),
            itemStyle: {
              color: '#2196F3'
            }
          },
          {
            value: stoppedCount.value || 0,
            name: $t('DataCollect.index.400150-9'),
            itemStyle: {
              color: '#F44336'
            }
          }
        ],
        emphasis: {
          scale: true,
          scaleSize: 10
        }
      }
    ]
  }
})

watch(() => info.value.id, () => {
  if(info.value.id) {
    runRunningCount({
      terms: [
        { column: 'collectorId', value: info.value.id },
        { column: 'runningState', value: 'running' }
      ]
    })
    runStoppedCount({
    terms: [
        { column: 'collectorId', value: info.value.id },
        { column: 'runningState', value: 'stopped' }
      ]
    })
  }
}, { immediate: true })
</script>

<style lang="less" scoped></style>
