<template>
  <div ref="root" class="cw-point-workspace" :class="{ 'cw-inline': inline, 'cw-no-editor': !selected }">
    <div ref="content" class="cw-points-content" :role="cards ? undefined : 'table'" :aria-rowcount="cards ? undefined : points.length + 1">
      <div v-if="!cards" ref="header" class="cw-virtual-table-head">
        <div class="cw-virtual-table-row" role="row"><span role="columnheader" /><span role="columnheader">{{ $t('collectorWorkspace.name') }}</span><span role="columnheader">{{ $t('collectorWorkspace.value') }}</span><span role="columnheader">{{ $t('collectorWorkspace.state') }}</span><span role="columnheader">{{ $t('collectorMonitoring.scheduledInterval') }}</span><span role="columnheader">{{ $t('collectorMonitoring.monitoring') }}</span></div>
      </div>
      <VirtualScroll v-if="points.length" ref="scroll" class="cw-point-scroll" :data="rows" :item-height="rowHeight" :expanded-key="expandedRow" :style="{ height: height + 'px' }" @horizontal-scroll="onHorizontalScroll">
        <template #renderItem="{ points: rowPoints, rowIndex }">
          <div v-if="cards" class="cw-point-grid cw-virtual-card-row" :style="{ gridTemplateColumns: 'repeat(' + columnCount + ', minmax(0, 1fr))',height:rowHeight + 'px' }">
            <article v-for="point in rowPoints" :key="point.id" class="cw-point" :data-point-id="point.id" :class="{ selected: point.id === selected }" @click="$emit('select', point.id)">
              <div class="cw-point-heading"><span v-if="!point.id.startsWith('_new:')" class="cw-point-check" @click.stop><a-checkbox :checked="selection.keys.includes(point.id)" :disabled="selection.busy" :aria-label="$t('collectorList.selectPoint', { name: point.name })" @change="$emit('check', point.id)" /></span><button class="cw-point-select" :aria-expanded="inline ? point.id === selected : undefined" :aria-pressed="point.id === selected" @click.stop="$emit('select', point.id)">
                <PointIdentity :point="point" /><AIcon v-if="inline" :type="point.id === selected ? 'UpOutlined' : 'DownOutlined'" />
              </button><span class="cw-point-status"><WorkspaceStatus v-if="point.runtime || stateValue(point.state) === 'disabled'" :object="point" /><a-skeleton-input v-else active size="small" class="cw-metric-skeleton" /><DiagnosticTrigger :trigger-class="objectTone(point) === 'bad' ? 'cw-error' : undefined" :open="diagnosticId === point.id" :label="$t('collectorWorkspace.diagnosePoint', { name: point.name })" @visibility="$emit('diagnosticVisibility', point, $event)"><slot name="diagnostic" /></DiagnosticTrigger></span></div>
              <div class="cw-point-reading"><PointValueDisplay :point="point" :empty-text="reading(point)" :unit="unit(point)" /><RuntimeCardMetrics :object="point" kind="point" /></div>
              <div v-if="point.runtime?.available || timestamp(point)" class="cw-point-footer"><RuntimeDataFlow :object="point" point compact /><time v-if="timestamp(point)" :title="$t('collectorWorkspace.updated')">{{ timestamp(point) }}</time></div>
            </article>
          </div>
          <div v-else v-for="point in rowPoints" :key="point.id" :data-point-id="point.id" class="cw-virtual-table-row cw-virtual-point-row" role="row" :aria-rowindex="rowIndex" :class="{ selected: point.id === selected }" @click="$emit('select', point.id)">
            <span role="cell" @click.stop><a-checkbox :checked="selection.keys.includes(point.id)" :disabled="selection.busy || point.id.startsWith('_new:')" :aria-label="$t('collectorList.selectPoint', {name:point.name})" @change="$emit('check', point.id)" /></span>
            <div role="cell"><button class="cw-point-select" :aria-pressed="point.id === selected" @click.stop="$emit('select', point.id)"><PointIdentity :point="point" /></button></div>
            <div role="cell" class="cw-table-value"><PointValueDisplay :point="point" :empty-text="reading(point)" :unit="unit(point)" /><time v-if="timestamp(point)" :title="$t('collectorWorkspace.updated')">{{ timestamp(point) }}</time></div>
            <span role="cell" class="cw-point-status"><WorkspaceStatus :object="point" /><DiagnosticTrigger :open="diagnosticId === point.id" :label="$t('collectorWorkspace.diagnosePoint', { name: point.name })" @visibility="$emit('diagnosticVisibility', point, $event)"><slot name="diagnostic" /></DiagnosticTrigger></span>
            <div role="cell"><RuntimeDataFlow :object="point" point compact /></div><div role="cell"><RuntimeCardMetrics :object="point" kind="point" /></div>
          </div>
        </template>
        <template #expandedItem><div :id="'cw-editor-' + selected" class="cw-inline-editor-target" /></template>
      </VirtualScroll>
      <a-empty v-else :description="$t('collectorWorkspace.noPoints')" :image="Empty.PRESENTED_IMAGE_SIMPLE" />
    </div>
    <div class="cw-editor-slot"><slot name="editor" /></div>
  </div>
