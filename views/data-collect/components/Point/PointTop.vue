<template>
  <a-button-group class="point-status-filter" role="group">
    <a-button v-for="item in options" :key="item.key" :type="state.pointType === item.key ? 'primary' : 'default'"
      @click="state.pointType = item.key; state.page = 1">
      <a-badge v-if="item.key !== 'total'" :status="item.key === 'running' ? 'success' : 'default'" />
      {{ item.label }} {{ counts[item.key] ?? '—' }}
    </a-button>
  </a-button-group>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { usePointCounts } from './usePointCounts'
const { t: $t } = useI18n()
const { counts, state, loadData } = usePointCounts()
const options = computed(() => [
  { key: 'total' as const, label: $t('PointWorkspace.all') },
  { key: 'running' as const, label: $t('DataCollect.index.400150-8') },
  { key: 'stopped' as const, label: $t('DataCollect.index.400150-9') },
])
defineExpose({ loadData })
</script>
<style scoped>
.point-status-filter { flex: none; white-space: nowrap; }
</style>
