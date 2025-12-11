<template>
  <j-page-container>
    <FullPage>
      <div class="collect-warp">
        <!--        <Left @change="onChange"/>-->
        <Tree @change="onChange"/>
        <div class="right">
          <Right/>
        </div>
      </div>
    </FullPage>
  </j-page-container>
</template>

<script setup>
// import Left from './Left.vue'
import Right from './Right.vue'
import Tree from '../DataCollect/Collector/Tree/index.vue'
import {COLLECTOR_DATA, COLLECTOR_TYPE} from "./data";

const current = ref({})
const type = ref('all')

provide(COLLECTOR_TYPE, type) // all/channel/collector
provide(COLLECTOR_DATA, current)

const onChange = (row) => {
  if(row.id === '*'){
    type.value = 'all'
    current.value = {}
  } else {
    type.value = 'collector'
    current.value = row
  }
}
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
