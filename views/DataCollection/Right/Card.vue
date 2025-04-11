<template>
  <a-spin :spinning="loading">
    <div class="dash-board">
      <div class="header">
        <div class="left">
          <h3>
            <j-ellipsis>
              {{ $t('components.Card.772454-0') }}
            </j-ellipsis>
          </h3>
        </div>
        <div class="right">
          <JDashboardTimeSelect
              key="flow-static"
              :type="'hour'"
              :quickBtnList="[
                    { label: $t('DashBoard.index.753511-3'), value: 'hour' },
                    { label: $t('components.TimeSelect.753514-0'), value: 'today' },
                    { label: $t('DashBoard.index.753511-5'), value: 'week' },
                  ]"
              @change="initQueryTime"
          />
        </div>
      </div>
      <div style="width: 100%; height: 350px">
        <JEcharts :options="options" :style="{height: '350px'}"/>
      </div>
    </div>
  </a-spin>
</template>

<script lang="ts" setup>

import {useI18n} from 'vue-i18n';
import {dashboard} from "@collector/api/others";

const {t: $t} = useI18n();

const chartRef = ref<Record<string, any>>({});
const loading = ref(false);

const _data = inject('collector-data')
const type = inject('collector-type')

const data = reactive({
  xAxis: [],
  y: []
})

const options = computed(() => {
  const maxY: number = data.y.sort((a, b) => {
    return b - a
  })?.[0];
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
        },
      },
    ],
  }
})

const initQueryTime = (e) => {
  getEcharts(e)
}

const getParams = (dt: any) => {
  const time = dt.end - dt.start;
  const hour = 60 * 60 * 1000;
  const days = hour * 24;
  if (time <= hour) {
    return {
      limit: Math.abs(Math.ceil(time / (60 * 60))),
      interval: '1m',
      format: 'YYYY-MM-dd HH:mm',
    };
  } else if (time > hour && time <= days) {
    return {
      limit: Math.abs(Math.ceil(time / hour)),
      interval: '1h',
      format: 'YYYY-MM-dd HH:mm',
    };
  } else if (time > days && time <= days * 7) {
    return {
      limit: Math.abs(Math.ceil(time / days)) + 1,
      interval: '1d',
      format: 'YYYY-MM-dd',
    };
  } else if (time > days * 90) {
    return {
      limit: Math.abs(Math.ceil(time / days / 30)) + 1,
      interval: '1M',
      format: 'YYYY-MM-dd HH:mm',
    };
  } else {
    return {
      limit: Math.abs(Math.ceil(time / days)) + 1,
      interval: '1d',
      format: 'YYYY-MM-dd',
    };
  }
};

const getEcharts = async (val: any) => {
  const params = [
    {
      dashboard: 'collector',
      object: 'pointData',
      measurement: 'quantity',
      dimension: 'agg',
      params: {
        from: val.start,
        to: val.end,
        limit: getParams(val).limit,
        interval: getParams(val).interval,
        format: getParams(val).format
      },
    },
  ]
  loading.value = true;
  const resp: any = await dashboard(params);
  if (resp.success && resp?.result?.length) {
    data.xAxis = resp.result
        .map((item: any) => item.data.timeString)
        .reverse();
    data.y = resp.result.map((item: any) => item.data.value).reverse();
  }
  setTimeout(() => {
    loading.value = false;
  }, 300)
};

watch(() => _data.value, () => {
  // todo: 处理选中通道和采集器的情况
  console.log(_data.time)
}, {
  immediate: true,
  deep: true
})
</script>

<style lang="less" scoped>
.dash-board {
  display: flex;
  flex-direction: column;
  height: 400px;
  background-color: #fff;
  border-radius: 2px;
  margin-top: 24px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;

  .left h3 {
    margin-top: 8px;
  }
}

.left,
.right {
  display: flex;
  align-items: center;
}
</style>
