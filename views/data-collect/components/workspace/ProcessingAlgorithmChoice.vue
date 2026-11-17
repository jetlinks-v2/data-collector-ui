<template>
  <ConfigSelect :value="value" :options="options" size="small" class="cw-inline-mode" :bordered="false" :virtual="false" :dropdown-match-select-width="384" :dropdown-render="context ? renderMenu : undefined" popup-class-name="cw-algorithm-options" :loading="menuOpen && guide?.loading" :aria-label="label" @update:value="$emit('update:value',$event)" @dropdown-visible-change="menuOpen=$event">
    <template #option="option"><SelectOption :label="option.label" :icon="option.icon" :title="option.disabledReason || option.description">
      <template #description><span>{{ option.disabledReason || option.description }}</span><LatexView v-if="option.formula" :latex="option.formula" /></template>
    </SelectOption></template>
  </ConfigSelect>
  <a-popover v-if="guide" v-model:open="guideOpen" trigger="click" placement="bottomRight" :arrow="true" overlay-class-name="cw-workspace-popover" @keydown.esc.stop="guideOpen=false">
    <a-button type="text" size="small" class="cw-signal-guide" :aria-label="$t('collectorSignalGuide.title')" :aria-expanded="guideOpen"><AIcon type="PartitionOutlined" /></a-button>
    <template #content><ProcessingAlgorithmGuide :documentation="guide.documentation" :loading="guide.loading" :error="guide.error" @retry="$emit('retry')" /></template>
  </a-popover>
</template>
<script setup lang="ts">
import { defineAsyncComponent, h, ref, watch, type VNode } from 'vue'
import { SelectOption } from '@jetlinks-web-core/components'
import { LatexView } from '@jetlinks-web-core/components/Expression'
import type { ProcessorDocumentation } from '../../../../types/processorDocumentation'
import ConfigSelect from '../../../../components/ConfigSelect.vue'
const ProcessingAlgorithmGuide=defineAsyncComponent(()=>import('./ProcessingAlgorithmGuide.vue'))
const props=defineProps<{value:string;label:string;options:Array<{value:string;label:string;[key:string]:unknown}>;context?:string;guide?:{documentation?:ProcessorDocumentation;loading:boolean;error:boolean}}>()
const renderMenu=({menuNode}:{menuNode:VNode})=>h('div',[h('p',{class:'cw-algorithm-context'},props.context),menuNode])
const emit=defineEmits<{'update:value':[value:string];active:[value:boolean];retry:[]}>()
const menuOpen=ref(false),guideOpen=ref(false)
watch(()=>menuOpen.value || guideOpen.value,value=>emit('active',value))
</script>
<style scoped>
.cw-signal-guide{width:20px;min-width:20px}
</style>
