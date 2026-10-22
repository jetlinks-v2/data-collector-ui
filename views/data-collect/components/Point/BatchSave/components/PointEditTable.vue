<template>
  <div class="point-batch-table-editor">
    <div class="point-batch-toolbar">
      <div class="point-batch-toolbar__heading">
        <h2>{{ $t('DataCollect.index.400152-13') }}</h2>
        <span>{{ $t('PointBatch.count', { count: _dataSource.length }) }}</span>
      </div>
      <div class="point-batch-toolbar__actions">
        <slot name="toolbar" />
        <a-button
          v-if="saveContext"
          type="primary"
          :loading="saveContext.saving.value"
          :disabled="!saveContext.ready.value || !_dataSource.length"
          @click="saveContext.save"
        >
          {{ $t('DataCollect.index.400152-3') }}
        </a-button>
      </div>
    </div>
    <div ref="viewport" class="point-batch-table" :style="{ '--point-batch-body-height': `${bodyHeight}px` }">
      <j-edit-table
          ref="tableRef"
          :dataSource="_dataSource"
          :serial="false"
          :columns="_columns"
          :height="bodyHeight"
      >
        <template #emptyText><span /></template>
        <template #headerCell="{ title, column }">
          <slot name="headerCell" :title="title" :column="column">{{title}}</slot>
          <span
              v-if="column.form?.required"
              class="header-cell-required"
          >
          *
        </span>
        </template>
        <template
            v-for="item in columns"
            :key="item.dataIndex"
            v-slot:[item.dataIndex]="{ record, index }"
        >
          <j-edit-table-form-item :name="[index, item?.form?.name || item.dataIndex]">
            <div class="scan-ditto-box">
              <div style="min-width: 0;flex: 1">
                <component
                    v-bind="item.template?.props || {}"
                    :subscribeId="record.id"
                    :is="resolveComponent(item)"
                    :value="getFieldValue(record, item)"
                    :checked="getFieldValue(record, item)"
                    :disabled="index !== 0 && record.sames[item.dataIndex] && item.template?.check !== false"
                    :style="item.template?.components !== 'a-switch' ? { width: '100%' } : {}"
                    @change="(value: unknown) => onFieldChange(value, item, record)"
                />
              </div>
              <a-checkbox
                  v-if="index !== 0 && item.template?.check !== false"
                  class="ditto-checkbox"
                  :checked="record.sames[item.dataIndex]"
                  @change="(e) => onCheckChange(e, item, record)"
              >
                {{ $t('DataCollect.index.400153-0') }}
              </a-checkbox>
            </div>
          </j-edit-table-form-item>
        </template>
        <template #otherConfig="{ record, index }">
          <a @click="showOtherConfig(record)">
            <AIcon type="SettingOutlined"/>
          </a>
        </template>
        <template #actions="{ record, index }">
          <j-permission-button
              :tooltip="{
                title: $t('Scan.Table.400147-9'),
              }"
              :popConfirm="{
                title: $t('Scan.Table.400147-10'),
                onConfirm: () => removeItem(record, index),
              }"
              danger type="link"
          >
            <AIcon type="DeleteOutlined"/>
          </j-permission-button>
        </template>
      </j-edit-table>
      <div v-if="!_dataSource.length" class="point-batch-table__empty" :style="{ top: `${headerHeight}px` }">
        <CloudEmpty :description="$t('PointBatch.empty')" :image-style="{ height: '8rem' }">
          <template #description>
            <div class="point-batch-table__empty-title">{{ $t('PointBatch.empty') }}</div>
            <div>{{ $t('PointBatch.emptyHint') }}</div>
          </template>
        </CloudEmpty>
      </div>
    </div>
  </div>
  <OtherSetting
      v-if="otherConfig.visible"
      :data="otherConfig.data"
      @close="otherConfig.visible = false"
      @save="onSaveOtherConfig"
  />
</template>

<script setup lang="ts">
import { inject, onBeforeUnmount, onMounted } from 'vue'
import type { PropType } from 'vue'
import { useI18n } from 'vue-i18n'
import OtherSetting from './OtherSetting.vue'
import AccessModes from './AccessModes.vue'
import { pointBatchSaveKey } from '../context'
import { usePointEditTable } from './usePointEditTable'
import type { PointBatchColumn, PointBatchRow } from './usePointEditTable'
import { usePointTableSize } from './usePointTableSize'

const { t: $t } = useI18n()
const props = defineProps({
  columns: { type: Array as PropType<PointBatchColumn[]>, default: () => [] },
  dataSource: { type: Array as PropType<PointBatchRow[]>, default: () => [] },
  fieldPathMap: { type: Object as PropType<Record<string, string[]>>, default: () => ({}) },
  sameFieldKey: { type: String, default: 'sames' },
})
const emit = defineEmits<{
  (event: 'update:dataSource' | 'change', rows: PointBatchRow[]): void
  (event: 'checkChange' | 'fieldChange', value: unknown, column: PointBatchColumn, row: PointBatchRow): void
}>()
const {
  dataSource: _dataSource, columns: _columns, tableRef, otherConfig,
  getFieldValue, onCheckChange, onFieldChange, showOtherConfig, onSaveOtherConfig, removeItem, onSave,
} = usePointEditTable(props, emit)
const { viewport, bodyHeight, headerHeight } = usePointTableSize(tableRef)
const saveContext = inject(pointBatchSaveKey, null)
const resolveComponent = (column: PointBatchColumn) => column.template?.components === 'AccessModes'
  ? AccessModes : column.template?.components

// 共享表格向页面报告承载状态，未使用此表格的旧协议由页面保留保存入口。
onMounted(() => { if (saveContext) saveContext.hasTable.value = true })
onBeforeUnmount(() => { if (saveContext) saveContext.hasTable.value = false })
defineExpose({ onSave })
</script>

<style lang="less" scoped>
.point-batch-table-editor {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  height: 100%;
}
.point-batch-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
  padding: 1rem;
  &__heading {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: .75rem;
    min-width: 0;
    h2 { margin: 0; font-size: var(--fs-16, 1rem); font-weight: 600; }
    > span { color: var(--text-color-secondary); }
  }
  &__actions { display: flex; flex-wrap: wrap; align-items: center; gap: .5rem; }
}
.point-batch-table {
  position: relative;
  flex: 1;
  min-height: 10rem;
  min-width: 0;
  margin: 0 1rem 1rem;
  overflow: hidden;
  :deep(.ant-table-body) { height: var(--point-batch-body-height); }
  &__empty {
    position: absolute;
    inset-inline: 0;
    bottom: 0;
    display: grid;
    place-items: center;
    padding: 1rem;
    pointer-events: none;
  }
  &__empty-title { margin-bottom: .5rem; color: var(--text-color); font-weight: 500; }
}

.scan-ditto-box {
  display: flex;
  align-items: center;
  gap: 16px;

  .ditto-grow {
    flex: 1;
    min-width: 0;
  }

  .ditto-checkbox {
    width: 60px;
  }
}
.header-cell-required {
  color: @error-color;
  padding-left: 8px;
  transform: translateY(3px);
  font-weight: 500;
}
</style>
