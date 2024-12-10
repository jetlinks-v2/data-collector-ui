<template>
  <a-drawer
    visible
    :title="$t('log.Detail.389002-0')"
    :width="1000"
    :maskClosable="false"
    @close="onCancel"
  >
    <template #title>
      <div class="title">
        <div>

        </div>
        <div>
          {{ record.title }}
        </div>
        <div>

        </div>

      </div>
    </template>
    <div class="log-detail-body">
      <div @click="onCopy">{{ $t('log.Detail.389002-1') }}</div>
      <div>
        <TitleComponent :title="$t('log.Detail.389002-2')" />
        <a-descriptions bordered>
          <a-descriptions-item :label="$t('log.Detail.389002-3')" :labelStyle="{width: '110px'}"></a-descriptions-item>
          <a-descriptions-item :label="$t('log.Detail.389002-4')" :labelStyle="{width: '110px'}"></a-descriptions-item>
          <a-descriptions-item :label="$t('log.Detail.389002-0')" :labelStyle="{width: '110px'}">
            <a-button type="link" @click="emit('showTaskDetail')">{{ $t('log.Detail.389002-5') }}</a-button>
          </a-descriptions-item>
          <a-descriptions-item :label="$t('log.Detail.389002-6')" :labelStyle="{width: '110px'}"></a-descriptions-item>
          <a-descriptions-item :label="$t('log.Detail.389002-7')" :labelStyle="{width: '110px'}"></a-descriptions-item>
          <a-descriptions-item :label="$t('log.Detail.389002-8')" :labelStyle="{width: '110px'}"></a-descriptions-item>
          <a-descriptions-item :label="$t('log.Detail.389002-9')" :labelStyle="{width: '110px'}"></a-descriptions-item>
          <a-descriptions-item :label="$t('log.Detail.389002-10')" :labelStyle="{width: '110px'}"></a-descriptions-item>
        </a-descriptions>
      </div>
      <div>
        <TitleComponent :title="$t('log.Detail.389002-11')" />
        <JProTable
          model="TABLE"
          :columns="gatewayColumns"
          :request="query"
        />
      </div>
      <div>
        <TitleComponent :title="$t('log.Detail.389002-12')" />
        <JProTable
          model="TABLE"
          :columns="pluginColumns"
          :request="query"
        />
      </div>
    </div>
  </a-drawer>
</template>

<script setup name="LogDrawer">
import { useI18n } from 'vue-i18n';

const { t: $t } = useI18n();
const props = defineProps({
  record: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits(['showTaskDetail', 'copy', 'cancel'])

const gatewayColumns = [
  {
    title: $t('log.Detail.389002-13'),
    dataIndex: 'name',
  },
  {
    title: $t('log.Detail.389002-14'),
    dataIndex: 'type',
  },
  {
    title: $t('log.Detail.389002-15'),
    dataIndex: 'status',
    width: 120
  },
]

const pluginColumns = [
  {
    title: $t('log.Detail.389002-16'),
    dataIndex: 'id',
  },
  {
    title: $t('log.Detail.389002-17'),
    dataIndex: 'name',
  },
  {
    title: $t('log.Detail.389002-18'),
    dataIndex: 'type',
  },
  {
    title: $t('log.Detail.389002-19'),
    dataIndex: 'file',
  },
  {
    title: $t('log.Detail.389002-20'),
    dataIndex: 'version',
  },
  {
    title: $t('log.Detail.389002-21'),
    dataIndex: 'describe',
  },
]

const query = () => {
  return {}
}

const onCopy = () => {
  emit('copy')
  emit('cancel')
}

const onCancel = () => {
  emit('cancel')
}

</script>

<style scoped>

</style>
