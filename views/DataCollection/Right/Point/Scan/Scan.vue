<script setup name="ScanPoint">
import Tree from './Tree.vue'
import Table from './Table.vue'
import { useI18n } from 'vue-i18n';
import { ScanContextKey } from './useScan'
import {onlyMessage} from "@jetlinks-web/utils";
import { savePointBatch } from '@collector/api/data-collect/collector';
import { useRequest } from '@jetlinks-web/hooks'

const emit = defineEmits(['cancel', 'ok'])
const { t: $t } = useI18n();
const dataSource = ref([])
const selectKeys = ref(new Set())
const tableRef = ref()

const { loading, run } = useRequest(savePointBatch, {
  immediate: false,
  onSuccess(resp) {
    emit('change', resp.status === 200)
  }
})

provide(ScanContextKey, {
  dataSource,
  selectKeys
})

const onCancel = () => {
  emit('cancel')
}

const onOk = () => {
  if (dataSource.value.length) {

    run(dataSource.value)
  } else {
    onlyMessage($t('Scan.index.400148-3'), 'error')
  }
}
</script>

<template>
  <a-modal
    visible
    width="90%"
    :title="$t('Scan.index.400148-0')"
    :maskClosable="false"
    :keyboard="false"
    :confirm-loading="loading"
    @cancel="onCancel"
    @ok="onOk"
  >
    <div class="scan-content">
      <Tree />
      <Table />
    </div>
  </a-modal>
</template>

<style scoped lang="less">
.scan-content {
  display: flex;
  gap: 1rem;
}
</style>
