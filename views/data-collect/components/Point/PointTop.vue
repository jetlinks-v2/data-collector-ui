<template>
  <div class="point-top-warp">
    <div class="title">点位列表</div>
    <div class="status-warp">
      <div class="status-warp-item">
        <div>
          <span style="color: #1677FF;"><AIcon type="EnvironmentFilled"/></span>
          全部点位
        </div>
        <div class="status-warp-item-value" :class="{'active': pointType === 'total'}"
             @click="onClick('total')">{{ num.total }}
        </div>
      </div>
      <a-divider type="vertical"/>
      <div class="status-warp-item">
        <a-badge status="success" text="运行中"/>
        <div class="status-warp-item-value" :class="{'active': pointType === 'running'}"
             @click="onClick('running')">{{ num.running }}
        </div>
      </div>
      <a-divider type="vertical"/>
      <div class="status-warp-item">
        <a-badge status="error" text="已停止"/>
        <div class="status-warp-item-value" :class="{'active': pointType === 'stopped'}"
             @click="onClick('stopped')">{{ num.stopped }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import {COLLECTOR_DATA, COLLECTOR_TYPE} from "@data-collector-ui/views/data-collect/data";
import {queryPointCount} from "@data-collector-ui/api/data-collect/collector";
import {getCountList} from "@data-collector-ui/views/data-collect/utils";

const type = inject(COLLECTOR_TYPE, ref('all'))
const data = inject(COLLECTOR_DATA, ref({}))
const pointType = inject('point-type', ref('total'))

const _filterValue = inject('filter-value', reactive({
  channel: false,
  collector: false,
  point: false
}))

const num = reactive({
  total: 0,
  running: 0,
  stopped: 0,
})

//
const handleSearch = async (params, key) => {
  const resp = await queryPointCount(params);
  if (resp.success) {
    num[key] = resp.result || 0;
  }
}

const onClick = (item) => {
  // if (item === pointType.value) {
  //   pointType.value = undefined
  // } else {
  pointType.value = item
  // }
}

const onSearch = (params) => {
  handleSearch(params, 'total')
  handleSearch({
    ...params,
    terms: [
      ...(params.terms || []),
      {
        column: 'runningState',
        termType: 'eq',
        type: 'and',
        value: 'running'
      }
    ]
  }, 'running')
  handleSearch({
    ...params,
    terms: [
      ...(params.terms || []),
      {
        column: 'runningState',
        termType: 'not',
        type: 'and',
        value: 'running'
      }
    ]
  }, 'stopped')
}

watch(() => [type.value, data.value.id], () => {
  const terms = []
  if (type.value === 'all') {
    // _filterValue
    // todo: 根据当前选择的采集器类型, 生成查询参数
  } else {
    terms.push({
      column: type.value === 'channel' ? 'channelId' : 'collectorId',
      type: 'and',
      termType: 'in',
      value: [data.value.id]
    })
  }
  onSearch({terms})
}, {
  immediate: true
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
