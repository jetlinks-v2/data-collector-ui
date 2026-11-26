<template>
  <div class="cw-object-identity" :class="`cw-object-identity-${surface}`">
    <span class="cw-object-icon" data-object-icon><slot name="icon"><WorkspaceIcon :object="object" :size="size" /></slot></span>
    <span class="cw-object-title"><slot name="name"><strong :title="object.name">{{ object.name }}</strong></slot></span>
    <slot name="status"><WorkspaceStatus v-if="object.runtime || stateValue(object.state) === 'disabled'" :object="object" /><a-skeleton-input v-else active size="small" class="cw-metric-skeleton" :aria-label="$t('collectorWorkspace.loading')" /></slot>
    <slot />
  </div>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import type { CollectorObject } from '../../../../types/workspace'
import { stateValue } from '../../../../types/workspace'
import WorkspaceIcon from './WorkspaceIcon.vue'
import WorkspaceStatus from './WorkspaceStatus.vue'
const props = withDefaults(defineProps<{ object: CollectorObject; surface?: 'card' | 'header' | 'channel' }>(), { surface: 'card' })
const size = computed(() => props.surface === 'channel' ? 16 : props.surface === 'header' ? 25 : 24)
</script>
