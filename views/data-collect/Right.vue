<template>
  <div class="right-warp">
    <Header ref="pointHeader"/>
    <PointTop ref="pointTopRef"/>
    <PointTable ref="pointTableRef"/>
  </div>
</template>

<script setup>
import Header from './components/Header.vue'
import PointTop from "./components/Point/PointTop.vue";
import PointTable from "./components/Point/PointTable.vue";

// 用于点位列表右边的点位统计的搜索
const pointType = ref('total')
provide('point-type', pointType)

const pointHeader = ref()
const pointTopRef = ref()
const pointTableRef = ref()


// 统一的刷新方法
const refresh = async () => {
  await pointHeader.value?.loadData?.()
  // 刷新点位统计
  await pointTopRef.value?.loadData?.()
  // 刷新点位表格
  await pointTableRef.value?.loadData?.()
}

// 暴露刷新方法
defineExpose({
  refresh
})
</script>

<style lang="less" scoped>
.right-warp {
  display: flex;
  height: 100%;
  flex-direction: column;
  gap: 16px;
}
</style>
