<template>
  <div v-bind="containerProps" class="cw-value-scroll" :style="{height:`${height}px`}" tabindex="0" :aria-label="$t(`collectorValue.${mode}`)">
    <div v-bind="wrapperProps">
      <div v-for="row in list" :key="row.index" class="cw-value-grid-row" :class="[`is-${mode}`,{'is-compact':mode === 'value' && compact}]" :style="{height:`${rowHeight}px`}">
        <template v-if="mode === 'value'"><div v-for="(item,index) in items(row.data)" :key="index" class="cw-value-cell" :title="`[${row.data*columns+index}] ${format(item)}`" :aria-label="`[${row.data*columns+index}] ${format(item)}`"><i v-if="typeof item === 'boolean'" class="cw-value-lamp" :class="{'is-on':item}" aria-hidden="true" /><b v-if="!compact">{{ format(item) }}</b></div></template>
        <template v-else-if="mode === 'bytes'"><div v-for="(byte,index) in items(row.data)" :key="index" class="cw-byte-cell"><small>+{{ row.data*columns+index }}</small><b>{{ Number(byte).toString(16).padStart(2,'0').toUpperCase() }}</b></div></template>
        <template v-else><small>+{{ row.data }}</small><span v-for="bit in byteBits(Number(values[row.data]))" :key="bit.bit" :class="{'is-on':bit.on}" :title="`+${row.data} · b${bit.bit}`"><small>b{{ bit.bit }}</small><b>{{ bit.on ? 1 : 0 }}</b></span></template>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed, watch } from 'vue'
import { useVirtualList } from '@vueuse/core'
import { formatPointValue } from '../../../../utils/pointValue'
import { byteBits } from '../../../../utils/pointValueView'
const props=defineProps<{values:unknown[];mode:string;compact?:boolean}>()
const columns=computed(()=>props.mode === 'bits' ? 1 : props.mode === 'bytes' ? 8 : props.compact ? 16 : 4)
const rowHeight=computed(()=>props.mode === 'value' ? 28 : 44)
const rows=computed(()=>Array.from({length:Math.ceil(props.values.length/columns.value)},(_,index)=>index))
const {list,containerProps,wrapperProps,scrollTo}=useVirtualList(rows,{itemHeight:()=>rowHeight.value,overscan:2})
const height=computed(()=>Math.min(rows.value.length*rowHeight.value,240))
const items=(row:number)=>props.values.slice(row*columns.value,(row+1)*columns.value)
const format=(value:unknown)=>formatPointValue(value,'∅')
watch([()=>props.mode,columns],()=>scrollTo(0))
</script>
<style scoped lang="less">
.cw-value-scroll { scrollbar-width:thin; overflow-x:hidden!important; overscroll-behavior:contain; }
.cw-value-grid-row { display:grid; align-items:center; gap:4px; padding-bottom:4px; box-sizing:border-box; }
.is-value { grid-template-columns:repeat(4,minmax(0,1fr)); }.is-bytes { grid-template-columns:repeat(8,minmax(0,1fr)); }.is-bits { grid-template-columns:24px repeat(8,minmax(0,1fr)); }
.cw-value-cell { display:flex; align-items:center; justify-content:center; gap:4px; min-width:0; padding:1px 5px; border-radius:3px; background:var(--table-header-bg,#fafafa); }
.cw-value-cell b { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:13px; line-height:20px; font-variant-numeric:tabular-nums; }.cw-byte-cell,.is-bits>span { display:flex; flex-direction:column; align-items:center; padding:4px 0; border-radius:4px; background:var(--table-header-bg,#fafafa); }
small { color:var(--text-color-secondary); font-size:10px; }b { font-weight:500; }.cw-byte-cell b { font:500 14px monospace; }
.is-bits .is-on { color:var(--primary-color); background:color-mix(in srgb,var(--primary-color) 10%,transparent); }
.cw-value-lamp { width:8px; height:8px; border-radius:2px; background:var(--border-color-base,#ddd); flex:none; }.cw-value-lamp.is-on { background:var(--primary-color); }
.is-compact { grid-template-columns:repeat(16,minmax(0,1fr)); }
.is-compact .cw-value-cell { padding:0; background:none; }
.is-compact .cw-value-lamp { width:12px; height:12px; }
</style>
