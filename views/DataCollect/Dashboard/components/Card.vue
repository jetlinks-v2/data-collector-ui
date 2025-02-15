<template>
    <a-spin :spinning="loading">
        <FullPage>
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
                        <a-radio-group
                            button-style="solid"
                            style="margin-right: 10px"
                            v-model:value="data.time.type"
                        >
                            <a-radio-button value="hour">
                                {{ $t('components.Card.772454-1') }}
                            </a-radio-button>
                            <a-radio-button value="today">
                                {{ $t('components.Card.772454-2') }}
                            </a-radio-button>
                            <a-radio-button value="week">
                                {{ $t('components.Card.772454-3') }}
                            </a-radio-button>
                        </a-radio-group>
                        <a-range-picker
                            :allowClear="false"
                            :show-time="{ format: 'HH:mm:ss' }"
                            format="YYYY-MM-DD HH:mm:ss"
                            v-model:value="data.time.time"
                            @change="pickerTimeChange"
                        >
                            <template #suffixIcon
                                ><AIcon type="CalendarOutlined"
                            /></template>
                        </a-range-picker>
                    </div>
                </div>
                <div
                    ref="chartRef"
                    style="width: 100%; min-height: 350px"
                ></div>
            </div>
        </FullPage>
    </a-spin>
</template>

<script lang="ts" setup>
import { dashboard } from '../../../../api/data-collect/dashboard';
import { getTimeByType, pointParams, pointOptionsSeries } from '../tool';
import * as echarts from 'echarts';
import dayjs from 'dayjs';
import { useI18n } from 'vue-i18n';

const { t: $t } = useI18n();

const chartRef = ref<Record<string, any>>({});
const loading = ref(false);
const data: any = ref({
    time: {
        type: 'hour',
        time: [null, null],
    },
});

const pickerTimeChange = () => {
    data.value.time.type = undefined;
};

const getEcharts = async (val: any) => {
    loading.value = true;
    const resp: any = await dashboard(pointParams(val));
    if (resp.success && resp?.result?.length) {
         const x = resp.result
            .map((item: any) => item.data.timeString)
            .reverse();
        const y = resp.result.map((item: any) => item.data.value).reverse();
        handleOptions(x, y);
    }
    setTimeout(()=>{
        loading.value = false;
    },300)
};

const handleOptions = (x = [], y = []) => {
    const chart: any = chartRef.value;
    if (chart) {
        const myChart = echarts.init(chart);
        const _y =  [...y];
        const maxY: number = _y.sort((a,b)=>{
            return b-a
        })?.[0]
        const options = {
            xAxis: {
                type: 'category',
                boundaryGap: false,
                data: x,
            },
            yAxis: {
                type: 'value',
            },
            grid: {
                left: maxY < 1000 ? 60 : maxY.toString().length * 10,
                right: '60px',
            },
            tooltip: {
                trigger: 'axis',
            },
            color: ['#979AFF'],
            series: [
                {
                    name: $t('components.Card.772454-4'),
                    data: y,
                    ...pointOptionsSeries,
                },
            ],
        };
        nextTick(() => {
            myChart.setOption(options);
            window.addEventListener('resize', function () {
                myChart.resize();
            });
        });
    }
};

watch(
    () => data.value.time.type,
    (value) => {
        if (value === undefined) return;
        const date = getTimeByType(value);
        data.value.time.time = [dayjs(date), dayjs(new Date())];
    },
    { immediate: true, deep: true },
);
watch(
    () => data.value,
    (value) => {
        const { time } = value;
        if (time.type || (time.time[0] && time.time[1])) {
            getEcharts(value);
        }
    },
    { immediate: true, deep: true },
);
</script>

<style lang="less" scoped>
.dash-board {
    display: flex;
    flex-direction: column;
    height: 100%;
    // height: 500px;
    padding: 24px;
    background-color: #fff;
    border-radius: 2px;
    margin-top: 24px;
}
.header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    .left h3 {
        width: 200px;
        margin-top: 8px;
    }
}
.left,
.right {
    display: flex;
    align-items: center;
}
.empty {
    height: 300px;
}
</style>
