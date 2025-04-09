<template>
  <j-page-container>
    <FullPage>
      <div class="collection">
        <LeftTree @change="treeChange"></LeftTree>
        <Right />
      </div>
    </FullPage>
  </j-page-container>
</template>

<script setup>
import LeftTree from './LeftTree/index.vue';
import Right from './Right/index.vue'

const data = ref({});
const nodeType = ref('');
const treeChange = (type, node) => {
  data.value = node;
  nodeType.value = type;
}

provide('collector-data', data)
provide('collector-type', nodeType)
</script>

<style scoped lang="less">
.collection {
  display: flex;
  gap: 16px;
  height: 100%;
}
</style>

