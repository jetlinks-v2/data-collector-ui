<template>
  <div class="point">
    <div class="point-top">
      <div class="title">点位列表</div>
      <div class="extra">
        <div class="extra-item">
          <span><AIcon type="BranchesOutlined" style="margin-right: 10px"/>全部点位</span>
          <a @click="onClick('total')">{{ count.total }}</a>
        </div>
        <div class="extra-item">
          <a-badge status="success" text="运行中"/>
          <a @click="onClick('running')">{{ count.running }}</a></div>
        <div class="extra-item">
          <a-badge status="error" text="已停止"/>
          <a @click="onClick('stopped')">{{ count.stopped }}</a></div>
      </div>
    </div>
    <div class="point-box">
      <Point />
    </div>
  </div>
</template>

<script setup>
import Point from './Point.vue'
import {queryPointCount} from "@collector/api/data-collect/collector";

const props = defineProps({
  data: {
    type: Object,
    default: () => ({})
  }
})
const count = reactive({
  total: 0,
  running: 0,
  stopped: 0
})
const queryCount = async (data, type) => {
  const resp = await queryPointCount(data)
  if (resp.success) {
    count[type] = resp.result || 0
  }
}

const handleSearch = () => {
  queryCount({}, 'total')
  queryCount({
    terms: [
      {
        column: "runningState",
        termType: "eq",
        value: "running"
      }
    ]
  }, 'running')
  queryCount({
    terms: [
      {
        column: "runningState",
        termType: "not",
        value: "running"
      }
    ]
  }, 'stopped')
}

handleSearch()

const onClick = (type) => {
  // todo 处理参数，回填url值
  console.log(type, 'type')
}
</script>

<style lang="less" scoped>
.flex-box {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.point {
  display: flex;
  flex-direction: column;
  height: calc(100% - 34px);
  min-height: 600px;

  .point-top {
    display: flex;
    justify-content: space-between;
    margin-bottom: 16px;

    .title {
      font-weight: bold;
    }

    .extra {
      display: flex;
      gap: 24px;
      background-color: rgba(246, 246, 246, .5);
      padding: 8px 16px;
      border-radius: 8px;

      .extra-item {
        display: flex;
        gap: 16px;
      }
    }
  }

  .point-box {
    .flex-box();
  }
}
</style>
