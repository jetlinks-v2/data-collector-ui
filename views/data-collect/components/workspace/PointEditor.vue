<template>
  <section class="cw-editor" :aria-label="$t('collectorWorkspace.pointEditor')">
    <a-form ref="form" layout="vertical" :model="model">
      <div class="cw-editor-heading">
        <div class="cw-point-select cw-point-identity">
          <PointIdentity :point="model">
            <template #icon><EditorIconPicker v-model:value="model.icon"><button type="button" class="cw-icon-button cw-point-icon-edit" :aria-label="$t('collectorWorkspace.icon')"><span class="cw-point-icon-preview"><WorkspaceIcon :object="model" kind="point" :size="16" /></span><AIcon type="EditOutlined" class="cw-icon-edit-mark" aria-hidden="true" /></button></EditorIconPicker></template>
            <template #title><a-form-item name="name" :rules="[{ required: true, message: $t('collectorWorkspace.nameRequired') }]" class="cw-name-field"><a-input v-model:value="model.name" :bordered="false" :aria-label="$t('collectorWorkspace.pointName')" /></a-form-item></template>
            <template #identifier><span class="cw-key-input" :data-value="model.pointKey || (model.id.startsWith('_new:') ? $t('collectorWorkspace.identifier') : model.id)"><a-form-item name="pointKey" class="cw-identifier" :rules="[{ validator: validateKey, trigger: 'blur' }]"><a-input v-model:value="model.pointKey" :bordered="false" :aria-label="$t('collectorWorkspace.identifier')" :placeholder="model.id.startsWith('_new:') ? $t('collectorWorkspace.identifier') : model.id" /></a-form-item></span></template>
          </PointIdentity>
          <button type="button" class="cw-icon-button cw-editor-collapse" :disabled="saving" :aria-label="$t('collectorWorkspace.close')" :title="$t('collectorWorkspace.close')" @click="$emit('close')"><AIcon type="UpOutlined" /></button>
        </div>
        <span class="cw-point-status"><RuntimeCardMetrics v-if="resolved" :object="resolved" kind="point" variant="status" @diagnostic-visibility="$emit('diagnosticVisibility', $event)"><template #diagnostic><slot name="diagnostic" /></template></RuntimeCardMetrics><a-tooltip :title="model.description || $t('collectorNotes.label')"><button type="button" class="cw-icon-button" :class="{ 'cw-has-note': !!model.description }" :aria-label="$t('collectorNotes.label')" :aria-expanded="noteExpanded" @click="toggleNote"><AIcon type="FileTextOutlined" /></button></a-tooltip></span>
      </div>
      <div class="cw-editor-reading cw-point-reading"><small>{{ $t('collectorTrial.latest') }}</small><PointValueDisplay :point="resolved || model" :empty-text="$t('collectorWorkspace.noData')" :unit="resolved?.unit || resolved?.metadata?.dataType?.unit || ''" /><RuntimeCardMetrics v-if="resolved" :object="resolved" kind="point" variant="values" /></div>
      <a-form-item v-show="noteExpanded" name="description" class="cw-point-remark"><div class="cw-row"><AIcon type="FileTextOutlined" /><a-textarea ref="noteInput" v-model:value="model.description" :bordered="false" :auto-size="{ minRows: 1, maxRows: 3 }" :maxlength="255" :aria-label="$t('collectorNotes.label')" :placeholder="$t('collectorNotes.placeholder')" /></div></a-form-item>
      <section class="cw-point-source" :aria-label="$t('collectorEditing.source')"><div class="cw-between cw-settings-title"><h2><AIcon type="NumberOutlined" />{{ $t('collectorEditing.source') }}</h2><div v-if="!model.id.startsWith('_new:')" class="cw-trial-action"><PointReadFeedback :state="readState" :point="resolved || model" compact @stop="$emit('stopTrial')" /><a-tooltip :title="$t('collectorWorkspace.savedOnly')"><j-permission-button class="cw-link" type="link" size="small" :disabled="readState?.running" hasPermission="data-collect:view" @click="$emit('trial')"><AIcon :type="readState?.running ? 'LoadingOutlined' : 'PlayCircleOutlined'" />{{ $t('collectorWorkspace.read') }}</j-permission-button></a-tooltip></div></div>
      <a-spin :spinning="plugin.loading.value">
        <a-alert v-if="plugin.error.value" type="error" :message="plugin.error.value" show-icon><template #action><a-button size="small" @click="plugin.retry">{{ $t('collectorWorkspace.retry') }}</a-button></template></a-alert>
        <div class="cw-content-fields cw-source-fields"><RenderComponents v-if="plugin.source.value" :value="plugin.source.value" @ready="ready" @error="onPluginError" /><a-skeleton v-else-if="plugin.loading.value" active :paragraph="{rows:2}" /></div>
      </a-spin>
      </section>
      <section class="cw-point-settings" :aria-label="$t('collectorWorkspace.acquisitionSettings')">
        <h2 class="cw-settings-title"><AIcon type="ClockCircleOutlined" />{{ $t('collectorWorkspace.acquisitionSettings') }}</h2>
        <AcquisitionSettings :model="model" :capabilities="plugin.capabilities.value" decoding />
      </section>
      <ProcessingRules ref="rules" :model="model" :capabilities="plugin.capabilities.value" />
      <div v-if="error || pluginError" class="cw-error" role="alert">{{ error || pluginError }}</div>
      <div class="cw-editor-footer"><small :class="dirty ? 'cw-draft-pending' : 'cw-muted'">{{ $t(dirty ? 'collectorWorkspace.unsaved' : 'collectorWorkspace.applied') }}</small><a-button size="small" :disabled="!dirty || saving" @click="$emit('restore')">{{ $t('collectorWorkspace.restore') }}</a-button><j-permission-button size="small" type="primary" :hasPermission="model.id.startsWith('_new:') ? 'data-collect:add' : 'data-collect:update'" :loading="saving" :disabled="!dirty || !!pluginError || !!plugin.error.value" @click="apply"><AIcon type="CheckOutlined" />{{ $t('collectorWorkspace.apply') }}</j-permission-button></div>
    </a-form>
  </section>
