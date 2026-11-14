<template>
  <div class="cw-value-display">
  <!-- Remount only when the array changes kind so virtual item widths stay fixed. -->
  <PointValueStrip v-if="Array.isArray(value) && value.length" :key="booleanArray ? 'boolean' : 'value'" :value="value" :compact="booleanArray" />
  <a-popover v-model:open="open" trigger="click" placement="bottomLeft" :destroy-tooltip-on-hide="true" overlay-class-name="cw-point-value-overlay">
    <template #content>
      <section v-if="open" class="cw-value-inspector" @click.stop>
        <header><strong>{{ point.name }}</strong><a-radio-group v-model:value="mode" size="small" button-style="solid" :aria-label="$t('collectorValue.view')"><a-radio-button v-for="option in modes" :key="option.id" :value="option.id"><AIcon :type="option.icon" />{{ $t(`collectorValue.${option.id}`) }}</a-radio-button></a-radio-group></header>
        <template v-if="mode === 'value'">
          <PointValueGrid v-if="Array.isArray(value)" :values="value" mode="value" :compact="booleanArray" />
          <pre v-else>{{ format(value) }}</pre>
        </template>
        <a-spin v-else-if="loading" />
        <p v-else-if="failed" class="cw-value-note">{{ $t('collectorWorkspace.loadFailed') }}</p>
        <p v-else-if="bytes == null" class="cw-value-note">{{ $t('collectorValue.noRaw') }}</p>
        <PointValueGrid v-else :values="bytes" :mode="mode" />
        <footer><small>{{ mode === 'value' ? $t('collectorValue.elements',{count:Array.isArray(value) ? value.length : 1}) : $t('collectorValue.rawBytes',{count:raw?.rawByteLength ?? bytes?.length ?? 0}) }}<template v-if="mode === 'bits'"> · b7 → b0</template></small></footer>
        <small v-if="mode !== 'value' && raw?.rawByteLength && bytes && raw.rawByteLength > bytes.length" class="cw-value-note">{{ $t('collectorValue.previewLimit',{count:bytes.length}) }}</small>
      </section>
    </template>
    <button class="cw-value-trigger" :class="{'is-empty':value == null || value === ''}" :aria-label="$t('collectorValue.inspect')" @click.stop>
      <small v-if="Array.isArray(value)" class="cw-value-count">{{ $t('collectorValue.elements',{count:value.length}) }}</small>
      <span v-else class="cw-reading">{{ value == null || value === '' ? emptyText : format(value) }}<small v-if="value != null && unit">{{ unit }}</small></span>
      <AIcon type="ExpandAltOutlined" class="cw-value-expand" />
    </button>
  </a-popover>
  </div>
</template>
<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { PointRow } from '../../../../types/workspace'
import { formatPointValue } from '../../../../utils/pointValue'
import { pointRawBytes } from '../../../../utils/pointValueView'
import PointValueStrip from './PointValueStrip.vue'
import PointValueGrid from './PointValueGrid.vue'
import { usePointValueView } from '../../hook/usePointValueView'

const props=defineProps<{point:PointRow;emptyText:string;unit?:string}>()
const {t}=useI18n()
const open=ref(false),mode=ref('value')
const {raw,loading,failed}=usePointValueView(()=>props.point,open,mode)
const value=computed(()=>props.point.latest && ('parsedData' in props.point.latest ? props.point.latest.parsedData : props.point.latest.parseData))
const booleanArray=computed(()=>Array.isArray(value.value) && value.value.length > 0 && value.value.every(item=>typeof item === 'boolean'))
const bytes=computed(()=>pointRawBytes(raw.value?.hex))
const modes=[{id:'value',icon:'DotChartOutlined'},{id:'bytes',icon:'BlockOutlined'},{id:'bits',icon:'AppstoreOutlined'}]
const format=(item:unknown)=>formatPointValue(item,t('collectorWorkspace.noData'))
</script>
<style scoped lang="less">
.cw-value-display { display:flex; align-items:center; gap:6px; min-width:0; flex:1; }
.cw-value-count { font-size:11px; color:var(--text-color-secondary); white-space:nowrap; }
.cw-value-trigger { padding:0; border:0; background:none; display:inline-flex; align-items:center; gap:5px; min-width:0; max-width:100%; min-height:28px; text-align:left; color:inherit; cursor:pointer; }
.cw-value-trigger.is-empty .cw-reading { font-size:12px; font-weight:400; color:var(--text-color-secondary); }
.cw-value-trigger .cw-reading { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.cw-value-expand { opacity:.6; color:var(--text-color-secondary); font-size:11px; flex:none; }
.cw-value-trigger:hover .cw-value-expand,.cw-value-trigger:focus-visible .cw-value-expand { opacity:1; }
.cw-value-inspector { width:380px; max-width:calc(100vw - 64px); color:var(--text-color); }
.cw-value-inspector header,.cw-value-inspector footer { display:flex; justify-content:space-between; align-items:center; gap:8px; }
.cw-value-inspector header { margin-bottom:12px; }.cw-value-inspector header>strong { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-weight:500; }
.cw-value-inspector .ant-radio-button-wrapper { padding:0 7px; font-size:12px; }.cw-value-inspector .anticon { margin-right:3px; }
.cw-value-inspector pre { max-height:240px; overflow:auto; overflow-wrap:anywhere; white-space:pre-wrap; margin:0; font-size:14px; }
.cw-value-inspector footer>small,.cw-value-note { color:var(--text-color-secondary); font-size:11px; }
.cw-value-inspector footer { margin-top:10px; }.cw-value-note { display:block; margin:6px 0 0; }
</style>
