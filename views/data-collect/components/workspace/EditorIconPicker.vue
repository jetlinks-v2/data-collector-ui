<template>
  <a-popover v-model:open="open" trigger="click" placement="bottomLeft" overlay-class-name="cw-workspace-popover" :overlay-style="{pointerEvents:open ? 'auto' : 'none'}">
    <template #content><div @keydown.esc.stop="close"><IconValueEditor :model-value="value" @update:model-value="$emit('update:value', $event)" /></div></template>
    <span ref="trigger" class="cw-icon-picker-trigger"><slot /></span>
  </a-popover>
</template>
<script setup lang="ts">
import { IconValueEditor } from '@jetlinks-web-core/components/IconValue'
import { useEditorPopover } from '../../hook/useEditorDismiss'
defineProps<{value?:string | null}>()
defineEmits<{'update:value':[value:string]}>()
const {open,trigger,close}=useEditorPopover()
</script>
<style scoped>
.cw-icon-picker-trigger { display:inline-flex; align-items:center; justify-content:center; width:100%; height:100%; }
</style>
