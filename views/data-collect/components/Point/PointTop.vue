<template>
  <div class="point-top-warp">
    <div class="title">点位列表</div>
    <div class="status-warp">
      <div class="status-warp-item">
        <div>
          <AIcon type="DeploymentUnitOutlined"/>
          全部点位
        </div>
        <div class="status-warp-item-value">{{ num.total }}</div>
      </div>
      <div class="status-warp-item">
        <a-badge status="success" text="运行中"/>
        <div class="status-warp-item-value">{{ num.running }}</div>
      </div>
      <div class="status-warp-item">
        <a-badge status="error" text="已停止"/>
        <div class="status-warp-item-value">{{ num.stopped }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import {COLLECTOR_DATA, COLLECTOR_TYPE} from "@data-collector-ui/views/data-collect/data";
import {queryPointCount} from "@data-collector-ui/api/data-collect/collector";

const type = inject(COLLECTOR_TYPE, ref('all'))
const current = inject(COLLECTOR_DATA, ref({}))

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

// todo: 根据当前选择的采集器类型, 生成查询参数
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
    font-weight: bold;
  }

  .status-warp {
    display: flex;
    align-items: center;
    gap: 24px;
    background-color: rgba(0, 0, 0, .08);
    padding: 8px 16px;
    border-radius: 6px;

    &-item {
      display: flex;
      align-items: center;
      gap: 16px;

      &-value {
        cursor: pointer;
      }
    }
  }
}
</style>
