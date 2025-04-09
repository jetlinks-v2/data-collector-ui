<template>
  <div class="collection-right">
    <Top />
    <div class="content">
      <div class="more-btn">
        <a-button @click="visible = !visible" type="link">{{ !visible ? '展开' : '收起' }}数据图表</a-button>
      </div>
      <div v-if="visible">
        <Card />
      </div>
      <Point />
    </div>
  </div>
</template>

<script setup>
import Top from './Top/index.vue'
import Point from './Point/index.vue'
import Card from "./Card.vue";

const visible = ref(false)
</script>

<style lang="less" scoped>
.collection-right {
  height: 100%;
  flex: 1;
  min-width: 0;
  padding: 24px 24px 24px 0;
  display: flex;
  flex-direction: column;
}

.content {
  overflow-y: auto;
  flex: 1;
}

.more-btn {
  display: flex;
  justify-content: center;
}
</style>
