<template>
  <Import v-if="importVisible"
    :title="activeKey === 'importChannel' ? $t('DataCollect.index.400150-11') : $t('DataCollect.index.400150-12')"
    :download-url-builder="activeKey === 'importChannel' ? (format: string) => channelDownloadImportTemplate(form.provider || '', format) : (format: string) => collectorDownloadImportTemplate(form.provider || '', format)"
    :show-upload="showUpload"
    :request="activeKey === 'importChannel' ? () => channelImport(form.provider || '') : () => collectorImport(form.channelId || '', form.provider || '')"
    :message="$t('collectorWorkspace.importSaveHint')"
    @close="importVisible = false" @save="handleImportSuccess">
    <template #content>
      <a-form ref="formRef" :model="form" layout="vertical">
        <a-form-item :label="$t('DataCollect.index.400150-13')" name="provider" required>
          <a-select v-model:value="form.provider" :options="providers" :field-names="{label: 'name', value: 'id'}" :placeholder="$t('DataCollect.index.400150-14')" />
        </a-form-item>
        <a-form-item v-if="activeKey === 'importCollector'" :label="$t('DataCollect.index.400150-15')" name="channelId" required>
          <a-select v-model:value="form.channelId" :options="providerChannelList" :field-names="{label: 'name', value: 'id'}" :placeholder="$t('DataCollect.index.400150-16')" show-search option-filter-prop="name" />
        </a-form-item>
      </a-form>
    </template>
  </Import>
</template>
<script setup lang="ts">
import Import from '../../components/Import/index.vue'
import { useCollectImport } from './useCollectImport'
import type { CollectorObject, ProviderDescriptor } from '../../../../types/workspace'
const props = defineProps<{ channelList?:CollectorObject[]; providers?:ProviderDescriptor[] }>()
const { $t, form, formRef, activeKey, importVisible, providers, providerChannelList, showUpload,
  openImport, handleImportSuccess, channelDownloadImportTemplate, collectorDownloadImportTemplate, channelImport, collectorImport } = useCollectImport(props)
defineExpose({ openImport })
</script>
