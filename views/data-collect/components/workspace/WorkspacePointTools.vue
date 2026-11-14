<template>
  <RenderComponents v-if="source" :value="source" />
  <j-permission-button v-if="actions.scan" hasPermission="data-collect:add" :disabled="disabled" @click="scanOpen = true">
    <AIcon type="ApartmentOutlined" />{{ $t('collectorWorkspace.browsePoints') }}
  </j-permission-button>
  <a-tooltip :title="$t('Point.index.400149-2')">
    <j-permission-button hasPermission="data-collect:add" :disabled="disabled" :aria-label="$t('Point.index.400149-2')" @click="importOpen = true"><AIcon type="ImportOutlined" /></j-permission-button>
  </a-tooltip>
  <a-drawer v-model:open="scanOpen" :width="'min(1120px, 100vw)'" :closable="true" destroy-on-close :title="$t('collectorWorkspace.browsePoints')">
    <PointScan v-if="scanOpen" :collector="collector" @saved="scanOpen = false; emit('saved')" />
  </a-drawer>
  <PointImport v-if="importOpen" :download-url-builder="template" :request="importRequest" @close="importOpen = false" @save="emit('saved')" />
</template>
<script setup lang="ts">
import { defineAsyncComponent, toRef } from 'vue'
import { useWorkspacePointTools } from '../../hook/useWorkspacePointTools'
import RenderComponents from '../../../../components/RenderComponents/RenderComponents.vue'
import type { CollectorObject } from '../../../../types/workspace'
const PointScan = defineAsyncComponent(() => import('../Point/Scan/index.vue'))
const PointImport = defineAsyncComponent(() => import('../Import/index.vue'))
const props = defineProps<{ collector: CollectorObject; disabled: boolean }>()
const emit = defineEmits<{ saved: [] }>()
const { actions, source, scanOpen, importOpen, template, importRequest } = useWorkspacePointTools(toRef(props, 'collector'))
</script>
