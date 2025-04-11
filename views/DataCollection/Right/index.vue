<template>
  <div class="collection-right">
    <Top />
    <div class="content">
      <div class="more-btn">
        <a-button @click="visible = !visible" type="link">
          {{ !visible ? $t('DataCollection.Right.index.476751-1') : $t('DataCollection.Right.index.476751-2')}}{{$t('DataCollection.Right.index.476751-0')}}
        </a-button>
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
import {useI18n} from "vue-i18n";

const visible = ref(false)
const {t: $t} = useI18n();
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
  border-bottom: 1px solid #f0f0f0;
  margin-bottom: 12px;
}
</style>