</template>
<script setup lang="ts">
import { Empty } from 'ant-design-vue'
import { computed, nextTick, onBeforeUnmount, onMounted, onUpdated, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import dayjs from 'dayjs'
import type { PointRow } from '../../../../types/workspace'
import type { PointSelection } from '../../../../utils/workspaceList'
import { objectDisplayState, objectTone, stateValue } from '../../../../types/workspace'
import { formatPointValue } from '../../../../utils/pointValue'
import PointIdentity from './PointIdentity.vue'
import WorkspaceStatus from './WorkspaceStatus.vue'
import DiagnosticTrigger from './DiagnosticTrigger.vue'
import RuntimeCardMetrics from './RuntimeCardMetrics.vue'
import RuntimeDataFlow from './RuntimeDataFlow.vue'
import PointValueDisplay from './PointValueDisplay.vue'
const props = defineProps<{ points: PointRow[]; selected?: string; inline: boolean; view: 'cards' | 'table'; diagnosticId?: string; selection: PointSelection }>()
const emit = defineEmits<{ select: [id: string]; diagnosticVisibility: [point: PointRow, visible: boolean]; check: [id: string]; checks: [ids: string[]]; visible: [ids:string[]] }>()
const { t } = useI18n()
const root = ref<HTMLElement>(), content=ref<HTMLElement>(), header=ref<HTMLElement>()
const scroll=ref<{scrollTo:(top:number)=>void}>()
const width=ref(340),height=ref(400)
const onHorizontalScroll=(left:number)=>{if(header.value)header.value.scrollLeft=left}
const cards=computed(()=>props.view === 'cards' || props.inline)
const columnCount=computed(()=>cards.value && !props.inline ? Math.max(1,Math.floor((width.value+12)/352)) : 1)
const rowHeight=computed(()=>cards.value ? width.value / columnCount.value < 310 ? 156 : 132 : 64)
const rows=computed(()=>{
  const result:Array<{id:string;points:PointRow[];rowIndex:number}>=[]
  for(let offset=0;offset<props.points.length;offset+=columnCount.value)result.push({id:props.points[offset].id,points:props.points.slice(offset,offset+columnCount.value),rowIndex:offset+2})
  return result
})
const expandedRow=computed(()=>props.inline && props.selected ? rows.value.find(row=>row.points.some(point=>point.id === props.selected))?.id : undefined)
const measure=()=>{
  width.value=content.value?.clientWidth || 340
  height.value=Math.max(260,window.innerHeight-(content.value?.getBoundingClientRect().top || 300)-48-(cards.value ? 0 : 30))
}
let resize:ResizeObserver|undefined,intersection:IntersectionObserver|undefined,mutation:MutationObserver|undefined
const elements=new Map<Element,string>(), visible=new Set<Element>()
let lastVisible=''
function publish(){
  const ids=[...new Set([...visible].flatMap(element=>elements.has(element) ? [elements.get(element)!] : []))].sort()
  const signature=ids.join(',')
  if(signature !== lastVisible){lastVisible=signature;emit('visible',ids)}
}
/** Observe actual intersecting rows, excluding virtual overscan and rows clipped by the page. */
function syncElements(){
  if(!intersection)return
  const current=new Set<Element>(Array.from(content.value?.querySelectorAll('[data-point-id]') || []))
  for(const element of elements.keys())if(!current.has(element)){intersection.unobserve(element);elements.delete(element);visible.delete(element)}
  for(const element of current)if(!elements.has(element)){elements.set(element,(element as HTMLElement).dataset.pointId!);intersection.observe(element)}
  publish()
}
onMounted(()=>{
  resize=new ResizeObserver(measure);if(content.value)resize.observe(content.value)
  intersection=new IntersectionObserver(entries=>{for(const entry of entries)if(elements.has(entry.target) && entry.isIntersecting)visible.add(entry.target);else visible.delete(entry.target);publish()},{threshold:0})
  // VirtualScroll updates its own slice without updating this parent; watch row identities only.
  mutation=new MutationObserver(records=>{
    if(records.some(record=>[...Array.from(record.addedNodes),...Array.from(record.removedNodes)].some(node=>node instanceof Element && (node.matches('[data-point-id]') || node.querySelector('[data-point-id]')))))syncElements()
  })
  if(content.value)mutation.observe(content.value,{childList:true,subtree:true})
  measure();syncElements();window.addEventListener('resize',measure)
})
onUpdated(syncElements)
watch(()=>props.points.map(point=>point.id).join(','),()=>void nextTick(()=>{scroll.value?.scrollTo(0);syncElements()}))
watch([cards,()=>props.inline],()=>void nextTick(measure))
// Keep the object being read in view when opening or closing the side editor changes the column count.
watch(columnCount,()=>{
  const anchor=props.selected || elements.get(visible.values().next().value as Element)
  const index=props.points.findIndex(point=>point.id === anchor)
  if(index >= 0)void nextTick(()=>scroll.value?.scrollTo(Math.floor(index/columnCount.value)*rowHeight.value))
})
onBeforeUnmount(()=>{resize?.disconnect();intersection?.disconnect();mutation?.disconnect();window.removeEventListener('resize',measure);emit('visible',[])})
const pointValue = (point:PointRow) => point.latest && ('parsedData' in point.latest ? point.latest.parsedData : point.latest.parseData)
const reading = (point: PointRow) => {
  const state = stateValue(objectDisplayState(point))
  const empty = ['disabled', 'paused', 'stopped'].includes(state)
    ? t(state === 'disabled' ? 'collectorWorkspace.disabled' : 'collectorRuntime.states.'+state)
    : state === 'collectionError' ? t('collectorRuntime.states.collectionError') : t('collectorWorkspace.noData')
  return formatPointValue(pointValue(point), empty)
}
const unit = (point: PointRow) => point.latest ? point.unit || point.metadata?.dataType?.unit || '' : ''
const timestamp = (point: PointRow) => point.latest?.timestamp ? dayjs(point.latest.timestamp).format('HH:mm:ss') : ''
</script>
