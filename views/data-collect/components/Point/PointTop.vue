<template>
  <div class="point-top-warp">
    <div class="title">点位列表</div>
    <div class="status-warp">
      <div class="status-warp-item">
        <div>
          <span style="color: #1677FF;"><AIcon type="EnvironmentFilled"/></span>
          全部点位
        </div>
        <div class="status-warp-item-value" :class="{'active': searchParams.point === 'total'}"
             @click="onClick('total')">{{ num.total }}
        </div>
      </div>
      <a-divider type="vertical"/>
      <div class="status-warp-item">
        <a-badge status="success" text="运行中"/>
        <div class="status-warp-item-value" :class="{'active': searchParams.point === 'running'}"
             @click="onClick('running')">{{ num.running }}
        </div>
      </div>
      <a-divider type="vertical"/>
      <div class="status-warp-item">
        <a-badge status="error" text="已停止"/>
        <div class="status-warp-item-value" :class="{'active': searchParams.point === 'stopped'}"
             @click="onClick('stopped')">{{ num.stopped }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import {COLLECTOR_DATA, COLLECTOR_TYPE} from "@data-collector-ui/views/data-collect/data";
import {queryPointCount} from "@data-collector-ui/api/data-collect/collector";

const type = inject(COLLECTOR_TYPE, ref('all'))
const current = inject(COLLECTOR_DATA, ref({}))
const searchParams = inject('search-params', reactive({}))

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
  if (item === searchParams.point) {
    searchParams.point = undefined
  } else {
    searchParams.point = item
  }
}

// todo: searchParams.top 会影响查询参数
handleSearch({}, 'total')
handleSearch({
  terms: [
    {
      column: 'runningState',
      termType: 'eq',
      value: 'running'
    }
  ]
}, 'running')
handleSearch({
  terms: [
    {
      column: 'runningState',
      termType: 'not',
      value: 'running'
    }
  ]
}, 'stopped')
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
