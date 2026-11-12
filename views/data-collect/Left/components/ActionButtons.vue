<template>
  <a-dropdown :trigger="['click']" placement="topRight" :min-overlay-width-match-trigger="false"
    :overlay-style="{ minWidth: '8rem' }">
    <j-permission-button block>
      <template #icon><AIcon type="PlusOutlined" /></template>
      {{ $t('PointWorkspace.create') }}
    </j-permission-button>
    <template #overlay>
      <a-menu>
        <a-menu-item key="add" @click="emit('add')">
          <template #icon><AIcon type="PlusOutlined" /></template>
          {{ $t('DataCollect.index.400150-27') }}
        </a-menu-item>
        <a-menu-item key="importChannel" @click="openImport('importChannel')">
          <template #icon><AIcon type="ImportOutlined" /></template>
          {{ $t('PointWorkspace.importChannel') }}
        </a-menu-item>
        <a-menu-item key="importCollector" @click="openImport('importCollector')">
          <template #icon><AIcon type="ImportOutlined" /></template>
          {{ $t('PointWorkspace.importCollector') }}
        </a-menu-item>
      </a-menu>
    </template>
  </a-dropdown>
  <Import
    v-if="importVisible"
    :title="activeKey === 'importChannel' ? $t('DataCollect.index.400150-11') : $t('DataCollect.index.400150-12')"
    :download-url-builder="activeKey === 'importChannel' ? (format: string) => channelDownloadImportTemplate(form.provider || '', format) : (format: string) => collectorDownloadImportTemplate(form.provider || '', format)"
    :show-upload="showUpload"
    :request="activeKey === 'importChannel' ? () => channelImport(form.provider || '') : () => collectorImport(form.channelId || '', form.provider || '')"
    @close="importVisible = false"
    @save="handleImportSuccess"
  >
    <template #content>
      <a-form :model="form" layout="vertical" ref="formRef">
        <a-form-item :label="$t('DataCollect.index.400150-13')" name="provider" required>
          <a-select v-model:value="form.provider" :options="providers" :field-names="{label: 'name', value: 'id'}" :placeholder="$t('DataCollect.index.400150-14')"></a-select>
        </a-form-item>
        <a-form-item v-if="activeKey === 'importCollector'" :label="$t('DataCollect.index.400150-15')" name="channelId" required>
          <a-select v-model:value="form.channelId" :options="providerChannelList" :field-names="{label: 'name', value: 'id'}" :placeholder="$t('DataCollect.index.400150-16')"></a-select>
        </a-form-item>
      </a-form>
    </template>
  </Import>
</template>

<script setup lang="ts">
import Import from '../../components/Import/index.vue'
import { useCollectImport } from './useCollectImport'
const props = defineProps<{ channelList?: any[] }>()
const emit = defineEmits<{ add: [] }>()
const { $t, form, formRef, activeKey, importVisible, providers, providerChannelList, showUpload,
  openImport, handleImportSuccess, channelDownloadImportTemplate, collectorDownloadImportTemplate, channelImport, collectorImport } = useCollectImport(props)
</script>
