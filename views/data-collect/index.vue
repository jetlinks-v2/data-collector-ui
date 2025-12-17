<template>
  <j-page-container>
    <FullPage>
      <div class="collect-warp">
        <Left @change="onChange"/>
        <div class="right">
          <Right/>
        </div>
      </div>
    </FullPage>
  </j-page-container>
</template>

<script setup>
import Left from './Left/index.vue'
import Right from './Right.vue'
import {COLLECTOR_DATA, COLLECTOR_TYPE} from "@data-collector-ui/views/data-collect/data";

const current = ref({})
const type = ref('all')

provide(COLLECTOR_TYPE, type) // all/channel/collector
provide(COLLECTOR_DATA, current)

const onChange = (_type, row) => {
  type.value = _type || 'all'
  current.value = _type === 'all' ? {} : row
  console.log(_type, row)
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
