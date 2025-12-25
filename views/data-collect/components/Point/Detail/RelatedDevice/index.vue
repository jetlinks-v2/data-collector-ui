<template>
  <div>
    <div class="header">
      <TitleComponent data="关联设备"/>
      <a-space>
        <a-button type="link" @click="addItem">新增</a-button>
        <a-button @click="batchImportVisible = true">批量新增</a-button>
        <a-button type="primary">保存</a-button>
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
      message="1. 若设备下不存在匹配的属性ID,则自动跳过该条数据 2. 若需自动创建物模型并与当前点位映射,请在上传文件前启用该选项,上传后再修改将无效"
  >
    <template #content>
      根据数采点位自动创建物模型
      <a-tooltip title="若无对应物模型,则自动创建物模型并映射">
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
    title: '关联设备ID',
    dataIndex: 'id',
    ellipsis: true,
  },
  {
    title: '关联设备名称',
    dataIndex: 'name',
    ellipsis: true,
  },
  {
    title: '关联属性',
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
