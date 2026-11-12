<template>

  <DefineEmptyCreate>
    <a-button type="link" :disabled="initLoading || saveLoading" @click="addItem">{{ $t('DataCollect.index.400152-1') }}</a-button>
  </DefineEmptyCreate>
  <div>
    <div class="header">
      <TitleComponent :data="$t('DataCollect.index.400152-0')"/>
      <a-space>
        <EmptyCreateButton />
        <a-button :disabled="initLoading || saveLoading" @click="batchImportVisible = true">{{ $t('DataCollect.index.400152-2') }}</a-button>
        <a-button type="primary" :loading="saveLoading" :disabled="initLoading" @click="handleSave">
          {{ $t('DataCollect.index.400152-3') }}
        </a-button>
      </a-space>
    </div>
    <a-alert v-if="loadFailed" type="error" show-icon :message="$t('PointWorkspace.loadFailed')">
      <template #action><a-button type="link" @click="initDataSource">{{ $t('PointWorkspace.retry') }}</a-button></template>
    </a-alert>
    <a-spin :spinning="deviceListLoading || initLoading || saveLoading">
      <a-table
          :dataSource="_dataSource"
          :columns="columns"
          :pagination="false"
          rowKey="__key"
          :scroll="{ y: 500 }"
      >
        <template #emptyText>
          <CloudEmpty :search-name="$t('data.RoleData.950813-22')">
            <EmptyCreateButton />
          </CloudEmpty>
        </template>
        <template #bodyCell="{ column, record, index }">
          <template v-if="column.dataIndex === 'id'">
            {{ record.id || $t('comm.table.empty') }}
          </template>
          <template v-else-if="column.dataIndex === 'name'">
            <a-select
                v-model:value="record.id"
                style="width: 100%;"
                show-search
                allow-clear
                :options="deviceOptions"
                :filter-option="filterOption"
                :placeholder="$t('DataCollect.index.400152-20')"
                @change="(value, option) => onDeviceChange(record, value, option)"
            />
          </template>
          <template v-else-if="column.dataIndex === 'metadataId'">
            <div class="property-cell">
              <a-select
                  v-model:value="record.createMode"
                  class="mode-select"
                  :options="createModeOptions"
                  @change="(value) => onCreateModeChange(record, value)"
              />
              <a-select
                  v-if="record.createMode === 'manual'"
                  v-model:value="record.metadataId"
                  class="property-select"
                  allow-clear
                  show-search
                  :filter-option="filterOption"
                  :options="getPropertyOptions(record)"
                  :placeholder="$t('DataCollect.index.400152-21')"
                  :disabled="!record.id"
              />
              <a-input
                  v-else
                  v-model:value="record.metadataId"
                  class="property-select"
                  :placeholder="$t('DataCollect.index.400152-22')"
              />
            </div>
          </template>
          <template v-else-if="column.dataIndex === 'actions'">
            <j-permission-button
                :tooltip="{
                  title: $t('Scan.Table.400147-9'),
                }"
                :popConfirm="{
                  title: $t('Scan.Table.400147-10'),
                  onConfirm: () => removeItem(record, index),
                }"
                danger
                type="link"
            >
              <AIcon type="DeleteOutlined"/>
            </j-permission-button>
          </template>
        </template>
      </a-table>
    </a-spin>
  </div>
  <BatchImport
      v-if="batchImportVisible"
      @close="batchImportVisible = false"
      @save="handleBatchImport"
      :downloadUrlBuilder="downloadPointRelatedDevicesTemplate"
      :request="getImportRequest"
      :message="$t('DataCollect.index.400152-7')"
  >
    <template #content>
      {{ $t('DataCollect.index.400152-8') }}
      <a-tooltip :title="$t('DataCollect.index.400152-9')">
        <AIcon type="QuestionCircleOutlined"/>
      </a-tooltip>
      <a-switch v-model:checked="importAutoCreate" style="margin-left: 12px"/>
    </template>
  </BatchImport>
</template>

<script setup lang="ts">
import { createReusableTemplate } from '@vueuse/core'
import { usePointRelatedDevices } from './usePointRelatedDevices'
const { $t, initDataSource, loadFailed, _dataSource, batchImportVisible, importAutoCreate, deviceListLoading, initLoading, saveLoading, deviceOptions, deviceCache, columns, createModeOptions, filterOption, getPropertyOptions, onDeviceChange, onCreateModeChange, getImportRequest, handleBatchImport, handleSave, addItem, removeItem, downloadPointRelatedDevicesTemplate, flush, isDirty, discard } = usePointRelatedDevices()
const [DefineEmptyCreate, EmptyCreateButton] = createReusableTemplate()
defineExpose({ flush, isDirty, discard })
</script>

<style lang="less" scoped>
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.property-cell {
  display: flex;
  gap: 12px;
  width: 100%;

  .mode-select {
    width: 140px;
    flex-shrink: 0;
  }

  .property-select {
    flex: 1;
    min-width: 0;
  }
}
</style>
