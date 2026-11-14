<template>
  <div ref="root" class="cw-point-workspace" :class="{ 'cw-inline': inline, 'cw-no-editor': !selected }">
    <div class="cw-points-content">
      <div v-if="view === 'cards' || inline" class="cw-point-grid">
        <template v-for="point in points" :key="point.id">
          <article class="cw-point" :class="{ selected: point.id === selected }" @click="$emit('select', point.id)">
            <div class="cw-point-heading"><span v-if="!point.id.startsWith('_new:')" class="cw-point-check" @click.stop><a-checkbox :checked="selection.keys.includes(point.id)" :disabled="selection.busy" :aria-label="$t('collectorList.selectPoint', { name: point.name })" @change="$emit('check', point.id)" /></span><button class="cw-point-select" :aria-expanded="inline ? point.id === selected : undefined" :aria-pressed="point.id === selected" @click.stop="$emit('select', point.id)">
              <PointIdentity :point="point" /><AIcon v-if="inline" :type="point.id === selected ? 'UpOutlined' : 'DownOutlined'" />
            </button><span class="cw-point-status"><WorkspaceStatus v-if="point.latest || point.runtime || point.runningState || stateValue(point.state) === 'disabled'" :object="point" /><span v-else class="cw-badge gray">{{ $t('collectorWorkspace.noData') }}</span><DiagnosticTrigger :trigger-class="objectTone(point) === 'bad' ? 'cw-error' : undefined" :open="diagnosticId === point.id" :label="$t('collectorWorkspace.diagnosePoint', { name: point.name })" @visibility="$emit('diagnosticVisibility', point, $event)"><slot name="diagnostic" /></DiagnosticTrigger></span></div>
            <div class="cw-point-reading"><PointValueDisplay :point="point" :empty-text="reading(point)" :unit="unit(point)" /><RuntimeCardMetrics :object="point" kind="point" /></div>
            <div v-if="point.runtime?.available || timestamp(point)" class="cw-point-footer"><RuntimeDataFlow :object="point" point compact /><time v-if="timestamp(point)" :title="$t('collectorWorkspace.updated')">{{ timestamp(point) }}</time></div>
          </article>
          <div v-if="inline && point.id === selected" :id="`cw-editor-${point.id}`" class="cw-inline-editor-target" />
        </template>
      </div>
      <a-table v-else class="cw-point-table" size="small" table-layout="fixed" row-key="id" :columns="columns" :data-source="points" :pagination="false" :row-selection="rowSelection" :scroll="{ x: 896 }" :sticky="{ getContainer: tableScrollContainer }" :row-class-name="point => point.id === selected ? 'selected' : ''" :custom-row="customRow">
        <template #bodyCell="{column,record:point}">
          <button v-if="column.key === 'name'" class="cw-point-select" :aria-pressed="point.id === selected" :title="point.name" @click.stop="$emit('select', point.id)"><PointIdentity :point="point as PointRow" /></button>
          <div v-else-if="column.key === 'value'" class="cw-table-value"><PointValueDisplay :point="point as PointRow" :empty-text="reading(point as PointRow)" :unit="unit(point as PointRow)" /><time v-if="timestamp(point as PointRow)" :title="$t('collectorWorkspace.updated')">{{ timestamp(point as PointRow) }}</time></div>
          <span v-else-if="column.key === 'state'" class="cw-point-status"><WorkspaceStatus :object="point as PointRow" /><DiagnosticTrigger :trigger-class="objectTone(point as PointRow) === 'bad' ? 'cw-error' : undefined" :open="diagnosticId === point.id" :label="$t('collectorWorkspace.diagnosePoint', { name: point.name })" @visibility="$emit('diagnosticVisibility', point as PointRow, $event)"><slot name="diagnostic" /></DiagnosticTrigger></span>
          <RuntimeDataFlow v-else-if="column.key === 'interval'" :object="point as PointRow" point compact />
          <RuntimeCardMetrics v-else-if="column.key === 'monitoring'" :object="point as PointRow" kind="point" />
        </template>
      </a-table>
      <a-empty v-if="!points.length" :description="$t('collectorWorkspace.noPoints')" :image="Empty.PRESENTED_IMAGE_SIMPLE" />
    </div>
    <div class="cw-editor-slot"><slot name="editor" /></div>
  </div>
</template>
<script setup lang="ts">
import { Empty, type TableColumnsType } from 'ant-design-vue'
import { computed, ref } from 'vue'
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
const emit = defineEmits<{ select: [id: string]; diagnose: [point: PointRow]; diagnosticVisibility: [point: PointRow, visible: boolean]; check: [id: string]; checks: [ids: string[]] }>()
const root = ref<HTMLElement>()
const tableScrollContainer = () => root.value?.closest<HTMLElement>('.cw-main') || window
const customRow = (point: PointRow) => ({ onClick: (event: MouseEvent) => {
  if (!(event.target as Element).closest('button,a,input,label,.ant-table-selection-column')) emit('select', point.id)
} })
const rowSelection = computed(() => ({ columnWidth: 40, fixed: true, selectedRowKeys: props.selection.keys, onChange: (keys: (string | number)[]) => emit('checks', keys.map(String)), getCheckboxProps: (point: PointRow) => ({ disabled: props.selection.busy || point.id.startsWith('_new:') }) }))
const pointValue = (point:PointRow) => point.latest && ('parsedData' in point.latest ? point.latest.parsedData : point.latest.parseData)
const reading = (point: PointRow) => {
  const state = stateValue(objectDisplayState(point))
  const empty = ['disabled', 'paused', 'stopped'].includes(state)
    ? t(state === 'disabled' ? 'collectorWorkspace.disabled' : `collectorRuntime.states.${state}`)
    : t(`collectorMonitoring.empty.${point.runtime?.available === false ? 'unavailable' : point.runtime?.currentFailure ? 'readFailed' : point.monitoring?.filteredTotal && point.monitoring.outputTotal === 0 ? 'filteredData' : 'waitingData'}`)
  return formatPointValue(pointValue(point), empty)
}
const timestamp = (point: PointRow) => point.latest?.timestamp ? dayjs(point.latest.timestamp).format('HH:mm:ss') : ''
// Units are descriptive metadata, never inferred from a codec identifier.
const unit = (point: PointRow) => point.metadata?.dataType?.unit || ''
const { t } = useI18n()
const columns = computed<TableColumnsType<PointRow>>(() => [
  { key: 'name', title: t('collectorWorkspace.name'), width: 180, fixed: 'left' },
  { key: 'value', title: t('collectorWorkspace.value'), width: 200 },
  { key: 'state', title: t('collectorWorkspace.state'), width: 128 },
  { key: 'interval', title: t('collectorMonitoring.scheduledInterval'), width: 168 },
  { key: 'monitoring', title: t('collectorMonitoring.monitoring'), width: 180 },
])
</script>
