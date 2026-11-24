<template>
  <div class="cw-workspace-skeleton" :class="kind === 'collectors' ? 'cw-fleet' : kind === 'points' ? 'cw-point-grid' : `cw-skeleton-${kind}`" role="status" aria-busy="true" :aria-label="$t('collectorWorkspace.loading')">
    <div v-for="item in kind === 'navigation' ? 3 : 6" :key="item" class="cw-skeleton-card" aria-hidden="true">
      <div class="cw-row"><a-skeleton-avatar active shape="square" :size="kind === 'navigation' ? 18 : 24" /><a-skeleton-input active size="small" /></div>
      <a-skeleton active :title="false" :paragraph="{ rows: kind === 'navigation' ? 1 : 2, width: kind === 'navigation' ? '65%' : ['90%', '60%'] }" />
    </div>
  </div>
</template>
<script setup lang="ts">
defineProps<{ kind: 'navigation' | 'collectors' | 'points' | 'table' }>()
</script>
