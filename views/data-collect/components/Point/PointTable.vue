<template>
  <section class="point-workspace">
    <div class="point-workspace__toolbar">
      <ConditionFilter class="point-workspace__search" :fields="pointSearchFields" v-model="searchTerms"
        :placeholder="$t('PointWorkspace.searchPoints')" @change="search" />
      <PointTop ref="pointTopRef" class="point-workspace__status-filter" />
      <div class="point-workspace__actions">
        <template v-if="state.scopeType === 'collector'">
          <j-permission-button v-if="actions.pointActions.add" type="primary" :has-permission="true" @click="actions.add">
            <AIcon type="PlusOutlined" /> {{ $t('Point.index.400149-0') }}
          </j-permission-button>
          <j-permission-button v-if="actions.pointActions.scan" type="primary" :has-permission="true" @click="actions.scan">
            <AIcon type="ScanOutlined" /> {{ $t('data-collector-ui.index.237811-1') }}
          </j-permission-button>
          <j-permission-button :has-permission="true" @click="actions.exportData">{{ $t('Point.index.400149-3') }}</j-permission-button>
        </template>
        <BatchDropdown :actions="actions.batchActions.value" />
      </div>
    </div>
    <a-alert v-if="failed" type="error" show-icon :message="$t('PointWorkspace.loadFailed')">
      <template #action><a-button type="link" @click="reload">{{ $t('PointWorkspace.retry') }}</a-button></template>
    </a-alert>
    <div ref="viewport" class="point-workspace__table">
      <j-pro-table mode="TABLE" size="small" table-layout="fixed" row-key="id" :columns="columns" :data-source="rows" :no-pagination="true"
        :loading="loading" :alert-show="false" :row-selection="rowSelection"
        :scroll="{ x: tableWidth, y: bodyHeight }" :body-style="{ padding: 0 }" @resize-column="resizeColumn">
        <template #emptyText><CloudEmpty :search="hasSearch" :search-name="$t('Virtual.Editor.400159-0')" /></template>
        <template #headerCell="{ column }">
          <div v-if="column.sortsList" class="point-workspace__sort">
            <span>{{ column.title }}</span>
            <a-popover trigger="click">
              <template #content>
                <a-menu @click="({ key }) => sort(column.key, String(key))">
                  <a-menu-item v-for="item in column.sortsList" :key="item.value">{{ item.text }}</a-menu-item>
                </a-menu>
              </template>
              <SortsIcon :value="state.sort === column.key ? state.order : undefined" />
            </a-popover>
          </div>
          <div v-else-if="column.key === 'action'" class="point-workspace__action-header">
            <span>{{ column.title }}</span>
            <a-tooltip :title="$t('DataCollect.index.400151-16')">
              <a-button type="text" size="small" :aria-label="$t('DataCollect.index.400151-16')" @click.stop="columnsVisible = true">
                <AIcon type="SettingOutlined" />
              </a-button>
            </a-tooltip>
          </div>
        </template>
        <template #name="record">
          <div class="point-workspace__name">
            <a @click="actions.view(record)"><j-ellipsis>{{ record.name }}</j-ellipsis></a>
          </div>
        </template>
        <template #runningState="record">
          <a-badge class="point-workspace__status"
            :status="ChannelState[record.state?.value === 'disabled' ? 'stopped' : record.runningState?.value] || 'default'"
            :text="record.state?.value === 'disabled' ? record.state?.text : record.runningState?.text" />
        </template>
        <template #value="record"><div class="point-workspace__value"><ValueItem :value="propertyValue.get(record.id)" :data="record" /></div></template>
        <template #modifyTime="record">{{ record.modifyTime != null ? dayjs(record.modifyTime).format('YYYY-MM-DD HH:mm:ss') : '—' }}</template>
        <template #address="record"><j-ellipsis><code class="point-workspace__address">{{ record.address ?? '—' }}</code></j-ellipsis></template>
        <template #accessModes="record">{{ record.accessModes?.map((item: { text: string }) => item.text).join(' / ') || '—' }}</template>
        <template #interval="record">{{ record.interval != null ? record.interval + ' ms' : '—' }}</template>
        <template #description="record"><j-ellipsis>{{ record.description || '—' }}</j-ellipsis></template>
        <template #action="record">
          <a-space>
            <j-permission-button type="link" size="small" :has-permission="true" :disabled="actions.editing.value"
              :tooltip="{ title: $t('Channel.index.290640-13') }" @click="actions.edit(record)"><AIcon type="EditOutlined" /></j-permission-button>
            <j-permission-button type="link" size="small" danger :has-permission="true"
              :tooltip="{ title: $t('Channel.index.290640-16') }"
              :pop-confirm="{ title: $t('DataCollect.utils.400158-2'), onConfirm: () => actions.remove(record) }"><AIcon type="DeleteOutlined" /></j-permission-button>
          </a-space>
        </template>
      </j-pro-table>
    </div>
    <footer class="point-workspace__footer">
      <div v-if="selectedKeys.length" class="point-workspace__selection">
        <span>{{ all ? $t('PointWorkspace.allSelected') : $t('PointWorkspace.selected', { count: selectedKeys.length }) }}</span>
        <a-button type="link" size="small" @click="toggleAll">{{ $t(all ? 'PointTable.index.40014110-0' : 'PointTable.index.40014110-1') }}</a-button>
      </div>
      <div class="point-workspace__pagination">
        <span>{{ $t('PointWorkspace.total', { total }) }}</span>
        <a-pagination :current="current" :page-size="pageSize" :total="total" show-size-changer show-less-items
          :page-size-options="['10', '20', '50', '100']" @change="changePage" />
      </div>
    </footer>
  </section>
  <ColumnsConfig v-if="columnsVisible" :data="columns" :collector-data="actions.scope.value"
    @close="columnsVisible = false" @save="saveColumns" />
  <Save v-if="actions.visible.save" :data="actions.current.value" :collector="actions.formCollector.value"
    @close="actions.visible.save = false" @save="actions.saved" />
  <Import v-if="actions.visible.import"
    :download-url-builder="(format: string) => actions.exportTemplate(actions.scope.value.provider || '', format)"
    :request="() => actions.pointImport(actions.scope.value.id || '', actions.scope.value.provider || '')"
    @close="actions.visible.import = false" @save="actions.saved" />
  <BatchUpdate v-if="actions.visible.batchUpdate" :data="selectedRows" :provider="actions.scope.value.provider"
    :is-all-selected="all" :get-batch-params="actions.getBatchParams"
    @close="actions.visible.batchUpdate = false" @save="actions.visible.batchUpdate = false; actions.saved()" />
  <RenderComponents v-if="actions.jsonData.value" :value="actions.jsonData.value" />
