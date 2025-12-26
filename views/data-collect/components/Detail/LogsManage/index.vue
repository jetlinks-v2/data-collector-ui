<template>
  <div class="logs">
    <div class="logs-header">
      <a-space>
        <a-select style="width: 100px" :options="options"/>
        <a-input placeholder="请输入搜索"/>
        <a-tooltip title="滚动至底部">
          <AIcon type="MenuFoldOutlined"/>
        </a-tooltip>
      </a-space>
      <a-space>
        <a-button danger>
          <AIcon type="ReloadOutlined"/>
          重置
        </a-button>
        <a-button type="primary">
          <AIcon type="StopOutlined"/>
          暂停
        </a-button>
      </a-space>
    </div>
    <div class="logs-content">
<!--      todo: 历史数据列表-->
    </div>
  </div>
</template>

<script setup>
const options = [
  {
    label: '全部',
    value: 'all'
  },
  {
    label: 'ERROR',
    value: 'ERROR'
  },
  {
    label: 'INFO',
    value: 'INFO'
  },
  {
    label: 'DEBUG',
    value: 'DEBUG'
  },
  {
    label: 'WARN',
    value: 'WARN'
  },
]
</script>

<style lang="less" scoped>
.logs {
  &-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }

  &-content {
    background-color: #000000;
    min-height: 200px;
  }
}
</style>
