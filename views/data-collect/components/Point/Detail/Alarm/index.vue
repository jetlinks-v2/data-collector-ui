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
        :request="(e) => queryAlarmLogList(info.id, e)"
        :params="params"
        :defaultParams="{
              sorts: [{ name: 'alarmTime', order: 'desc' }]
          }"
        style="padding: 0"
    >
      <template #alarmTime="slotProps">
        {{
          dayjs(
              slotProps?.lastAlarmTime || slotProps?.alarmTime
          ).format("YYYY-MM-DD HH:mm:ss")
        }}
      </template>
      <template #action="slotProps">
        <a-button type="link" @click="showDetail(slotProps)">
          {{ $t('DataCollect.index.400155-28') }}
        </a-button>
      </template>
    </j-pro-table>
  </div>
  <Detail v-if="data.visible" :data="data.current" @close="data.visible = false"/>
</template>

<script setup>
import {queryAlarmLogList} from "@data-collector-ui/api/data-collect/collector";
import dayjs from "dayjs";
import Detail from './Detail.vue'
import { useI18n } from 'vue-i18n';

const {t: $t} = useI18n();
const info = inject('point-info', ref({}))
const columns = [
  {
    title: $t('DataCollect.index.400155-29'),
    dataIndex: 'alarmTime',
    key: 'alarmTime',
    ellipsis: true,
    scopedSlots: true,
    search: {
      type: 'date'
    }
  },
  {
    title: $t('DataCollect.index.400155-30'),
    dataIndex: 'triggerDesc',
    key: 'triggerDesc',
    ellipsis: true,
    scopedSlots: true,
  },
  {
    title: $t('DataCollect.index.400155-31'),
    dataIndex: 'actualDesc',
    key: 'actualDesc',
    ellipsis: true,
    scopedSlots: true,
    search: {
      type: 'string',
    },
  },
  {
    title: $t('DataCollect.index.400155-32'),
    dataIndex: 'action',
    key: 'action',
    width: 120,
    scopedSlots: true
  }
]

const params = ref({})
const data = reactive({
  visible: false,
  current: {}
})

const showDetail = (_data) => {
  data.visible = true;
  data.current = _data;
};

const handleSearch = (e) => {
  params.value = e
}
</script>

<style lang="less" scoped>

</style>