</template>
<script setup lang="ts">
import { computed, ref } from 'vue'
import dayjs from 'dayjs'
import { useI18n } from 'vue-i18n'
import ConditionFilter from '@jetlinks-web-core/components/ConditionFilter'
import BatchDropdown from '@jetlinks-web-core/components/BatchDropdown/index.vue'
import RenderComponents from '@data-collector-ui/components/RenderComponents'
import { ChannelState } from '../../data'
import PointTop from './PointTop.vue'
import SortsIcon from './SortsIcon.vue'
import ColumnsConfig from './ColumnsConfig/index.vue'
import ValueItem from './components/ValueItem.vue'
import Save from './Save/index.vue'
import Import from '../Import/index.vue'
import BatchUpdate from './components/BatchUpdate.vue'
import { defaultPointColumns, pointActionColumn, pointSearchFields } from './columns'
import { usePointList } from './usePointList'
import { usePointSearch } from './usePointSearch'
import { usePointSelection } from './usePointSelection'
import { usePointActions } from './usePointActions'
import { usePointTableSize } from './usePointTableSize'
const { t: $t } = useI18n()
const { rows, state, total, current, pageSize, loading, failed, reload, changePage, queryKey, acceptedQuery, propertyValue, hasSearch } = usePointList()
const selection = usePointSelection(rows, queryKey)
const { all, selectedRows, selectedKeys, rowSelection, toggleAll } = selection
const actions = usePointActions(selection, acceptedQuery, rows)
const { viewport, bodyHeight } = usePointTableSize()
const pointTopRef = ref<InstanceType<typeof PointTop>>()
const columns = ref<any[]>(defaultPointColumns())
// 按可见列分配表格宽度，让长地址在单元格内省略，不反向撑大整页。
const tableWidth = computed(() => columns.value.reduce((width, column) => width + (Number(column.width) || 150), 48))
const columnsVisible = ref(false)
const { searchTerms, search } = usePointSearch(state)
function sort(key: string, order: string) {
  state.sort = state.sort === key && state.order === order ? '' : key
  state.order = order === 'asc' ? 'asc' : 'desc'
  state.page = 1
}
function resizeColumn(width: number, column: { key: string }) {
  columns.value = columns.value.map(item => item.key === column.key ? { ...item, width } : item)
}
function saveColumns(value: any[]) { columns.value = [...value.filter(item => item.key !== 'action'), pointActionColumn]; columnsVisible.value = false }
const loadData = async () => { await Promise.all([pointTopRef.value?.loadData(), reload()]) }
defineExpose({ loadData })
</script>
<style scoped>
.point-workspace { display: flex; flex-direction: column; gap: var(--space-3); flex: 1; min-width: 0; min-height: 0; }
.point-workspace__toolbar, .point-workspace__actions, .point-workspace__footer,
.point-workspace__selection, .point-workspace__pagination { display: flex; align-items: center; gap: var(--space-3); flex-wrap: wrap; }
.point-workspace__actions, .point-workspace__pagination { margin-left: auto; }
.point-workspace__actions { justify-content: flex-end; min-width: 0; }
.point-workspace__search { flex: 1 1 20rem; min-width: 12rem; }
.point-workspace__status-filter { display: flex; flex-wrap: wrap; max-width: 100%; }
.point-workspace__table { flex: 1; min-height: 10rem; min-width: 0; overflow: hidden; }
.point-workspace__table :deep(.j-pro-table) { padding: 0; height: 100%; }
.point-workspace__name { display: flex; align-items: center; gap: var(--space-2); min-width: 0; }
.point-workspace__name > a { min-width: 0; max-width: 100%; color: var(--jet-theme-primary); font-size: var(--fs-14); }
.point-workspace__name > a:hover { color: var(--jet-theme-primary); }
.point-workspace__status { white-space: nowrap; }
.point-workspace__status :deep(.ant-badge-status-text) { margin-inline-start: var(--space-1); font-size: var(--fs-12); }
.point-workspace__value :deep(.value) { flex: 1; min-width: 0; line-height: 18px; }
.point-workspace__value :deep(.value > :last-child) { color: var(--jet-theme-text-secondary); font-size: var(--fs-12); }
.point-workspace__address { padding: 0 var(--space-2); border-radius: var(--r-2); background: var(--bg-hover); color: var(--jet-theme-text-secondary); }
.point-workspace__sort { display: flex; justify-content: space-between; gap: var(--space-2); }
.point-workspace__action-header { display: flex; align-items: center; justify-content: space-between; gap: var(--space-2); white-space: nowrap; }
.point-workspace__footer { color: var(--jet-theme-text-secondary); font-size: var(--fs-13); flex: none; padding-top: var(--space-3); border-top: 1px solid var(--jet-theme-border-secondary); }
</style>
