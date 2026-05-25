<template>
  <j-page-container>
    <full-page>
      <div class="collect-warp">
        <div class="left" v-show="!foldTree">
          <Left @change="onChange" ref="leftRef"/>
        </div>
        <div class="right">
          <Right ref="rightRef"/>
        </div>
      </div>
    </full-page>
  </j-page-container>
</template>

<script setup>
import Left from './Left/index.vue'
import Right from './Right.vue'
import {COLLECTOR_DATA, COLLECTOR_TYPE, FOLD_TREE, REFRESH_HANDLER} from "@data-collector-ui/views/data-collect/data";

const leftRef = ref()
const rightRef = ref()
const current = ref({})
const type = ref('all')
const filterValue = reactive(
    {
      channel: false,
      collector: false,
      point: false,
      provider: [],
      runningState: [],
      state: [],
      collectorState: []
    }
)
const foldTree = ref(false)

provide(FOLD_TREE, foldTree)
provide('filter-value', filterValue)
provide(COLLECTOR_TYPE, type) // all/channel/collector
provide(COLLECTOR_DATA, current)

// 🔥 核心：提供统一的刷新方法
const refreshHandler = {
  // 刷新所有
  refreshAll: async () => {
    await leftRef.value?.loadAllData?.()
    await rightRef.value?.refresh?.()
  },

  // 只刷新左侧
  refreshLeft: async () => {
    await leftRef.value?.loadAllData?.()
  },

  // 只刷新右侧
  refreshRight: async () => {
    await rightRef.value?.refresh?.()
  },
}

// 通过 provide 向下传递刷新方法
provide(REFRESH_HANDLER, refreshHandler)


const onChange = (_type, row) => {
  type.value = _type || 'all'
  current.value = _type === 'all' ? {} : row
}
</script>

<style lang="less" scoped>
.collect-warp {
  display: flex;
  height: 100%;
  background-color: #f5f5f5;
  gap: 24px;
}

.left, .right {
  height: 100%;
  background-color: #ffffff;
}

.right {
  flex: 1;
  min-width: 0;
  padding: 24px;
}
</style>
