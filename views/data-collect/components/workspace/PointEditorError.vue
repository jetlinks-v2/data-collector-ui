<template>
  <section class="cw-editor" :aria-label="$t('collectorWorkspace.pointEditor')">
    <div class="cw-editor-heading">
      <div class="cw-point-select cw-point-identity"><PointIdentity :point="point" /><button type="button" class="cw-icon-button cw-editor-collapse" :aria-label="$t('collectorWorkspace.collapse')" :title="$t('collectorWorkspace.collapse')" :aria-expanded="true" @click="$emit('close')"><AIcon type="DownOutlined" /></button></div>
      <span class="cw-point-status"><WorkspaceStatus :object="point" /></span>
    </div>
    <a-alert :message="error" type="error" show-icon><template #action><a-button size="small" @click="$emit('retry')">{{ $t('collectorWorkspace.retry') }}</a-button></template></a-alert>
  </section>
</template>
<script setup lang="ts">
import type { PointRow } from '../../../../types/workspace'
import PointIdentity from './PointIdentity.vue'
import WorkspaceStatus from './WorkspaceStatus.vue'
defineProps<{ point:PointRow; error:string }>()
defineEmits<{ close:[]; retry:[] }>()
</script>
