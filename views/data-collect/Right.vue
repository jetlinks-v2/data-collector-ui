<template>
  <section class="collect-main">
    <Header ref="headerRef" />
    <PointTable ref="tableRef" />
  </section>
</template>
<script setup lang="ts">
import { provide, reactive, ref, toRef, watch } from 'vue'
import Header from './components/Header.vue'
import PointTable from './components/Point/PointTable.vue'
import { useCollectContext } from './hook/context'
const { state } = useCollectContext()
const visible = reactive({ point: false, channel: false, collector: false })
provide('point-type', toRef(state, 'pointType'))
provide('detail-visible', visible)
const headerRef = ref<InstanceType<typeof Header>>()
const tableRef = ref<InstanceType<typeof PointTable>>()
watch(() => [state.scopeType, state.scopeId], () => {
  visible.channel = false
  visible.collector = false
})
const refresh = async () => { await Promise.all([headerRef.value?.loadData(), tableRef.value?.loadData()]) }
defineExpose({ refresh })
</script>
<style scoped>
.collect-main { display: flex; flex-direction: column; gap: var(--space-4); height: 100%; min-height: 0; min-width: 0; }
</style>
