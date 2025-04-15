<script setup name="ScanPoint">
import Tree from './Tree.vue'
import Table from './Table.vue'
import { useI18n } from 'vue-i18n';
import { ScanContextKey } from './useScan'

const { t: $t } = useI18n();
const dataSource = ref([])
const selectKeys = ref(new Set())

provide(ScanContextKey, {
  dataSource,
  selectKeys
})

const loading = ref(false)

const onCancel = () => {

}

const onOk = () => {

}
</script>

<template>
  <a-modal
    visible
    width="90%"
    :title="$t('Scan.index.400148-0')"
    :confirm-loading="loaing"
    @cancel="handleCancel"
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