</template>
<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import type { FormInstance } from 'ant-design-vue'
import EditorIconPicker from './EditorIconPicker.vue'
import type { CollectorObject, PointRow } from '../../../../types/workspace'
import { usePointPlugin } from '../../hook/usePointPlugin'
import RenderComponents from '../../../../components/RenderComponents'
import AcquisitionSettings from './AcquisitionSettings.vue'
import ProcessingRules from './ProcessingRules.vue'
import PointReadFeedback from './PointReadFeedback.vue'
import type { PointTrialState } from '../../hook/usePointTrial'
import WorkspaceIcon from './WorkspaceIcon.vue'
import PointValueDisplay from './PointValueDisplay.vue'
import PointIdentity from './PointIdentity.vue'
import RuntimeCardMetrics from './RuntimeCardMetrics.vue'
import { useI18n } from 'vue-i18n'
import { _validateField } from '../../../../api/data-collect/collector'
const { t } = useI18n()
const props = defineProps<{ model: CollectorObject; collector: CollectorObject; resolved?: PointRow; dirty: boolean; saving: boolean; error?: string; readState?:PointTrialState }>()
const emit = defineEmits<{ apply: [validate: () => Promise<unknown>]; restore: []; trial: []; stopTrial:[]; close: []; ready: [model:CollectorObject]; diagnosticVisibility: [visible:boolean] }>()
const form = ref<FormInstance>(), rules = ref<InstanceType<typeof ProcessingRules>>(), pluginError = ref('')
const noteExpanded = ref(!!props.model.description), noteInput = ref<{ focus: () => void }>()
function toggleNote() { noteExpanded.value = !noteExpanded.value; if (noteExpanded.value) void nextTick(() => noteInput.value?.focus()) }
const plugin = usePointPlugin(props.model, props.collector, props.resolved)
const initialKey = props.model.pointKey
function ready() { emit('ready', props.model) }
function onPluginError(cause: Error) { pluginError.value = cause.message; ready() }
watch(plugin.error, error => { if (error) ready() })
async function validateKey() {
  if (!props.model.pointKey || !props.model.id.startsWith('_new:') && props.model.pointKey === initialKey) return
  const response = await _validateField(props.collector.id, { pointKey: props.model.pointKey, id: props.model.id.startsWith('_new:') ? undefined : props.model.id })
  if (!response.success || response.result?.passed === false) throw new Error(response.result?.reason || response.message || t('collectorWorkspace.identifierDuplicate'))
}
function apply() { emit('apply', async () => { await form.value?.validate(); await rules.value?.validate() }) }
</script>
