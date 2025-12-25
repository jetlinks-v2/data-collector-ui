<template>
  <div>
    <pro-search
        :columns="columns"
        target="alarm"
        type="simple"
        @search="handleSearch"
        style="padding: 0"
    />
    <j-pro-table
        ref="tableRef"
        mode="TABLE"
        :columns="columns"
        :request="query"
        :params="params"
        :defaultParams="{
              sorts: [{ name: 'createTime', order: 'desc' }]
          }"
        style="padding: 0"
    >
      <template #action>
        <a-button type="link">
          查看详情
        </a-button>
      </template>
    </j-pro-table>
  </div>
</template>

<script setup>
import {query} from "@data-collector-ui/api/data-collect/channel";

const columns = [
  {
    title: '告警时间',
    dataIndex: 'alarmTime',
    key: 'alarmTime',
    search: {
      type: 'string'
    }
  },
  {
    title: '触发条件',
    dataIndex: 'triggerDesc',
    key: 'triggerDesc',
  },
  {
    title: '告警原因',
    dataIndex: 'actualDesc',
    key: 'actualDesc',
  },
  {
    title: '操作',
    dataIndex: 'action',
    key: 'action',
    width: 120,
    scopedSlots: true
  }
]

const params = ref({})

const handleSearch = () => {

}
</script>

<style lang="less" scoped>

</style>
