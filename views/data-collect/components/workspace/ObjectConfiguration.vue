<template>
  <section class="cw-object-configuration" :class="{ 'cw-compact-configuration': formOnly }">
    <header v-if="!formOnly" class="cw-configuration-heading"><h2><AIcon :type="kind === 'channel' ? 'ApiOutlined' : 'SettingOutlined'" />{{ $t(kind === 'channel' ? 'collectorWorkspace.connection' : 'collectorWorkspace.collectorSettings') }}</h2><small class="cw-muted">{{ $t(kind === 'channel' ? 'collectorEditing.sharedChannel' : 'collectorEditing.thisCollector') }}</small><button type="button" class="cw-icon-button" :disabled="saving" :aria-label="$t('collectorWorkspace.close')" @click="$emit('close')"><AIcon type="CloseOutlined" /></button></header>
    <a-form :key="formRevision" ref="form" layout="vertical" :model="model" :disabled="saving">
      <a-form-item v-if="kind === 'channel' && !formOnly && !value?.id" name="provider" :label="$t('Info.index.077901-4')" :rules="[{required:true}]">
        <ConfigSelect v-model:value="model.provider" :disabled="!!value?.id" show-search :options="providers.map(item => ({value:item.id,label:item.name || item.id,icon:'ApiOutlined',description:item.description || item.id}))" />
      </a-form-item>
      <a-form-item v-else-if="kind === 'collector' && !formOnly && !value?.id" name="channelId" :label="$t('collectorWorkspace.channel')" :rules="[{required:true}]">
        <ConfigSelect v-model:value="model.channelId" :disabled="!!value?.id" show-search :options="channels.map(item => ({value:item.id,label:item.name,icon:'ApiOutlined',description:item.description || item.provider}))" />
      </a-form-item>
      <div v-if="!formOnly" class="cw-object-identity"><a-popover trigger="click" placement="bottomLeft" overlay-class-name="cw-workspace-popover"><template #content><IconValueEditor v-model:value="model.icon" /></template><button type="button" class="cw-icon-button" :aria-label="$t('collectorWorkspace.icon')"><WorkspaceIcon :object="model" :size="20" /></button></a-popover><a-form-item name="name" class="cw-name-field" :rules="[{required:true,message:$t('collectorWorkspace.nameRequired')},{max:64}]"><a-input v-model:value="model.name" :bordered="false" :aria-label="$t('collectorWorkspace.name')" /></a-form-item><small class="cw-muted">{{ providerLabel }}</small></div>
      <a-form-item v-if="!formOnly" name="description" class="cw-point-remark"><div class="cw-row"><AIcon type="FileTextOutlined" /><a-textarea v-model:value="model.description" :bordered="false" :maxlength="200" :auto-size="{ minRows: 1, maxRows: 3 }" :aria-label="$t('collectorNotes.label')" :placeholder="$t('collectorNotes.placeholder')" /></div></a-form-item>
      <a-spin :spinning="loading"><div class="cw-content-fields"><RenderComponents v-if="source" :key="formRevision" :value="source" @ready="ready" @error="onPluginError" /><a-skeleton v-else-if="loading" active :paragraph="{ rows: 2 }" /></div></a-spin>
      <a-alert v-if="error" type="warning" :message="error" show-icon><template #action><a-button type="link" @click="loadPlugin">{{ $t('collectorWorkspace.retry') }}</a-button></template></a-alert>
      <div v-if="kind === 'collector'" class="cw-diagnostics-setting"><span><AIcon type="AimOutlined" />{{ $t('collectorWorkspace.diagnostics') }}<small>{{ $t('collectorProcessing.diagnosticsMemoryHint') }}</small></span><a-switch v-model:checked="diagnosticsEnabled" size="small" :aria-label="$t('collectorWorkspace.diagnostics')" /></div>
      <p v-if="kind === 'channel' && !formOnly" class="cw-scope-note"><AIcon type="InfoCircleOutlined" />{{ $t('collectorEditing.sharedHint') }}</p>
      <a-collapse v-if="kind === 'collector' && !formOnly" ghost class="cw-content-defaults"><a-collapse-panel key="defaults"><template #header><span>{{ $t('collectorEditing.newPointDefaults') }}<small>{{ $t('collectorEditing.newPointDefaultsHint') }}</small></span></template>
        <div class="cw-content-fields">
        <AcquisitionSettings :model="model" :capabilities="capabilities" />
        <ProcessingRules ref="rules" :model="model" :capabilities="capabilities" />
        </div>
      </a-collapse-panel></a-collapse>
    </a-form>
    <a-alert v-if="saveError" type="error" :message="saveError" show-icon />
    <footer v-if="!formOnly" class="cw-editor-footer"><small :class="dirty ? 'cw-draft-pending' : 'cw-muted'">{{ $t(dirty ? 'collectorWorkspace.unsaved' : 'collectorWorkspace.applied') }}</small><a-button size="small" :disabled="!dirty || saving" @click="restore(); form?.clearValidate()">{{ $t('collectorWorkspace.restore') }}</a-button><j-permission-button size="small" type="primary" :has-permission="value?.id ? 'data-collect:update' : 'data-collect:add'" :disabled="loading || !source || !!value?.id && !dirty" :loading="saving" @click="save(validate)"><AIcon type="CheckOutlined" />{{ $t(kind === 'channel' ? 'collectorEditing.applyChannel' : 'collectorEditing.applyCollector') }}</j-permission-button></footer>
  </section>
</template>
<script setup lang="ts">
import { computed, ref } from 'vue'
import type { FormInstance } from 'ant-design-vue'
import { IconValueEditor } from '@jetlinks-web-core/components/IconValue'
import type { CollectorObject, ProviderDescriptor } from '../../../../types/workspace'
import { useObjectConfiguration } from '../../hook/useObjectConfiguration'
import RenderComponents from '../../../../components/RenderComponents'
import AcquisitionSettings from './AcquisitionSettings.vue'
import ProcessingRules from './ProcessingRules.vue'
import WorkspaceIcon from './WorkspaceIcon.vue'
import ConfigSelect from '../../../../components/ConfigSelect.vue'
const props = defineProps<{ kind: 'channel' | 'collector'; value?: CollectorObject; channels: CollectorObject[]; providers: ProviderDescriptor[]; formOnly?: boolean; connection?: Partial<CollectorObject> }>()
const emit = defineEmits<{ close: []; saved: [] }>()
const form = ref<FormInstance>(), rules = ref<InstanceType<typeof ProcessingRules>>()
const { model, capabilities, source, loading, saving, error, saveError, dirty, ready, loadPlugin, save, restore, formRevision, providerLabel } = useObjectConfiguration(props, () => emit('saved'))
const diagnosticsEnabled=computed({get:()=>model.managedConfiguration?.diagnosticsEnabled !== false,set:(value:boolean)=>{model.managedConfiguration ||= {};model.managedConfiguration.diagnosticsEnabled=value}})
const validate = async () => { if (!source.value || loading.value || error.value) throw new Error(error.value); await form.value?.validate(); await rules.value?.validate() }
function onPluginError(cause: Error) { error.value = cause.message }
defineExpose({ model, validate, dirty, saving })
</script>
<style scoped>
.cw-diagnostics-setting { display:flex;align-items:center;justify-content:space-between;gap:12px;padding-block:8px;border-top:1px solid var(--line,var(--cw-line));font-size:12px }
.cw-diagnostics-setting > span { display:flex;align-items:center;flex-wrap:wrap;gap:4px 6px }
.cw-diagnostics-setting small { color:var(--jet-theme-text-secondary,var(--cw-muted));font-size:12px }
</style>
