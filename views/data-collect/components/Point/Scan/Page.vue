<template>
  <j-page-container :showBack="true">
    <template #title>
      <div class="scan-page__title">
        <j-ellipsis>{{ collector.name }}</j-ellipsis>
        <a-tag>{{ collector.provider }}</a-tag>
        <a-tag>{{ collector.id }}</a-tag>
      </div>
    </template>
    <full-page :fixed="false">
      <div class="scan-page">
        <div class="scan-page__content">
          <ScanContent v-if="collector.id" ref="scanRef" :collector="collector"/>
        </div>
        <div class="scan-page__footer">
          <a-space>
            <a-button type="primary" :loading="saveLoading" @click="handleSave">{{ $t('DataCollect.index.400152-3') }}</a-button>
          </a-space>
        </div>
      </div>
    </full-page>
  </j-page-container>
</template>

<script setup>
import {detail} from '@data-collector-ui/api/data-collect/collector'
import {onlyMessage} from '@jetlinks-web/utils'
import {useMenuStore} from '@jetlinks-web-core/store'
import {useI18n} from "vue-i18n";
import ScanContent from './index.vue'

const {t: $t} = useI18n();
const route = useRoute();
const menuStore = useMenuStore()

const collector = ref({})
const scanRef = ref()
const saveLoading = ref(false)
const scanSetting = ref({
  columns: [],
  selectedData: [],
  handleData: undefined,
})

provide('plugin-scan-point', scanSetting)

const loadDetail = async (id) => {
  const resp = await detail(id)
  if (resp?.success) {
    collector.value = resp.result
  }
}

const handleSave = async () => {
  saveLoading.value = true
  const resp = await scanRef.value?.handleSave?.().finally(() => {
    saveLoading.value = false
  })

  if (!resp || resp.validated === false) {
    return
  }

  if (resp.empty) {
    onlyMessage($t('Virtual.PointAssign.400159-2'), 'warning')
    return
  }

  if (resp.success) {
    onlyMessage($t('DataCollect.index.400151-11'))
    menuStore.jumpPage('data-collect')
  }
}

watch(
    () => route.params.id,
    (id) => {
      if (id) {
        loadDetail(id)
      }
    },
    { immediate: true },
)

onBeforeRouteLeave((to, from, next) => {
  if (to.name === 'data-collect' && route.params.id) {
    sessionStorage.setItem('collector-patch-add-key', route.params.id)
  }
  return next();
})
</script>

<style scoped lang="less">
.scan-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 24px;
}

.scan-page__title {
  display: flex;
  align-items: center;
  gap: 16px;
}

.scan-page__footer {
  display: flex;
  justify-content: flex-end;
}
</style>
