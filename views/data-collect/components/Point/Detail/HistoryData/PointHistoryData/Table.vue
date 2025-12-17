<template>
  <div>
    <pro-search
        :columns="columns"
        target="data-collector-point-history-data"
        @search="handleSearch"
        style="margin-bottom: 0; padding: 16px 0"
        type="simple"
    />
    <j-pro-table
        ref="tableRef"
        :columns="columns"
        mode="TABLE"
        :request="queryPoint"
        :defaultParams="{
            sorts: [{ name: 'createTime', order: 'desc' }],
        }"
        :params="params"
        style="padding: 0; margin: 0"
    >
    </j-pro-table>
  </div>
</template>

<script setup>
import {queryPoint} from "@data-collector-ui/api/data-collect/collector";

const columns = [
  {
    title: '时间',
    dataIndex: 'createTime',
    width: 200,
    search: {
      type: 'date',
    }
  },
  {
    title: '点位值',
    dataIndex: 'value',
    ellipsis: true
  },
  {
    title: '原始值',
    dataIndex: 'originValue',
    ellipsis: true
  },
  {
    title: '类型',
    dataIndex: 'type',
    ellipsis: true
  },
  {
    title: '操作',
    dataIndex: 'action',
    width: 100,
  },
]


const params = ref({})

const handleSearch = (e) => {
  params.value = e
}
</script>

<style lang="less" scoped>

</style>
