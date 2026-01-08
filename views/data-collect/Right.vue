<template>
  <div class="right-warp">
    <Header/>
    <PointTop/>
    <PointTable/>
  </div>
</template>

<script setup>
import Header from './components/Header.vue'
import PointTop from "./components/Point/PointTop.vue";
import PointTable from "./components/Point/PointTable.vue";

// 用于点位列表右边的点位统计的搜索
const pointType = ref('total')
provide('point-type', pointType)

// todo: 需要刷新所有数据的方法
</script>

<style lang="less" scoped>
.right-warp {
  display: flex;
  height: 100%;
  flex-direction: column;
  gap: 16px;
}
</style>
