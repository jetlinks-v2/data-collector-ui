<template>
  <div class="right-header-warp">
    <div>
      <h2>全部点位</h2>

    </div>
    <div class="header-right">
      <div class="header-right-item">
        <span class="header-right-item-label">异常通道</span>
        <span class="header-right-item-value">
          <span class="error">12</span>/64
        </span>
      </div>
      <div class="header-right-item">
        <span class="header-right-item-label">异常采集器</span>
        <span class="header-right-item-value">
          <span class="error">12</span>/64
        </span>
      </div>
      <div class="header-right-item">
        <span class="header-right-item-label">异常点位</span>
        <span class="header-right-item-value">
          <span class="error">12</span>/64
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>

</script>

<style lang="less" scoped>
.right-header-warp {
  display: flex;
  gap: 16px;
  align-items: center;

  .header-right {
    display: flex;
    gap: 16px;
    align-items: center;
  }
}
</style>
