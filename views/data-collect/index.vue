<template>
  <j-page-container>
    <full-page>
      <EqualHeightColumns
          :left-width="foldTree ? 0 : viewType === 'compact' ? '15rem' : '30rem'"
          right-width="1fr"
          :gap="foldTree ? 0 : 24"
      >
        <template #left>
          <div class="left" v-show="!foldTree">
            <Left v-model:view-type="viewType" @change="onChange" ref="leftRef"/>
          </div>
        </template>
        <template #right>
          <div class="right">
            <Right ref="rightRef"/>
          </div>
        </template>
      </EqualHeightColumns>
    </full-page>
  </j-page-container>
</template>

<script setup>
import Left from './Left/index.vue'
import Right from './Right.vue'
import EqualHeightColumns from '@jetlinks-web-core/components/EqualHeightColumns/index.vue'
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
const viewType = ref('compact')

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

.left, .right {
  height: 100%;
}

</style>
