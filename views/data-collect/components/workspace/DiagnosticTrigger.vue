<template>
  <a-popover :open="open" :trigger="['hover', 'focus']" placement="bottomRight" overlay-class-name="cw-diagnostic-overlay" @open-change="onVisibility">
    <template #content><slot /></template>
    <button class="cw-icon-button cw-diagnostic-trigger" :class="triggerClass" :aria-label="label" :aria-expanded="open" @click.stop="toggle" @keydown.esc.stop="close"><WorkspaceIcon name="diagnostic" :size="16" /></button>
  </a-popover>
</template>
<script setup lang="ts">
import { ref, watch } from 'vue'
import WorkspaceIcon from './WorkspaceIcon.vue'
const props = defineProps<{ open: boolean; label: string; triggerClass?: string }>()
const emit = defineEmits<{ visibility: [visible: boolean] }>()
const pinned = ref(false)
function onVisibility(visible: boolean) { if (!pinned.value) emit('visibility', visible) }
function toggle() { pinned.value = !pinned.value; emit('visibility', pinned.value) }
function close() { pinned.value = false; emit('visibility', false) }
watch(() => props.open, value => { if (!value) pinned.value = false })
</script>
