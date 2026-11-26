<template>
  <Teleport to="body">
    <div ref="target" class="collection-workspace cw-object-editor-overlay cw-point-card-editor" :class="{ 'cw-object-editor-channel': surface === 'channel', 'cw-point-card-motion-enter': visible, 'cw-point-card-motion-leave': !open }" :style="position" :inert="!visible" :aria-hidden="!visible" role="dialog" :aria-label="$t(kind === 'channel' ? 'collectorWorkspace.connection' : 'collectorWorkspace.collectorSettings')"><slot /></div>
  </Teleport>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import { useEditorOverlay } from '../../hook/useEditorOverlay'
import { useEditorDismiss } from '../../hook/useEditorDismiss'
const props = defineProps<{ open: boolean; ready: boolean; kind: 'channel' | 'collector'; identity: string; anchor?: HTMLElement; trigger?: HTMLElement; viewport?: HTMLElement; surface: 'card' | 'header' | 'channel' }>()
const emit = defineEmits<{ close: [restoreFocus: boolean] }>()
const key = computed(() => props.open ? `${props.identity}:${props.surface}` : undefined), width = computed(() => props.surface === 'card' ? props.anchor?.offsetWidth || 400 : 660)
const { open: visible, position, target } = useEditorOverlay({
  key, width, onSource: computed(() => true), ready: computed(() => props.open && props.ready),
  anchor: () => props.anchor, viewport: () => props.viewport,
  panelWidth: rect => props.surface === 'card' ? rect.width : Math.min(660, props.viewport?.clientWidth || 660),
  alignment: { source: () => props.anchor?.querySelector('[data-object-icon]'), panel: () => target.value?.querySelector('[data-object-icon]') },
  sourceStyle: source => {
    const title = source.querySelector('.cw-object-title')
    return title ? { '--cw-object-name-width': `${title.getBoundingClientRect().width || 120}px` } : {}
  },
  focus: () => target.value?.querySelector<HTMLElement>('.cw-object-collapse:not(:disabled)'),
})
useEditorDismiss({ active: computed(() => props.open), panel: target, anchor: () => props.anchor, trigger: () => props.trigger, dismiss: restoreFocus => emit('close', restoreFocus) })
</script>
