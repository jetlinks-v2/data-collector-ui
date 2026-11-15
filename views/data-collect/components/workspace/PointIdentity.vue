<template>
  <WorkspaceIcon :object="point" kind="point" :size="16" />
  <span class="cw-point-name">
    <span class="cw-point-title"><strong :title="point.name">{{ point.name || $t('collectorWorkspace.newPoint') }}</strong><a-tooltip v-if="point.description?.trim()" :title="point.description"><small class="cw-point-note"><AIcon type="FileTextOutlined" />{{ point.description }}</small></a-tooltip></span>
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
