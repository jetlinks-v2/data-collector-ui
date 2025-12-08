<template>
  <div class="point-top-warp">
    <div class="title">点位列表</div>
    <div class="status-warp">
      <div class="status-warp-item">
        <div>
          <AIcon type="DeploymentUnitOutlined"/>
          全部点位
        </div>
        <div class="status-warp-item-value">1284</div>
      </div>
      <div class="status-warp-item">
        <a-badge status="success" text="运行中"/>
        <div class="status-warp-item-value">1284</div>
      </div>
      <div class="status-warp-item">
        <a-badge status="error" text="已停止"/>
        <div class="status-warp-item-value">1284</div>
      </div>
    </div>
  </div>
</template>

<script setup>

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
