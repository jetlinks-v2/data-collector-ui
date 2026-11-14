<template>
  <section class="cw-object-configuration" :class="{ 'cw-compact-configuration': formOnly }">
    <a-form ref="form" layout="vertical" :model="model">
      <a-form-item v-if="kind === 'channel' && !formOnly" name="provider" :label="$t('Info.index.077901-4')" :rules="[{required:true}]">
        <ConfigSelect v-model:value="model.provider" :disabled="!!value?.id" show-search :options="providers.map(item => ({value:item.id,label:item.name || item.id,icon:'ApiOutlined',description:item.description || item.id}))" />
      </a-form-item>
      <a-form-item v-else-if="kind === 'collector' && !formOnly" name="channelId" :label="$t('collectorWorkspace.channel')" :rules="[{required:true}]">
        <ConfigSelect v-model:value="model.channelId" :disabled="!!value?.id" show-search :options="channels.map(item => ({value:item.id,label:item.name,icon:'ApiOutlined',description:item.description || item.provider}))" />
      </a-form-item>
      <a-form-item v-if="!formOnly" name="name" :label="$t('collectorWorkspace.name')" :rules="[{required:true,message:$t('collectorWorkspace.nameRequired')},{max:64}]"><a-input v-model:value="model.name" /></a-form-item>
      <a-form-item v-if="!formOnly" :label="$t('collectorWorkspace.icon')"><a-popover trigger="click" placement="bottomLeft"><template #content><IconValueEditor v-model:value="model.icon" /></template><a-button><WorkspaceIcon :object="model" :size="18" /><AIcon type="EditOutlined" /></a-button></a-popover></a-form-item>
      <a-spin :spinning="loading"><div :class="{ 'cw-configuration-fields': formOnly }"><RenderComponents v-if="source" :value="source" @ready="ready" @error="onPluginError" /></div></a-spin>
      <a-alert v-if="error" type="warning" :message="error" show-icon><template #action><a-button type="link" @click="loadPlugin">{{ $t('collectorWorkspace.retry') }}</a-button></template></a-alert>
      <div v-if="kind === 'collector'" class="cw-diagnostics-setting"><span><AIcon type="AimOutlined" />{{ $t('collectorWorkspace.diagnostics') }}<small>{{ $t('collectorProcessing.diagnosticsMemoryHint') }}</small></span><a-switch v-model:checked="diagnosticsEnabled" size="small" :aria-label="$t('collectorWorkspace.diagnostics')" /></div>
      <a-collapse v-if="kind === 'collector' && !formOnly" ghost><a-collapse-panel key="defaults" :header="$t('DataCollect.index.400151-6')">
        <CollectionConfiguration :show-switch="false" />
        <ProcessingRules ref="rules" :model="model" :capabilities="capabilities" />
      </a-collapse-panel></a-collapse>
      <a-form-item v-if="!formOnly" name="description" :label="$t('Save.index.4001415-47')"><a-textarea v-model:value="model.description" :maxlength="200" :rows="2" /></a-form-item>
    </a-form>
    <a-alert v-if="saveError" type="error" :message="saveError" show-icon />
    <a-space v-if="!formOnly"><j-permission-button type="primary" :has-permission="value?.id ? 'data-collect:update' : 'data-collect:add'" :disabled="loading || !source" :loading="saving" @click="save(validate)">{{ $t('collectorWorkspace.apply') }}</j-permission-button><a-button @click="$emit('close')">{{ $t('DataCollect.index.400151-10') }}</a-button></a-space>
  </section>
</template>
<script setup lang="ts">
import { computed, ref } from 'vue'
import type { FormInstance } from 'ant-design-vue'
import { IconValueEditor } from '@jetlinks-web-core/components/IconValue'
import type { CollectorObject, ProviderDescriptor } from '../../../../types/workspace'
import { useObjectConfiguration } from '../../hook/useObjectConfiguration'
import RenderComponents from '../../../../components/RenderComponents'
import CollectionConfiguration from '../Config/CollectionConfiguration.vue'
import ProcessingRules from './ProcessingRules.vue'
import WorkspaceIcon from './WorkspaceIcon.vue'
import ConfigSelect from '../../../../components/ConfigSelect.vue'
const props = defineProps<{ kind: 'channel' | 'collector'; value?: CollectorObject; channels: CollectorObject[]; providers: ProviderDescriptor[]; formOnly?: boolean; connection?: Partial<CollectorObject> }>()
const emit = defineEmits<{ close: []; saved: [] }>()
const form = ref<FormInstance>(), rules = ref<InstanceType<typeof ProcessingRules>>()
const { model, capabilities, source, loading, saving, error, saveError, dirty, ready, loadPlugin, save } = useObjectConfiguration(props, () => emit('saved'))
const diagnosticsEnabled=computed({get:()=>model.managedConfiguration?.diagnosticsEnabled !== false,set:(value:boolean)=>{model.managedConfiguration ||= {};model.managedConfiguration.diagnosticsEnabled=value}})
const validate = async () => { if (!source.value || loading.value || error.value) throw new Error(error.value); await form.value?.validate(); await rules.value?.validate() }
function onPluginError(cause: Error) { error.value = cause.message }
defineExpose({ model, validate, dirty, saving })
</script>
<style scoped>
.cw-diagnostics-setting { display:flex;align-items:center;justify-content:space-between;gap:12px;padding-block:8px;border-top:1px solid var(--line,var(--cw-line));font-size:12px }
.cw-diagnostics-setting > span { display:flex;align-items:center;flex-wrap:wrap;gap:4px 6px }
.cw-diagnostics-setting small { width:100%;color:var(--jet-theme-text-secondary,var(--cw-muted));font-size:12px }
</style>
