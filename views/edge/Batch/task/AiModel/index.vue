<template>
  <div class="task-warp">
    <div class="header">
      {{ $t('AiModel.index.311326-0') }}
    </div>
    <div class="tip">
      <AIcon class="icon" type="ExclamationCircleFilled" />{{ $t('AiModel.index.311326-1') }}
    </div>
    <pro-search
      type="simple"
      :columns="columns"
      :style="{ padding: 0, marginBottom: 0 }"
      @search="handleSearch"
    />
    <JProTable
      ref="tableRef"
      mode="TABLE"
      style="padding: 0"
      :columns="columns"
      :request="queryFn"
      :params="params"
      :scroll="{ y: 320}"
      :defaultParams="{
        sorts: [{ name: 'createTime', order: 'desc' }],
        terms: [{column: 'targetType', value: 'AiModel'},{column: 'state', value: 'enabled'}]
      }"
      :rowSelection="{
            selectedRowKeys: selectedRowKeys,
            onSelect: onSelectChange,
            onSelectAll: selectAll,
            onSelectNone: selectNone,
        }"
    />
  </div>
</template>

<script setup name="AiModel">
import { queryPage } from '../../../../../api/edge/newResource'
import {useTemplateRowSelection} from '../../util'
import { useI18n } from 'vue-i18n';

const { t: $t } = useI18n();

const params = ref()
const { selectedRowKeys, selectedRowMap, onSelectChange, selectAll, selectNone } = useTemplateRowSelection()

const columns = [
  {
    title: $t('AiModel.index.311326-2'),
    key: 'targetId',
    dataIndex: 'targetId',
    search: {
      type: 'string',
    },
    ellipsis: true,
  },
  {
    title: $t('AiModel.index.311326-3'),
    key: 'name',
    dataIndex: 'name',
    search: {
      type: 'string',
    },
    ellipsis: true,
  },
  {
    title: $t('AiModel.index.311326-4'),
    key: 'file',
    dataIndex: 'file',
    ellipsis: true,
  },
  {
    title: $t('AiModel.index.311326-5'),
    dataIndex: 'description',
    key: 'description',
    ellipsis: true,
  },
  {
    title: $t('Plugin.index.879212-6'),
    key: 'id',
    dataIndex: 'id',
    search: {
      type: 'string',
    },
    width: 200
  },
]

const handleSearch = (e) => {
  params.value = e
}

const queryFn = async (_params) => {

  const resp = await queryPage(_params)
  return {
    status: resp.status,
    code: resp.status,
    success: resp.success,
    result: {
      ...resp.result,
      data: resp.result.data?.map(item => {
        const _metadata = JSON.parse(item.metadata)
        item.file = item.properties.fileName
        item.description = _metadata.description
        item.type = _metadata.provider
        return item
      }),
    },
  }
}

const handleValue = async () => {
  return [...selectedRowMap.values()].map(item => {
    return {
      data: item
    }
  })
}

defineExpose({
  getValue: handleValue
})
</script>

<style scoped lang="less">
@import "../task.less";
</style>
