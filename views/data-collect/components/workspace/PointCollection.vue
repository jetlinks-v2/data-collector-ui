<template>
  <div ref="root" class="cw-point-workspace" :class="{ 'cw-inline': inline, 'cw-no-editor': !selected }">
    <div ref="content" class="cw-points-content" :role="cards ? undefined : 'table'" :aria-rowcount="cards ? undefined : points.length + 1">
      <div v-if="!cards" ref="header" class="cw-virtual-table-head">
        <div class="cw-virtual-table-row" role="row"><span role="columnheader" /><span role="columnheader">{{ $t('collectorWorkspace.name') }}</span><span role="columnheader">{{ $t('collectorWorkspace.value') }}</span><span role="columnheader">{{ $t('collectorWorkspace.state') }}</span><span role="columnheader">{{ $t('collectorMonitoring.scheduledInterval') }}</span><span role="columnheader">{{ $t('collectorMonitoring.monitoring') }}</span></div>
      </div>
      <VirtualScroll v-if="points.length" ref="scroll" class="cw-point-scroll" :data="rows" :item-height="rowHeight" :end-padding="endPadding" :style="{ height: height + 'px' }" @horizontal-scroll="onHorizontalScroll">
        <template #renderItem="{ points: rowPoints, rowIndex }">
          <div v-if="cards" class="cw-point-grid cw-virtual-card-row" :style="{ gridTemplateColumns: 'repeat(' + columnCount + ', minmax(0, 1fr))',height:rowHeight + 'px' }">
            <article v-for="point in rowPoints" :key="point.id" class="cw-point" :data-point-id="point.id" :class="{ selected: point.id === selected && !selection.selecting, 'cw-point-editing': editorOpen && point.id === selected, 'cw-checked': selection.selecting && selection.keys.includes(point.id) }" @click="$emit('select', point.id)">
              <div class="cw-point-heading"><span v-if="selection.selecting && !point.id.startsWith('_new:')" class="cw-point-check" @click.stop><a-checkbox :checked="selection.keys.includes(point.id)" :disabled="selection.busy" :aria-label="$t('collectorList.selectPoint', { name: point.name })" @change="$emit('check', point.id)" /></span><button class="cw-point-select" :disabled="selection.selecting && point.id.startsWith('_new:')" :aria-expanded="!selection.selecting ? point.id === selected : undefined" :aria-pressed="selection.selecting ? selection.keys.includes(point.id) : undefined" :aria-current="!selection.selecting && point.id === selected ? 'true' : undefined" @click.stop="$emit('select', point.id)">
                <PointIdentity :point="point" /><AIcon v-if="!selection.selecting" :type="point.id === selected ? editorReady ? 'UpOutlined' : 'LoadingOutlined' : 'DownOutlined'" />
              </button><span class="cw-point-status"><RuntimeCardMetrics :object="point" kind="point" variant="status" @diagnostic-visibility="$emit('diagnosticVisibility', point, $event)"><template #diagnostic><slot name="diagnostic" /></template></RuntimeCardMetrics></span></div>
              <div class="cw-point-reading"><PointValueDisplay :point="point" :empty-text="reading(point)" :unit="unit(point)" /><RuntimeCardMetrics :object="point" kind="point" variant="values" /></div>
              <div v-if="point.runtime?.available || timestamp(point)" class="cw-point-footer"><RuntimeDataFlow :object="point" point compact /><time v-if="timestamp(point)" :title="$t('collectorWorkspace.updated')">{{ timestamp(point) }}</time></div>
            </article>
          </div>
          <div v-else v-for="point in rowPoints" :key="point.id" :data-point-id="point.id" class="cw-virtual-table-row cw-virtual-point-row" role="row" :aria-rowindex="rowIndex" :class="{ selected: point.id === selected && !selection.selecting, 'cw-checked': selection.selecting && selection.keys.includes(point.id) }" @click="$emit('select', point.id)">
            <span role="cell" @click.stop><a-checkbox v-if="selection.selecting" :checked="selection.keys.includes(point.id)" :disabled="selection.busy || point.id.startsWith('_new:')" :aria-label="$t('collectorList.selectPoint', {name:point.name})" @change="$emit('check', point.id)" /></span>
            <div role="cell"><button class="cw-point-select" :disabled="selection.selecting && point.id.startsWith('_new:')" :aria-pressed="selection.selecting ? selection.keys.includes(point.id) : undefined" :aria-current="!selection.selecting && point.id === selected ? 'true' : undefined" @click.stop="$emit('select', point.id)"><PointIdentity :point="point" /></button></div>
            <div role="cell" class="cw-table-value"><PointValueDisplay :point="point" :empty-text="reading(point)" :unit="unit(point)" /><time v-if="timestamp(point)" :title="$t('collectorWorkspace.updated')">{{ timestamp(point) }}</time></div>
            <span role="cell" class="cw-point-status"><RuntimeCardMetrics :object="point" kind="point" variant="status" @diagnostic-visibility="$emit('diagnosticVisibility', point, $event)"><template #diagnostic><slot name="diagnostic" /></template></RuntimeCardMetrics></span>
            <div role="cell" class="cw-table-cadence"><RuntimeDataFlow :object="point" point compact /></div><div role="cell"><RuntimeCardMetrics :object="point" kind="point" variant="values" /></div>
          </div>
        </template>
      </VirtualScroll>
      <slot v-else name="empty" />
    </div>
    <Teleport v-if="cards" to="body">
      <div class="collection-workspace cw-point-editor-overlay cw-point-card-editor" :class="{ 'cw-point-card-motion-enter': editorOpen, 'cw-point-card-motion-leave': !selected && hasOpened }" :style="editorPosition" :inert="!editorOpen" :aria-hidden="!editorOpen"><div ref="editorTarget" class="cw-point-editor-scroll" role="dialog" :aria-label="$t('collectorWorkspace.pointEditor')" /></div>
    </Teleport>
    <a-popover v-else :open="editorOpen" :trigger="[]" :placement="editorPlacement" :get-popup-container="popupContainer" :auto-adjust-overflow="false" :overlay-style="editorPosition" transition-name="" overlay-class-name="collection-workspace cw-workspace-popover cw-point-editor-overlay">
      <template #content><div ref="editorTarget" class="cw-point-editor-scroll" role="dialog" :aria-label="$t('collectorWorkspace.pointEditor')" /></template>
      <span aria-hidden="true" :style="editorAnchorStyle" />
    </a-popover>
  </div>
