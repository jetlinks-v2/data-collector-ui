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
import {useI18n} from "vue-i18n";
import {buildAllChannelTerm, buildPointQueryFilterTerms} from "@data-collector-ui/views/data-collect/utils";
import {queryCount} from "@data-collector-ui/api/data-collect/dashboard";

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
  point: false,
  provider: [],
  runningState: [],
  state: [],
  collectorState: []
}))

const handleSearch = async (params) => {
  const terms = params.terms || []
  const [totalResp, runningResp, stoppedResp] = await Promise.all([
    queryCount('point', params),
    queryCount('point', {
      ...params,
      terms: [
        ...terms,
        {
          column: 'runningState',
          value: 'running',
          type: 'and'
        }
      ]
    }),
    queryCount('point', {
      ...params,
      terms: [
        ...terms,
        {
          column: 'runningState',
          termType: 'not',
          value: 'running',
          type: 'and'
        }
      ]
    })
  ]);

  num.total = totalResp?.result || 0;
  num.running = runningResp?.result || 0;
  num.stopped = stoppedResp?.result || 0;
}

const onClick = (item) => {
  // if (item === pointType.value) {
  //   pointType.value = undefined
  // } else {
  pointType.value = item
  // }
}

const loadData = async () => {
  const params = {
    terms: [
      ...buildPointQueryFilterTerms(filterValue, {skipChannel: type.value === 'all'})
    ]
  }

  if (type.value === 'all') {
    const channelTerm = await buildAllChannelTerm(filterValue);
    if (!channelTerm) {
      num.total = 0;
      num.running = 0;
      num.stopped = 0;
      return;
    }
    params.terms.push(channelTerm);
  } else if (type.value === 'channel' && data.value.id) {
    params.terms.push({
      column: 'channelId',
      termType: 'eq',
      type: 'and',
      value: data.value.id,
    })
  } else if (type.value === 'collector' && data.value.id) {
    params.terms.push({
      column: 'collectorId',
      termType: 'eq',
      type: 'and',
      value: data.value.id,
    })
  }
  await handleSearch(params)
}

watch(() => [type.value, data.value.id, filterValue.channel, filterValue.collector, filterValue.point, filterValue.provider, filterValue.runningState, filterValue.state, filterValue.collectorState], () => {
  loadData()
}, {
  immediate: true,
  deep: true
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
