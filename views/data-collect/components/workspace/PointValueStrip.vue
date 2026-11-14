<template>
  <div v-bind="containerProps" class="cw-value-strip" :class="{'is-boolean':compact}" tabindex="0" role="list" :aria-label="$t('collectorValue.elements',{count:value.length})" @click.stop>
    <div v-bind="wrapperProps" class="cw-value-strip-items">
      <div v-for="item in list" :key="item.index" role="listitem" :title="`[${item.index}] ${format(item.data)}`" :aria-label="`[${item.index}] ${format(item.data)}`">
        <i v-if="compact" :class="{'is-on':item.data}" aria-hidden="true" />
        <template v-else><i v-if="typeof item.data === 'boolean'" :class="{'is-on':item.data}" /><b>{{ format(item.data) }}</b></template>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import { useVirtualList } from '@vueuse/core'
import { formatPointValue } from '../../../../utils/pointValue'
const props=defineProps<{value:unknown[];compact:boolean}>()
const {list,containerProps,wrapperProps}=useVirtualList(computed(()=>props.value),{itemWidth:props.compact ? 16 : 64,overscan:2})
const format=(value:unknown)=>formatPointValue(value,'∅')
</script>
<style scoped>
.cw-value-strip { flex:1; min-width:0; scrollbar-width:thin; height:28px; overflow-y:hidden!important; overscroll-behavior-x:contain; }
.cw-value-strip-items { display:flex; align-items:center; }
.cw-value-strip-items>div { width:60px; flex:0 0 60px; margin-right:4px; box-sizing:border-box; display:flex; align-items:center; justify-content:center; gap:4px; padding:1px 5px; border-radius:3px; background:var(--table-header-bg,#fafafa); }
b { min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:13px; line-height:20px; font-weight:500; font-variant-numeric:tabular-nums; }
i { display:inline-block; width:8px; height:8px; background:var(--border-color-base,#ddd); border-radius:2px; }i.is-on { background:var(--primary-color); }
.is-boolean .cw-value-strip-items>div { width:12px; flex-basis:12px; padding:0; background:none; }
.is-boolean i { width:12px; height:12px; flex:none; }
</style>
