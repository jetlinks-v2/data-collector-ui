<template>
  <section class="cw-object-configuration" :class="{ 'cw-compact-configuration': formOnly, 'cw-object-inline-configuration': !formOnly }">
    <a-form :key="formRevision" ref="form" layout="vertical" :model="model" :disabled="saving || !pluginReady">
      <header v-if="!formOnly" class="cw-object-edit-heading"><ObjectIdentity :object="value || model" :surface="surface">
        <template #icon><EditorIconPicker v-model:value="model.icon"><button type="button" class="cw-icon-button cw-object-icon-edit" :disabled="saving || !pluginReady" :aria-label="$t('collectorWorkspace.icon')"><WorkspaceIcon :object="model" :size="surface === 'channel' ? 16 : surface === 'header' ? 25 : 24" /></button></EditorIconPicker></template>
        <template #name><a-form-item name="name" class="cw-name-field" :rules="[{required:true,message:$t('collectorWorkspace.nameRequired')},{max:64}]"><a-input v-model:value="model.name" :bordered="false" :aria-label="$t('collectorWorkspace.name')" /></a-form-item></template>
        <template v-if="surface === 'header'" #status><RuntimeCardMetrics :object="value || model" :kind="kind" variant="status" /></template>
        <RuntimeCardMetrics v-if="value && surface === 'card'" :object="value" :kind="kind" />
        <a-button type="text" size="small" class="cw-object-collapse" :class="{ 'cw-channel-action': surface === 'channel' }" :disabled="saving" :aria-label="$t('collectorWorkspace.collapse')" :title="$t('collectorWorkspace.collapse')" :aria-expanded="true" @click="$emit('close')"><AIcon type="SettingOutlined" /><span v-if="surface === 'channel'" class="cw-channel-action-label">{{ $t('collectorWorkspace.connection') }}</span></a-button>
      </ObjectIdentity><div class="cw-object-edit-summary"><small>{{ providerLabel }}</small><small v-if="kind === 'channel'">{{ $t('collectorEditing.sharedCount', { count: sharedCount }) }}</small><small v-else-if="value?.pointNumber != null">{{ $t('collectorWorkspace.pointCount', { count: value.pointNumber }) }}</small></div></header>
      <a-form-item v-if="kind === 'channel' && !formOnly && !value?.id" name="provider" :label="$t('Info.index.077901-4')" :rules="[{required:true}]">
        <ConfigSelect v-model:value="model.provider" :disabled="!!value?.id" show-search :options="providers.map(item => ({value:item.id,label:item.name || item.id,icon:'ApiOutlined',description:item.description || item.id}))" />
      </a-form-item>
      <a-form-item v-else-if="kind === 'collector' && !formOnly && !value?.id" name="channelId" :label="$t('collectorWorkspace.channel')" :rules="[{required:true}]">
        <ConfigSelect v-model:value="model.channelId" :disabled="!!value?.id" show-search :options="channels.map(item => ({value:item.id,label:item.name,icon:'ApiOutlined',description:item.description || item.provider}))" />
      </a-form-item>
      <a-collapse v-if="!formOnly" ghost class="cw-object-note"><a-collapse-panel key="description"><template #header><span class="cw-object-note-heading"><span>{{ $t('collectorNotes.label') }}</span><small :title="model.description">{{ model.description || $t('collectorNotes.placeholder') }}</small></span></template><a-form-item name="description" class="cw-point-remark"><a-textarea v-model:value="model.description" :bordered="false" :maxlength="200" :auto-size="{ minRows: 1, maxRows: 3 }" :aria-label="$t('collectorNotes.label')" :placeholder="$t('collectorNotes.placeholder')" /></a-form-item></a-collapse-panel></a-collapse>
      <ChannelScheduling v-if="kind === 'channel'" :model="model" :disabled="saving || !pluginReady" />
      <a-spin :spinning="loading"><div class="cw-content-fields"><RenderComponents v-if="source" :key="formRevision" :value="source" @ready="ready" @error="onPluginError" /><a-skeleton v-else-if="loading" active :paragraph="{ rows: 2 }" /></div></a-spin>
      <a-alert v-if="error" type="warning" :message="error" show-icon><template #action><a-button type="link" :disabled="loading" @click="loadPlugin">{{ $t('collectorWorkspace.retry') }}</a-button></template></a-alert>
      <div v-if="kind === 'collector'" class="cw-diagnostics-setting"><span><AIcon type="AimOutlined" />{{ $t('collectorWorkspace.diagnostics') }}<small>{{ $t('collectorProcessing.diagnosticsMemoryHint') }}</small></span><a-switch v-model:checked="diagnosticsEnabled" size="small" :aria-label="$t('collectorWorkspace.diagnostics')" /></div>
      <p v-if="kind === 'channel' && !formOnly && connectionChanged && sharedCount" class="cw-scope-note"><AIcon type="InfoCircleOutlined" />{{ $t('collectorEditing.sharedImpact', { count: sharedCount }) }}</p>
      <a-collapse v-if="kind === 'collector' && !formOnly" ghost class="cw-content-defaults"><a-collapse-panel key="defaults"><template #header><span>{{ $t('collectorEditing.newPointDefaults') }}<small>{{ $t('collectorEditing.newPointDefaultsHint') }}</small></span></template>
        <div class="cw-content-fields">
        <AcquisitionSettings :model="model" :capabilities="capabilities" />
        <ProcessingRules ref="rules" :model="model" :capabilities="capabilities" />
        </div>
      </a-collapse-panel></a-collapse>
    </a-form>
    <a-alert v-if="saveError" type="error" :message="saveError" show-icon />
    <footer v-if="!formOnly" class="cw-editor-footer"><small :class="dirty ? 'cw-draft-pending' : 'cw-muted'">{{ $t(dirty ? 'collectorWorkspace.unsaved' : 'collectorWorkspace.applied') }}</small><a-button size="small" :disabled="!dirty || saving" @click="restore(); form?.clearValidate()">{{ $t('collectorWorkspace.restore') }}</a-button><j-permission-button size="small" type="primary" :has-permission="value?.id ? 'data-collect:update' : 'data-collect:add'" :disabled="!pluginReady || loading || !source || !!value?.id && !dirty" :loading="saving" @click="save(validate)"><AIcon type="CheckOutlined" />{{ $t(kind === 'channel' ? 'collectorEditing.applyChannel' : 'collectorEditing.applyCollector') }}</j-permission-button></footer>
  </section>
