<template>
  <div class="point-top-warp">
    <div class="title">{{ $t('DataCollect.index.400150-7') }}</div>
    <div class="status-warp">
      <div class="status-warp-item">
        <div>
          <span style="color: #1677FF;"><AIcon type="EnvironmentFilled"/></span>
          {{ $t('DataCollect.index.400150-6') }}
        </div>
        <div class="status-warp-item-value" :class="{'active': pointType === 'total'}"
             @click="onClick('total')">{{ num.total }}
        </div>
      </div>
      <a-divider type="vertical"/>
      <div class="status-warp-item">
        <a-badge status="success" :text="$t('DataCollect.index.400150-8')"/>
        <div class="status-warp-item-value" :class="{'active': pointType === 'running'}"
             @click="onClick('running')">{{ num.running }}
        </div>
      </div>
      <a-divider type="vertical"/>
      <div class="status-warp-item">
        <a-badge status="error" :text="$t('DataCollect.index.400150-9')"/>
        <div class="status-warp-item-value" :class="{'active': pointType === 'stopped'}"
             @click="onClick('stopped')">{{ num.stopped }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import {COLLECTOR_DATA, COLLECTOR_TYPE} from "@data-collector-ui/views/data-collect/data";
import {queryPointStatistics} from "@data-collector-ui/api/data-collect/collector";
import {useI18n} from "vue-i18n";

const {t: $t} = useI18n();

const type = inject(COLLECTOR_TYPE, ref('all'))
const data = inject(COLLECTOR_DATA, ref({}))
const pointType = inject('point-type', ref('total'))

const num = reactive({
  total: 0,
  running: 0,
  stopped: 0,
})
const filterValue = inject('filter-value', reactive({
  channel: false,
  collector: false,
  point: false
}))

const handleSearch = async (params) => {
  const resp = await queryPointStatistics(params);
  if (resp.success) {
    const point = resp.result?.point || {};
    const total = Number(point.total) || 0;
    const abnormal = Number(point.abnormal) || 0;
    num.total = total;
    num.stopped = abnormal;
    num.running = Math.max(total - abnormal, 0);
  }
}

const onClick = (item) => {
  // if (item === pointType.value) {
  //   pointType.value = undefined
  // } else {
  pointType.value = item
  // }
}

const loadData = async () => {
  const params = {}
  if (type.value === 'channel' && data.value.id) {
    params.channelId = data.value.id
  } else if (type.value === 'collector' && data.value.id) {
    params.collectorId = data.value.id
  }
  await handleSearch(params)
}

watch(() => [type.value, data.value.id, filterValue.channel, filterValue.collector, filterValue.point], () => {
  loadData()
}, {
  immediate: true
})

defineExpose({
  loadData
})
</script>

<style lang="less" scoped>
.point-top-warp {
  display: flex;
  align-items: center;
  justify-content: space-between;

  .title {
    font-size: 16px;
    color: #191C27;
  }

  .status-warp {
    display: flex;
    align-items: center;
    gap: 24px;
    background-color: #F8FAFB;
    padding: 8px 16px;
    height: 32px;
    border-radius: 4px;

    &-item {
      display: flex;
      align-items: center;
      gap: 16px;

      &-value {
        cursor: pointer;
        font-size: 16px;
        font-weight: bold;
        text-decoration: underline;

        &.active {
          color: @primary-color;
        }
      }
    }
  }
}
</style>
