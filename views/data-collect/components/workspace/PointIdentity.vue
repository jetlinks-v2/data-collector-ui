<template>
  <WorkspaceIcon :object="point" kind="point" :size="16" />
  <span class="cw-point-name">
    <strong :title="point.name">{{ point.name || $t('collectorWorkspace.newPoint') }}</strong>
    <small class="cw-point-identifiers">
      <span v-if="point.pointKey" :title="point.pointKey">{{ point.pointKey }}</span>
      <span v-if="point.address != null && point.address !== ''" :title="pointAddress(point)"><AIcon type="EnvironmentOutlined" />{{ pointAddress(point) }}</span>
    </small>
  </span>
</template>
<script setup lang="ts">
import type { PointRow } from '../../../../types/workspace'
import { pointAddress } from '../../../../types/workspace'
import WorkspaceIcon from './WorkspaceIcon.vue'
defineProps<{ point: PointRow }>()
</script>
