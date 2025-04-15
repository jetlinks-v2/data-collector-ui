<template>
  <j-page-container>
    <FullPage>
      <div class="collection">
        <LeftTree ref="treeRef" @change="treeChange"></LeftTree>
        <Right @refresh="onRefresh" />
      </div>
    </FullPage>
  </j-page-container>
</template>

<script setup>
import LeftTree from './LeftTree/index.vue';
import Right from './Right/index.vue'
import {omit} from "lodash-es";

const data = ref({});
const nodeType = ref('');
const treeRef = ref(null);
const foldTree = ref(false);
const treeChange = (type, node) => {
  data.value = omit(node, ['dataRef', 'dragOver']);
  nodeType.value = type;
}

provide('fold-tree', foldTree)
provide('collector-data', data)
provide('collector-type', nodeType)

const onRefresh = (id, action) => {
  if(action === 'delete') {
    treeRef.value.deleteNode(id)
  }
  if(nodeType.value === 'collector') {
    treeRef.value.refreshCollector({id})
  } else {
    treeRef.value.refreshChannel({id})
  }
}
</script>

<style scoped lang="less">
.collection {
  display: flex;
  gap: 16px;
  height: 100%;
}
</style>

