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
        <a-menu-item key="importChannel" @click="importer?.openImport('importChannel')">
          <template #icon><AIcon type="ImportOutlined" /></template>
          {{ $t('PointWorkspace.importChannel') }}
        </a-menu-item>
        <a-menu-item key="importCollector" @click="importer?.openImport('importCollector')">
          <template #icon><AIcon type="ImportOutlined" /></template>
          {{ $t('PointWorkspace.importCollector') }}
        </a-menu-item>
      </a-menu>
    </template>
  </a-dropdown>
  <CollectImport ref="importer" :channel-list="channelList" />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import CollectImport from './CollectImport.vue'
import type { CollectorObject } from '../../../../types/workspace'
defineProps<{ channelList?:CollectorObject[] }>()
const emit = defineEmits<{ add: [] }>()
const { t:$t } = useI18n()
const importer = ref<InstanceType<typeof CollectImport>>()
</script>
