<template>
  <div class="right-warp">
    <Header />
    <PointTop />
    <PointTable />
  </div>
</template>

<script setup>
import Header from './components/Header.vue'
import PointTop from "./components/Point/PointTop.vue";
import PointTable from "./components/Point/PointTable.vue";

</script>

<style lang="less" scoped>
.right-warp {
  display: flex;
  height: 100%;
  flex-direction: column;
  gap: 16px;
}
</style>