</template>
<script setup lang="ts">
import { computed, ref } from 'vue'
import type { FormInstance } from 'ant-design-vue'
import EditorIconPicker from './EditorIconPicker.vue'
import type { CollectorObject, ProviderDescriptor } from '../../../../types/workspace'
import { useObjectConfiguration, type ObjectConfigurationDraft } from '../../hook/useObjectConfiguration'
import RenderComponents from '../../../../components/RenderComponents'
import AcquisitionSettings from './AcquisitionSettings.vue'
import ProcessingRules from './ProcessingRules.vue'
import WorkspaceIcon from './WorkspaceIcon.vue'
import ObjectIdentity from './ObjectIdentity.vue'
import RuntimeCardMetrics from './RuntimeCardMetrics.vue'
import ConfigSelect from '../../../../components/ConfigSelect.vue'
import ChannelScheduling from './ChannelScheduling.vue'
const props = withDefaults(defineProps<{ kind: 'channel' | 'collector'; value?: CollectorObject; channels: CollectorObject[]; providers: ProviderDescriptor[]; formOnly?: boolean; connection?: Partial<CollectorObject>; surface?: 'card' | 'header' | 'channel'; sharedCount?: number; draft?: ObjectConfigurationDraft }>(), { surface: 'card', sharedCount: 0 })
const emit = defineEmits<{ close: []; saved: [value: CollectorObject] }>()
const form = ref<FormInstance>(), rules = ref<InstanceType<typeof ProcessingRules>>()
const { model, capabilities, source, loading, saving, error, saveError, dirty, ready, loadPlugin, save, restore, formRevision, providerLabel, snapshot, pluginReady, prepared, connectionChanged } = useObjectConfiguration(props, value => emit('saved', value))
const diagnosticsEnabled=computed({get:()=>model.managedConfiguration?.diagnosticsEnabled !== false,set:(value:boolean)=>{model.managedConfiguration ||= {};model.managedConfiguration.diagnosticsEnabled=value}})
const validate = async () => { if (!source.value || loading.value || error.value) throw new Error(error.value); await form.value?.validate(); await rules.value?.validate() }
function onPluginError(cause: Error) { error.value = cause.message }
defineExpose({ model, validate, dirty, saving, snapshot, prepared })
</script>
<style scoped>
.cw-diagnostics-setting { display:flex;align-items:center;justify-content:space-between;gap:12px;padding-block:8px;border-top:1px solid var(--line,var(--cw-line));font-size:12px }
.cw-diagnostics-setting > span { display:flex;align-items:center;flex-wrap:wrap;gap:4px 6px }
.cw-diagnostics-setting small { color:var(--jet-theme-text-secondary,var(--cw-muted));font-size:12px }
</style>
