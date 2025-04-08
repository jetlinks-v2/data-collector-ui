<template>
  <j-page-container>
    <FullPage>
      <LeftTree @change="treeChange"></LeftTree>
    </FullPage>
  </j-page-container>
</template>

<script setup>
import LeftTree from './LeftTree/index.vue';

const data = ref({});
const nodeType = ref('');
const treeChange = (type, node) => {
  data.value = node;
  nodeType.value = type;
}
</script>

<style scoped lang="less">

</style>