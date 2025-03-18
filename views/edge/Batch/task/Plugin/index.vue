<template>
  <div class="task-warp">
    <div class="header">
      {{ $t('Plugin.index.879212-0') }}
    </div>
    <div class="tip">
      <AIcon class="icon" type="ExclamationCircleFilled" />{{ $t('Plugin.index.879212-1') }}
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
        terms: [
          {
            column: 'targetType',
            value: 'PluginDriver'
          }
          ,{column: 'state', value: 'enabled'}
        ]
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

<script setup name="TaskPlugin">
import { query } from '../../../../../api/edge/resource';
import { pick } from 'lodash-es'
import {useTemplateRowSelection} from "../../util";
import { useI18n } from 'vue-i18n';

const { t: $t } = useI18n();

const params = ref()

const { selectedRowKeys, selectedRowMap, onSelectChange, selectAll, selectNone } = useTemplateRowSelection()

const columns = [
  {
    title: $t('Plugin.index.879212-2'),
    key: 'targetId',
    dataIndex: 'targetId',
    search: {
      type: 'string',
    },
    ellipsis: true,
  },
  {
    title: $t('Plugin.index.879212-3'),
    key: 'name',
    dataIndex: 'name',
    search: {
      type: 'string',
    },
    ellipsis: true,
  },
  {
    title: $t('Plugin.index.879212-4'),
    key: 'file',
    dataIndex: 'file',
    ellipsis: true,
  },
  {
    title: $t('Plugin.index.879212-5'),
    dataIndex: 'description',
    key: 'description',
    ellipsis: true,
  },
  {
    title: $t('Plugin.index.879212-6'),
    key: 'id',
    dataIndex: 'id',
    ellipsis: true,
    search: {
      type: 'string',
    },
  },
]
const queryFn = async (_params) => {

  const resp = await query(_params)
  return {
    status: resp.status,
    code: resp.status,
    success: resp.success,
    result: {
      ...resp.result,
      data: resp.result.data?.map(item => {
        const _metadata = JSON.parse(item.metadata)
        item.file = _metadata.filename
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
      data: pick(item, ['id', 'targetId', 'metadata', 'targetType', 'serviceId', 'name'])
    }
  })
}

const handleSearch = (e) => {
  params.value = e
}

defineExpose({
  getValue: handleValue
})
</script>

<style scoped lang="less">
@import "../task.less";
</style>
