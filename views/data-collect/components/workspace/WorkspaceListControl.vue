<template>
  <a-dropdown :trigger="['click']" :disabled="disabled" @open-change="$emit('openChange',$event)">
    <button class="cw-list-control" :class="{active}" :disabled="disabled" :aria-label="`${label}: ${selected?.label || ''}`">
      <AIcon :type="icon" /><span class="cw-list-control-label">{{ label }}</span><span>{{ selected?.label }}</span><AIcon type="DownOutlined" />
    </button>
    <template #overlay>
      <a-menu class="cw-list-control-menu" :selected-keys="[value]" @click="select">
        <a-menu-item v-for="option in options" :key="option.value">
          <span class="collector-config-option"><AIcon :type="option.icon" /><span class="collector-config-option-copy">{{ option.label }}<small>{{ option.description }}</small></span><small v-if="option.count != null" class="cw-list-control-count">{{ option.count.toLocaleString() }}</small><AIcon v-if="option.value === value" type="CheckOutlined" class="cw-list-control-check" /></span>
        </a-menu-item>
      </a-menu>
    </template>
  </a-dropdown>
</template>
<script setup lang="ts">
import { computed } from 'vue'
const props=defineProps<{value:string;label:string;icon:string;active?:boolean;disabled?:boolean;options:Array<{value:string;label:string;icon:string;description?:string;count?:number}>}>()
const emit=defineEmits<{'update:value':[value:string];change:[];openChange:[open:boolean]}>()
const selected=computed(()=>props.options.find(option=>option.value === props.value))
function select({key}:{key:string|number}) {emit('update:value',String(key));emit('change')}
</script>
