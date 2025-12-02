<template>
  <j-page-container>
    <FullPage>
      <div class="collect-warp">
        <Left />
        <div class="right">
          <Right />
        </div>
      </div>
    </FullPage>
  </j-page-container>
</template>

<script setup>
import Left from './Left.vue'
import Right from './Right.vue'
</script>

<style lang="less" scoped>
.collect-warp {
  display: flex;
  height: 100%;
  padding: 24px;
  gap: 16px;
}
.right {
  flex: 1;
  min-width: 0;
  height: 100%;
}
</style>
