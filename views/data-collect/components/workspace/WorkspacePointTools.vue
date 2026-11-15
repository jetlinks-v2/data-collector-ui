<template>
  <RenderComponents v-if="source" :value="source" />
  <j-permission-button v-if="!compact && actions.scan" size="small" type="text" hasPermission="data-collect:add" :disabled="disabled" @click="browse">
    <AIcon type="ApartmentOutlined" />{{ $t('collectorWorkspace.browsePoints') }}
  </j-permission-button>
  <a-tooltip v-if="!compact" :title="$t('Point.index.400149-2')">
    <j-permission-button size="small" type="text" hasPermission="data-collect:add" :disabled="disabled" :aria-label="$t('Point.index.400149-2')" @click="importPoints"><AIcon type="ImportOutlined" /></j-permission-button>
  </a-tooltip>
  <a-drawer v-model:open="scanOpen" :width="'min(1120px, 100vw)'" :closable="true" destroy-on-close :title="$t('collectorWorkspace.browsePoints')">
    <PointScan v-if="scanOpen" :collector="collector" @saved="scanOpen = false; emit('saved')" />
  </a-drawer>
  <PointImport v-if="importOpen" :download-url-builder="template" :request="importRequest" @close="importOpen = false" @save="emit('saved')" />
</template>
<script setup lang="ts">
import { computed, defineAsyncComponent, toRef } from 'vue'
import { useWorkspacePointTools } from '../../hook/useWorkspacePointTools'
import RenderComponents from '../../../../components/RenderComponents/RenderComponents.vue'
import type { CollectorObject } from '../../../../types/workspace'
const PointScan = defineAsyncComponent(() => import('../Point/Scan/index.vue'))
const PointImport = defineAsyncComponent(() => import('../Import/index.vue'))
const props = defineProps<{ collector: CollectorObject; disabled: boolean; compact?: boolean }>()
const emit = defineEmits<{ saved: [] }>()
const { actions, source, scanOpen, importOpen, template, importRequest } = useWorkspacePointTools(toRef(props, 'collector'))
// 两种布局共用同一个插件上下文和弹层，不因收起按钮重复加载插件。
const canBrowse = computed(() => actions.scan)
const batchAdapter = computed(() => actions.batch)
function browse() { if (!props.disabled && actions.scan) scanOpen.value = true }
function importPoints() { if (!props.disabled) importOpen.value = true }
defineExpose({ canBrowse, batchAdapter, browse, importPoints })
</script>
