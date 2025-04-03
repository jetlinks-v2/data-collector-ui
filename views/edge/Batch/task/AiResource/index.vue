<template>
  <div class="task-warp">
    <div class="header">
      {{ $t('AiResource.index.967858-0') }}
    </div>
    <div class="tip">
      <AIcon class="icon" type="ExclamationCircleFilled" />{{ $t('AiResource.index.967858-1') }}
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
        terms: [{column: 'targetType', value: 'PluginDriver'},{column: 'state', value: 'enabled'}]
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

<script setup name="AiResource">
import { queryPage } from '../../../../../api/edge/newResource'
import {useTemplateRowSelection} from '../../util'
import { useI18n } from 'vue-i18n';

const { t: $t } = useI18n();

const params = ref()
const { selectedRowKeys, selectedRowMap, onSelectChange, selectAll, selectNone } = useTemplateRowSelection()

const columns = [
  {
    title: $t('AiResource.index.967858-2'),
    key: 'id',
    dataIndex: 'id',
    search: {
      type: 'string',
    },
  },
  {
    title: $t('AiResource.index.967858-3'),
    key: 'name',
    dataIndex: 'name',
    search: {
      type: 'string',
    },
    ellipsis: true,
  },
  {
    title: $t('AiResource.index.967858-4'),
    key: 'type',
    dataIndex: 'type',
    search: {
      type: 'string',
    },
    ellipsis: true,
  },
  {
    title: $t('AiResource.index.967858-5'),
    key: 'file',
    dataIndex: 'file',
    ellipsis: true,
  },
  {
    title: $t('AiResource.index.967858-6'),
    key: 'version',
    dataIndex: 'version',
  },
  {
    title: $t('AiResource.index.967858-7'),
    dataIndex: 'description',
    key: 'description',
    ellipsis: true,
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
        item.type = _metadata.provider
        item._metadata = _metadata._metadata
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
