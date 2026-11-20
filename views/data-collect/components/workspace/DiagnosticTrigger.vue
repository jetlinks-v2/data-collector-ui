<template>
  <a-popover :open="open" :trigger="['hover', 'focus']" :placement="side === 'top' ? 'topRight' : 'bottomRight'" transition-name="" :auto-adjust-overflow="false" :arrow="true" :overlay-style="position" overlay-class-name="cw-workspace-popover cw-diagnostic-overlay" @open-change="onVisibility">
    <template #content><div ref="panel" class="cw-diagnostic-scroll"><slot /></div></template>
    <button ref="trigger" type="button" class="cw-icon-button cw-diagnostic-trigger" :class="triggerClass" :aria-label="label" :title="label" :aria-expanded="open" @click.stop="toggle"><AIcon type="FileSearchOutlined" /></button>
  </a-popover>
</template>
<script setup lang="ts">
import { toRef } from 'vue'
import { useHoverPanel } from '../../hook/useHoverPanel'
const props = defineProps<{ open: boolean; label: string; triggerClass?: string }>()
const emit = defineEmits<{ visibility: [visible: boolean] }>()
const { trigger, panel, position, side, onVisibility, toggle } = useHoverPanel(toRef(props, 'open'), visible => emit('visibility', visible))
</script>
