<template>
  <a-space>
    <a-space>
      <span>统计周期:</span>
      <a-select v-model:value="cycleType" style="width: 120px" :options="cycleOptions">
      </a-select>
    </a-space>
    <a-space v-if="cycleType !== '*'">
      <span>统计规则:</span>
      <a-select v-model:value="ruleType" style="width: 120px">
        <a-select-option value="avg">平均值</a-select-option>
        <a-select-option value="max">最大值</a-select-option>
        <a-select-option value="min">最小值</a-select-option>
        <a-select-option value="count">总数</a-select-option>
      </a-select>
    </a-space>
  </a-space>
  <div style="height: 300px">
    <JEcharts :option="errorDataOptions" />
  </div>
</template>

<script setup>
import { queryPointAggregation } from '@data-collector-ui/api/data-collect/collector'
import { useRequest } from '@jetlinks-web/hooks';
import { getParams } from '@data-collector-ui/views/data-collect/components/Detail/Echarts/tool';
import dayjs from 'dayjs';

const props = defineProps({
  time: {
    type: Object,
    default: () => { }
  }
})
const { data: aggregationData, run: runAggregation } = useRequest(queryPointAggregation, {
  immediate: false,
})

const cycleType = ref('*')
const ruleType = ref('count')
const info = inject('point-info', ref({}))
const errorDataOptions = computed(() => {
  return {
    grid: {
      left: '3%',
      right: '3%',
      bottom: '20%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: aggregationData.value?.map(item => item.time).reverse()
    },
    yAxis: {
      type: 'value'
    },
    dataZoom: [
      {
        type: 'inside',
        start: 0,
        end: 100,
      },
      {
        start: 0,
        end: 100,
      },
    ],
    tooltip: {
      trigger: 'axis',
      position: function (pt) {
        const left = pt[0] - 80;
        return [left, '10%'];
      },
      valueFormatter: (value) => {
        return value || '--'
      }
    },
    series: [
      {
        data: aggregationData.value?.map((i) => {
          return typeof i.value === 'number' && !isNaN(i.value) ? Number(i.value).toFixed(2) : i.value
        }).reverse(), //如果是数字保留两位小数
        type: 'line',
        areaStyle: {},
      },
    ],
  }
})

const cycleOptions = computed(() => {
  const diffInSeconds = dayjs(props.time.end).diff(dayjs(props.time.start), 'minute');
  console.log(diffInSeconds)
  if(diffInSeconds < 60) {
    return [
      {
          label: '实际值',
          value: '*',
      },
      {
          label: '按分钟统计',
          value: '1m',
      },
      {
          label: '按小时统计',
          value: '1h',
      }
    ]
  } else if (diffInSeconds < 60 * 60) {
    return [
      {
          label: '实际值',
          value: '*',
      },
      {
          label: '按分钟统计',
          value: '1m',
      },
      {
          label: '按小时统计',
          value: '1h',
      }
    ]
  } else if (diffInSeconds < 60 * 60 * 24) {
    return [
      {
          label: '按分钟统计',
          value: '1m',
      },
      {
          label: '按小时统计',
          value: '1h',
      }
    ]
  } else if (diffInSeconds < 60 * 60 * 24 * 7) {
    return [
      {
          label: '按小时统计',
          value: '1h',
      },
      {
          label: '按天统计',
          value: '1d',
      }
    ]
  } else if (diffInSeconds < 60 * 60 * 24 * 30) {
    return [
      {
          label: '按天统计',
          value: '1d',
      },
      {
          label: '按周统计',
          value: '1w',
      }
    ]
  }
})

watchEffect(() => {
  const obj = getParams(props.time)
  runAggregation(info.value.collectorId, {
    columns: [
      {
        column: "value",
        alias: "value",
        aggregation: ruleType.value
      }
    ],
    groupByTime: {
      interval: cycleType.value === '*' ? obj.interval : cycleType.value,
      format: "yyyy-MM-dd HH:mm:ss",
      from: props.time.start,
      to: props.time.end,
      column: "timestamp",
      alias: "timestamp"
    },
    filter: {
      terms: [
        {
          column: "pointId",
          value: info.value.id
        }
      ]
    },
    limit: obj.limit
  })
})
</script>

<style lang="less" scoped></style>
