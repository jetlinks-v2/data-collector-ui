<template>
  <j-page-container>
    <FullPage>
      <div class="container">
        <div class="left">
          <Tree @change="changeTree"/>
        </div>
        <div class="right">
          <a-spin :spinning="spinning">
            <Point v-if="data" :data="data"/>
            <div v-else style="margin-top: 150px">
              <j-empty />
            </div>
          </a-spin>
        </div>
      </div>
    </FullPage>
  </j-page-container>
</template>

<script setup lang="ts" name="CollectorPage">
import Tree from './Tree/index.vue';
import Point from './Point/index.vue';

const data = ref();
const spinning = ref(false);

const changeTree = (row: any) => {
  spinning.value = true;
  //手动延迟，防止数据库更新不及时
  setTimeout(() => {
    data.value = {
      ...row,
      collectorId: row?.id,
    };
    spinning.value = false;
  }, 1000);
};

</script>

<style lang="less" scoped>
.container {
  display: flex;
  padding: 24px;
  height: 100%;

  .left {
    width: 370px;
    border-right: 1px #eeeeee solid;
    height: 100%;
  }

  .right {
    flex: 1;
    min-width: 0;
    height: 100%;

    :deep(.ant-spin-nested-loading) {
      height: 100%;

      .ant-spin-container {
        height: 100%;
      }
    }
  }
}
</style>
