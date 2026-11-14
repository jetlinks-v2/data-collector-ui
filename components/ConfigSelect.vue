<template>
  <a-select v-bind="$attrs" :options="displayOptions" :field-names="undefined" :list-item-height="48" :list-height="288" option-label-prop="display" option-filter-prop="label" popup-class-name="collector-config-options">
    <template #option="option">
      <span class="collector-config-option">
        <AIcon :type="option.icon || 'UnorderedListOutlined'" class="collector-config-option-icon" />
        <span class="collector-config-option-copy"><span>{{ option.label }}</span><small v-if="option.description" :title="option.description">{{ option.description }}</small></span>
      </span>
    </template>
  </a-select>
</template>
<script setup lang="ts">
import { computed, h, resolveComponent } from 'vue'
import { useI18n } from 'vue-i18n'
import { codecOption, byteOrderOption, accessOption, sortCodecOptions } from '../utils/configOptions'
defineOptions({ inheritAttrs: false })
const props = defineProps<{
  options: Array<{ value?: string | number; label?: string; icon?: string; description?: string; [key: string]: unknown }>
  fieldNames?: { label?: string; value?: string }
  kind?: 'codec' | 'byteOrder' | 'access'
}>()
const Icon = resolveComponent('AIcon')
const { t } = useI18n()
// Keep the searchable label textual; selected values omit the menu-only explanation.
const displayOptions = computed(() => {
  const result = props.options.map(option => {
  const label = String(option[props.fieldNames?.label || 'label'] ?? option.value ?? '')
  const value = option[props.fieldNames?.value || 'value']
  const presentation = props.kind === 'codec' ? codecOption({ id:String(value), name:label }, t)
    : props.kind === 'byteOrder' ? byteOrderOption(String(value), t)
    : props.kind === 'access' ? accessOption(String(value), label, t) : {}
  const item = { ...option, ...presentation, value, label:'label' in presentation ? String(presentation.label) : label }
  return { ...item, title:item.label, display: h('span', { class: 'collector-config-selection' }, [h(Icon, { type: item.icon || 'UnorderedListOutlined' }), h('span', item.label)]) }
  })
  return props.kind === 'codec' ? sortCodecOptions(result) : result
})
</script>
<style>
.collector-config-option { display:flex; align-items:center; gap:10px; line-height:20px; }
.collector-config-option-icon { flex:none; font-size:16px; color:var(--text-color-secondary,var(--ant-color-text-secondary,#595959)); }
.collector-config-option-copy { display:flex; flex-direction:column; min-width:0; white-space:normal; }
.collector-config-option-copy small { font-size:12px; line-height:18px; font-weight:400; color:var(--text-color-secondary,var(--ant-color-text-tertiary,#8c8c8c)); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.collector-config-selection { display:inline-flex; align-items:center; gap:6px; max-width:100%; vertical-align:middle; }
.collector-config-selection > span:last-child { overflow:hidden; text-overflow:ellipsis; }
.collector-config-selection .anticon { flex:none; color:var(--text-color-secondary,var(--ant-color-text-secondary,#595959)); }
.collector-config-options { min-width:260px !important; max-width:calc(100vw - 24px); }
</style>
