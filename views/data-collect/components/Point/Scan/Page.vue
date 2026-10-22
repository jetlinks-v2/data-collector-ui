<template>
  <CollectorPointPage :collector="collector" @back="backToList">
    <div v-if="loading" class="point-scan-page-state">
      <a-spin :tip="$t('PointBatch.loading')" />
    </div>
    <div v-else-if="loadFailed" class="point-scan-page-state">
      <a-result status="error" :title="$t('PointBatch.loadFailed')">
        <template #extra><a-button @click="load">{{ $t('PointBatch.retry') }}</a-button></template>
      </a-result>
    </div>
    <ScanContent v-else-if="collector.id" :collector="collector" @saved="backToList" />
  </CollectorPointPage>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import CollectorPointPage from '../CollectorPointPage.vue'
import ScanContent from './index.vue'
import { usePointScanPage } from './usePointScanPage'

const { t: $t } = useI18n()
const { collector, loading, loadFailed, load, backToList } = usePointScanPage()
</script>

<style scoped>
.point-scan-page-state { display: grid; flex: 1; place-items: center; min-height: 16rem; }
</style>
