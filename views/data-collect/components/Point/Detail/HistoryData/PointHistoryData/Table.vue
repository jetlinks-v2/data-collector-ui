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
        :request="(e) => queryPointHistory(info?.collectorId, {...e, terms: [...e.terms, {column: 'timestamp', value: [time.start, time.end], termType: 'btw'}, {column: 'pointId', value: info?.id}]})"
        :defaultParams="{
            sorts: [{ name: 'timestamp', order: 'desc' }],
        }"
        :scroll="{y: 300}"
        :params="params"
        style="padding: 0; margin: 0"
    >
      <template #timestamp="slotProps">
        {{ dayjs(slotProps.timestamp).format('YYYY-MM-DD HH:mm:ss') }}
      </template>
      <template #numberValue="slotProps">
        {{ !isNil(slotProps.numberValue) ? slotProps.numberValue : '--' }}
      </template>
      <template #reason="slotProps">
        {{reason[slotProps.reason] || slotProps.slotProps || "--"}}
      </template>
      <template #action="slotProps">
        <a-button type="link">
          <AIcon type="SearchOutlined"/>
        </a-button>
      </template>
    </j-pro-table>
  </div>
</template>

<script setup>
import {queryPointHistory} from "@data-collector-ui/api/data-collect/collector";
import dayjs from "dayjs";
import { isNil } from "lodash-es";
import {useI18n} from "vue-i18n";

const {t: $t} = useI18n();

const props = defineProps({
  time: {
    type: Object,
    default: () => {}
  }
})

const reason = {
  outlier: '异常数据',
  deadband: '死区数据',
  normal: '正常变化数据'
}
const columns = [
  {
    title: $t('DataCollect.index.400151-52'),
    dataIndex: 'timestamp',
    width: 200,
    search: {
      type: 'date',
    },
    scopedSlots: true,
  },
  {
    title: $t('DataCollect.index.400151-53'),
    dataIndex: 'value',
    ellipsis: true
  },
  {
    title: $t('DataCollect.index.400151-54'),
    dataIndex: 'numberValue',
    ellipsis: true,
    scopedSlots: true
  },
  {
    title: '类型',
    dataIndex: 'reason',
    ellipsis: true,
    search: {
      type: 'select',
      options: [
        {label: '异常数据', value: 'outlier'},
        {label: '死区数据', value: 'deadband'},
        {label: '正常变化数据', value: 'normal'},
      ]
    },
    scopedSlots: true,
  },
  {
    title: $t('DataCollect.index.400151-55'),
    dataIndex: 'action',
    width: 100,
    scopedSlots: true,
  },
]
const tableRef = ref()

const info = inject('point-info')

const params = ref({})

const handleSearch = (e) => {
  params.value = e
}

watch(() => props.time, (newVal) => {
  tableRef.value?.reload()
})
</script>

<style lang="less" scoped>

</style>
