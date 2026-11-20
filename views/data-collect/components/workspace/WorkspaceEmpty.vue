<template>
  <a-empty class="cw-empty" :image="Empty.PRESENTED_IMAGE_SIMPLE" :description="false">
    <strong>{{ $t(filtered ? 'collectorWorkspace.empty.filtered' : `collectorWorkspace.${kind === 'point' ? 'noPoints' : 'noCollectors'}`) }}</strong>
    <p>{{ $t(`collectorWorkspace.empty.${filtered ? 'filterHint' : kind}`) }}</p>
    <div class="cw-empty-actions"><slot /></div>
  </a-empty>
</template>
<script setup lang="ts">
import { Empty } from 'ant-design-vue'
defineProps<{ kind:'point'|'collector'; filtered?:boolean }>()
</script>
