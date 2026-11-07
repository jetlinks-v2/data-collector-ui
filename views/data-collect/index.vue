<template>
  <FullPage class="collect-workspace" transparent-background>
    <EqualHeightColumns :left-width="state.viewType === 'compact' ? '16rem' : '30rem'" right-width="1fr" gap="var(--space-6)">
      <template #left><Left ref="leftRef" @change="onChange" /></template>
      <template #right><Right v-if="ready" ref="rightRef" /></template>
    </EqualHeightColumns>
  </FullPage>
</template>

<script setup lang="ts">
import { onActivated, provide, ref, toRef } from 'vue'
import EqualHeightColumns from '@jetlinks-web-core/components/EqualHeightColumns/index.vue'
import Left from './Left/index.vue'
import Right from './Right.vue'
import { COLLECTOR_DATA, COLLECTOR_TYPE, REFRESH_HANDLER } from './data'
import { COLLECT_LIST, type CollectRecord, type ScopeType } from './hook/context'
import { useCollectRouteState } from './hook/useCollectRouteState'

const state = useCollectRouteState()
const current = ref<CollectRecord>({})
const ready = ref(false)
const leftRef = ref<InstanceType<typeof Left>>()
const rightRef = ref<InstanceType<typeof Right>>()
const refreshAll = async () => {
  await leftRef.value?.loadAllData()
  await rightRef.value?.refresh()
}
let activated = false
onActivated(() => {
  if (activated) void refreshAll()
  activated = true
})
provide(COLLECT_LIST, { state, current, ready, refreshAll })
provide(COLLECTOR_TYPE, toRef(state, 'scopeType'))
provide(COLLECTOR_DATA, current)
provide('filter-value', state.filters)
provide(REFRESH_HANDLER, {
  refreshAll,
  refreshLeft: () => leftRef.value?.loadAllData(),
  refreshRight: () => rightRef.value?.refresh(),
})
function onChange(type: ScopeType, row: CollectRecord) {
  state.scopeType = type
  state.scopeId = type === 'all' ? '' : row.id || ''
  current.value = type === 'all' ? {} : row
  ready.value = true
}
</script>

<style scoped>
.collect-workspace { min-height: 0; min-width: 0; height: 100%; }
</style>
