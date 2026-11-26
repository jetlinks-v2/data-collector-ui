<template>
  <span ref="container" class="cw-search-control" :class="{ active: value.trim() }" role="group" :aria-label="label">
    <a-input v-if="inline" ref="inlineInput" :value="value" allow-clear size="small" :disabled="disabled" :placeholder="label" :aria-label="label" class="cw-search-inline" @update:value="$emit('update:value', $event)" @press-enter="submitInline"><template #prefix><AIcon type="SearchOutlined" /></template></a-input>
    <span v-else class="cw-search-compact">
    <a-popover v-model:open="open" trigger="click" placement="bottomLeft" overlay-class-name="cw-workspace-popover">
      <button ref="trigger" type="button" class="cw-search-trigger" :disabled="disabled" :aria-label="value.trim() ? `${label}: ${value}` : label" :aria-expanded="open" :title="value || label"><AIcon type="SearchOutlined" /><span class="cw-search-label">{{ value.trim() || label }}</span></button>
      <template #content><a-input ref="input" :value="value" allow-clear :disabled="disabled" :placeholder="label" :aria-label="label" class="cw-search-input" @update:value="$emit('update:value', $event)" @press-enter="submit" @keydown.esc.stop="close"><template #prefix><AIcon type="SearchOutlined" /></template></a-input></template>
    </a-popover>
    <button v-if="value" type="button" class="cw-search-clear" :disabled="disabled" :aria-label="$t('Virtual.Editor.400159-20')" :title="$t('Virtual.Editor.400159-20')" @click="$emit('update:value', ''); $emit('search')"><AIcon type="CloseOutlined" /></button>
    </span>
  </span>
</template>
<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useElementSize } from '@vueuse/core'
defineProps<{ value: string; label: string; disabled?: boolean }>()
const emit = defineEmits<{ 'update:value': [value: string]; search: [] }>()
type SearchInput = { focus: () => void; $el?: HTMLElement }
const open = ref(false), input = ref<SearchInput>(), inlineInput = ref<SearchInput>(), trigger = ref<HTMLButtonElement>(), container = ref<HTMLElement>()
const { width } = useElementSize(container)
const inline = computed(() => width.value >= 180)
watch([open, input], async ([value]) => { if (value) { await nextTick(); if (open.value) input.value?.focus() } })
watch(inline, async () => {
  const focused = container.value?.contains(document.activeElement) || input.value?.$el?.contains(document.activeElement)
  open.value = false
  await nextTick()
  if (focused) (inline.value ? inlineInput.value : trigger.value)?.focus()
})
function close() { open.value = false; trigger.value?.focus() }
function submit(event: KeyboardEvent) { if (!event.isComposing) { emit('search'); close() } }
function submitInline(event: KeyboardEvent) { if (!event.isComposing) emit('search') }
</script>
<style scoped>
.cw-search-control { display:flex; align-items:center; flex:1 1 240px; min-width:28px; max-width:240px; border-radius:4px; color:var(--cw-sub); container:cw-search / inline-size; }
.cw-search-compact { display:flex; align-items:center; min-width:0; width:100%; }
.cw-search-inline { width:100%; height:28px; padding-block:2px; font-size:12px; }
.cw-search-control.active { min-width:52px; color:var(--cw-blue); background:var(--cw-soft); }
.cw-search-trigger,.cw-search-clear { display:inline-flex; align-items:center; justify-content:center; gap:6px; height:28px; padding:0 6px; border:0; border-radius:4px; color:inherit; background:transparent; font-size:12px; }
.cw-search-trigger { min-width:0; max-width:100%; }
.cw-search-trigger:hover,.cw-search-clear:hover { background:var(--cw-soft); }
.cw-search-label { max-width:120px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.cw-search-clear { width:24px; padding:0; flex:none; }
.cw-search-input { width:min(280px,calc(100vw - 48px)); }
@container cw-search (max-width:90px) { .cw-search-control:not(.active) .cw-search-label { display:none; } }
@media(pointer:coarse) { .cw-search-trigger,.cw-search-clear,.cw-search-inline { min-width:44px; min-height:44px; } }
</style>
