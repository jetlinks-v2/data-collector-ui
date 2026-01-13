<template>
  <div>
    <div class="header">
      <TitleComponent :data="$t('DataCollect.index.400152-0')"/>
      <a-space>
        <a-button type="link" @click="addItem">{{ $t('DataCollect.index.400152-1') }}</a-button>
        <a-button @click="batchImportVisible = true">{{ $t('DataCollect.index.400152-2') }}</a-button>
        <a-button type="primary">{{ $t('DataCollect.index.400152-3') }}</a-button>
      </a-space>
    </div>
    <j-edit-table
        ref="tableRef"
        :dataSource="_dataSource"
        :serial="false"
        :columns="columns"
        :height="500"
    >
      <template
          v-for="item in columns.filter(item => item.dataIndex !== 'actions')"
          :key="item.dataIndex"
          v-slot:[item.dataIndex]="{ record, index }"
      >
        <template v-if="item.dataIndex !== 'property'">
          {{ record[item.dataIndex] || '--' }}
        </template>
        <j-edit-table-form-item v-else :name="[index, item.dataIndex]">
          <a-input/>
        </j-edit-table-form-item>
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
  </div>
  <!--  :downloadUrlBuilder="downloadDeviceAssetsImportTemplate_api"
        :request="(fileUrl) => importDeviceAssets_api(parentId, fileUrl)"-->
  <BatchImport
      v-if="batchImportVisible"
      @close="batchImportVisible = false"
      @save="handleBatchImport"
      :message="$t('DataCollect.index.400152-7')"
  >
    <template #content>
      {{ $t('DataCollect.index.400152-8') }}
      <a-tooltip :title="$t('DataCollect.index.400152-9')">
        <AIcon type="QuestionCircleOutlined"/>
      </a-tooltip>
      <a-switch style="margin-left: 12px"/>
    </template>
  </BatchImport>
</template>

<script setup>
import {useI18n} from "vue-i18n";

const {t: $t} = useI18n();
const _dataSource = ref([])
const batchImportVisible = ref(false)

const columns = [
  {
    title: $t('DataCollect.index.400152-4'),
    dataIndex: 'id',
    ellipsis: true,
  },
  {
    title: $t('DataCollect.index.400152-5'),
    dataIndex: 'name',
    ellipsis: true,
  },
  {
    title: $t('DataCollect.index.400152-6'),
    dataIndex: 'property',
    template: {
      components: 'a-input',
      props: {
        allowClear: true
      },
      check: false
    },
    ellipsis: true,
    form: {
      required: true,
    }
  },
  {
    key: 'actions',
    title: $t('Collector.data.400141-40'),
    dataIndex: 'actions',
    width: 80
  }
]


const handleBatchImport = () => {

}
const addItem = () => {
  _dataSource.value.push({
    id: '',
    name: '',
    property: ''
  })
}
const removeItem = (dt, index) => {
  _dataSource.value.splice(index, 1)
}
</script>

<style lang="less" scoped>
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
</style>