</template>
<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, onUpdated, ref, toRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import dayjs from 'dayjs'
import type { PointRow } from '../../../../types/workspace'
import type { PointSelection } from '../../../../utils/workspaceList'
import { objectDisplayState, stateValue } from '../../../../types/workspace'
import PointIdentity from './PointIdentity.vue'
import RuntimeCardMetrics from './RuntimeCardMetrics.vue'
import RuntimeDataFlow from './RuntimeDataFlow.vue'
import PointValueDisplay from './PointValueDisplay.vue'
import { usePointEditorOverlay } from '../../hook/usePointEditorOverlay'
import { useEditorDismiss } from '../../hook/useEditorDismiss'
const props = defineProps<{ points: PointRow[]; selected?: string; editor:{ready?:string;error?:string}; inline: boolean; view: 'cards' | 'table'; selection: PointSelection }>()
const emit = defineEmits<{ select: [id: string]; diagnosticVisibility: [point: PointRow, visible: boolean]; check: [id: string]; checks: [ids: string[]]; visible: [ids:string[]]; editorTarget: [target:HTMLElement | undefined]; closeEditor: [restoreFocus?: boolean] }>()
const { t } = useI18n()
const root = ref<HTMLElement>(), content=ref<HTMLElement>(), header=ref<HTMLElement>()
const scroll=ref<{scrollTo:(top:number)=>void;getScrollTop:()=>number}>()
const width=ref(340),height=ref(400)
const cards=computed(()=>props.view === 'cards' || props.inline)
const editorReady=computed(()=>!!props.selected && (props.editor.ready === props.selected || !!props.editor.error))
const { open:editorOpen, placement:editorPlacement, position:editorPosition, anchorStyle:editorAnchorStyle, target:editorTarget, popupContainer, update:updateEditor }=usePointEditorOverlay({root,selected:toRef(props,'selected'),width,cards,ready:editorReady})
useEditorDismiss({ active: computed(() => !!props.selected), panel: editorTarget, anchor: () => Array.from(root.value?.querySelectorAll<HTMLElement>('[data-point-id]') || []).find(element => element.dataset.pointId === props.selected), dismiss: restoreFocus => emit('closeEditor', restoreFocus) })
watch(editorTarget,target=>emit('editorTarget',target),{flush:'post'})
const onHorizontalScroll=(left:number)=>{if(header.value)header.value.scrollLeft=left}
const columnCount=computed(()=>cards.value && !props.inline ? Math.max(1,Math.floor((width.value+12)/352)) : 1)
const rowHeight=computed(()=>cards.value ? width.value / columnCount.value < 310 ? 156 : 132 : 64)
// Keep the last opened point's scroll room on close, so its card does not jump down mid-transition.
const hasOpened=ref(false)
watch(editorReady,ready=>{if(ready)hasOpened.value=true},{immediate:true})
const endPadding=computed(()=>hasOpened.value ? Math.max(0,height.value-rowHeight.value) : 0)
const rows=computed(()=>{
  const result:Array<{id:string;points:PointRow[];rowIndex:number}>=[]
  for(let offset=0;offset<props.points.length;offset+=columnCount.value)result.push({id:props.points[offset].id,points:props.points.slice(offset,offset+columnCount.value),rowIndex:offset+2})
  return result
})
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
  const changed=current.size!==elements.size || [...current].some(element=>!elements.has(element))
  for(const element of elements.keys())if(!current.has(element)){intersection.unobserve(element);elements.delete(element);visible.delete(element)}
  for(const element of current)if(!elements.has(element)){elements.set(element,(element as HTMLElement).dataset.pointId!);intersection.observe(element)}
  publish()
  if(changed)updateEditor()
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
watch(()=>props.points.map(point=>point.id).join(','),()=>{
  // Keep the first visible identity in place when runtime sorting moves rows around it.
  const anchor=elements.get(visible.values().next().value as Element)
  const index=props.points.findIndex(point=>point.id === anchor)
  const offset=(scroll.value?.getScrollTop() || 0)%rowHeight.value
  hasOpened.value=editorReady.value
  void nextTick(()=>{scroll.value?.scrollTo(index<0 ? 0 : Math.floor(index/columnCount.value)*rowHeight.value+offset);syncElements()})
})
watch([cards,()=>props.inline],()=>void nextTick(measure))
// Changing viewport width keeps the selected point in view without rebuilding its editor.
watch(columnCount,()=>{
  if(props.selected)return
  const anchor=elements.get(visible.values().next().value as Element)
  const index=props.points.findIndex(point=>point.id === anchor)
  if(index >= 0)void nextTick(()=>scroll.value?.scrollTo(Math.floor(index/columnCount.value)*rowHeight.value))
})
// Reveal the selected summary without making the floating editor occupy a virtual row.
watch([()=>props.selected,editorReady,columnCount,width,height,cards],async ([id,ready])=>{
  if(!id || !ready)return
  await nextTick()
  // The hidden editor first receives the source width, then exposes its natural content height.
  await nextTick()
  const index=rows.value.findIndex(row=>row.points.some(point=>point.id === id))
  if(index<0)return
  const top=index*rowHeight.value,current=scroll.value?.getScrollTop() || 0
  const panelHeight=Math.min(640,(editorTarget.value?.scrollHeight || 640)+2)
  const needed=cards.value ? Math.min(panelHeight,height.value) : rowHeight.value+8+Math.min(panelHeight,height.value-rowHeight.value-8)
  // Scroll only the missing space; a card with room below it keeps its original position.
  const next=top<current ? top : Math.max(current,top+needed-height.value)
  if(next!==current)scroll.value?.scrollTo(next)
  await nextTick()
  updateEditor()
},{flush:'post'})
onBeforeUnmount(()=>{resize?.disconnect();intersection?.disconnect();mutation?.disconnect();window.removeEventListener('resize',measure);emit('visible',[])})
const reading = (point: PointRow) => {
  const state = stateValue(objectDisplayState(point))
  return ['disabled', 'paused', 'stopped'].includes(state)
    ? t(state === 'disabled' ? 'collectorWorkspace.disabled' : 'collectorRuntime.states.'+state)
    : state === 'collectionError' ? t('collectorRuntime.states.collectionError') : t('collectorWorkspace.noData')
}
const unit = (point: PointRow) => point.latest ? point.unit || point.metadata?.dataType?.unit || '' : ''
const timestamp = (point: PointRow) => point.latest?.timestamp ? dayjs(point.latest.timestamp).format('HH:mm:ss') : ''
</script>
