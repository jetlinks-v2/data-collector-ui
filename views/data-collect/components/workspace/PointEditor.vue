<template>
  <section class="cw-editor" :aria-label="$t('collectorWorkspace.pointEditor')">
    <a-form ref="form" layout="vertical" :model="model">
      <div class="cw-editor-heading">
        <a-popover trigger="click" placement="bottomLeft"><template #content><IconValueEditor v-model:value="model.icon" /></template><button type="button" class="cw-icon-button" :aria-label="$t('collectorWorkspace.icon')"><WorkspaceIcon :object="model" kind="point" :size="18" /></button></a-popover>
        <div class="cw-point-identity">
          <a-form-item name="name" :rules="[{ required: true, message: $t('collectorWorkspace.nameRequired') }]" class="cw-name-field"><a-input v-model:value="model.name" :bordered="false" :aria-label="$t('collectorWorkspace.pointName')" /></a-form-item>
          <a-form-item name="pointKey" class="cw-identifier" :rules="[{ validator: validateKey, trigger: 'blur' }]"><div class="cw-row"><AIcon type="NumberOutlined" /><a-input v-model:value="model.pointKey" :bordered="false" :aria-label="$t('collectorWorkspace.identifier')" :placeholder="model.id.startsWith('_new:') ? $t('collectorWorkspace.identifier') : model.id" /></div></a-form-item>
        </div><AIcon class="cw-name-pencil" type="EditOutlined" />
        <a-tooltip :title="$t('collectorWorkspace.savedOnly')"><j-permission-button v-if="!model.id.startsWith('_new:')" class="cw-link" type="link" hasPermission="data-collect:view" @click="$emit('trial')"><AIcon type="PlayCircleOutlined" />{{ $t('collectorWorkspace.read') }}</j-permission-button></a-tooltip>
        <button type="button" class="cw-icon-button" :disabled="saving" :aria-label="$t('collectorWorkspace.close')" :title="$t('collectorWorkspace.close')" @click="$emit('close')"><AIcon type="CloseOutlined" /></button>
      </div>
      <a-spin :spinning="plugin.loading.value">
        <a-alert v-if="plugin.error.value" type="error" :message="plugin.error.value" show-icon><template #action><a-button size="small" @click="plugin.retry">{{ $t('collectorWorkspace.retry') }}</a-button></template></a-alert>
        <div class="cw-plugin-form"><RenderComponents v-if="plugin.source.value" :value="plugin.source.value" @error="onPluginError" /></div>
      </a-spin>
      <section class="cw-point-settings" :aria-label="$t('collectorWorkspace.acquisitionSettings')">
        <div class="cw-settings-title"><AIcon type="ControlOutlined" />{{ $t('collectorWorkspace.acquisitionSettings') }}</div>
        <PointDecoding v-if="plugin.capabilities.value.autoCodec === false" :model="model" :capabilities="plugin.capabilities.value" />
        <div class="cw-form-grid">
          <a-form-item v-if="accessModes.includes('read') || !accessModes.length" name="interval" :label="$t('collectorWorkspace.interval')" :rules="[{ type: 'number', min: 0 }]"><a-input-number v-model:value="model.interval" :min="0" :precision="0" style="width:100%" /></a-form-item>
          <a-form-item name="accessModes" :label="$t('collectorWorkspace.access')"><ConfigSelect v-model:value="accessModes" mode="multiple" :options="modeOptions" :max-tag-count="1" /></a-form-item>
        </div>
      </section>
      <ProcessingRules ref="rules" :model="model" :capabilities="plugin.capabilities.value" />
      <div v-if="error || pluginError" class="cw-error" role="alert">{{ error || pluginError }}</div>
      <div class="cw-editor-footer"><small class="cw-muted">{{ $t(dirty ? 'collectorWorkspace.unsaved' : 'collectorWorkspace.applied') }}</small><a-button size="small" :disabled="!dirty || saving" @click="$emit('restore')">{{ $t('collectorWorkspace.restore') }}</a-button><j-permission-button size="small" type="primary" :hasPermission="model.id.startsWith('_new:') ? 'data-collect:add' : 'data-collect:update'" :loading="saving" :disabled="!dirty || !!pluginError || !!plugin.error.value" @click="apply"><AIcon type="CheckOutlined" />{{ $t('collectorWorkspace.apply') }}</j-permission-button></div>
    </a-form>
  </section>
</template>
<script setup lang="ts">
import { computed, ref } from 'vue'
import type { FormInstance } from 'ant-design-vue'
import { IconValueEditor } from '@jetlinks-web-core/components/IconValue'
import { accessValues, type CollectorObject } from '../../../../types/workspace'
import { usePointPlugin } from '../../hook/usePointPlugin'
import RenderComponents from '../../../../components/RenderComponents'
import PointDecoding from './PointDecoding.vue'
import ProcessingRules from './ProcessingRules.vue'
import WorkspaceIcon from './WorkspaceIcon.vue'
import ConfigSelect from '../../../../components/ConfigSelect.vue'
import { accessOption } from '../../../../utils/configOptions'
import { useI18n } from 'vue-i18n'
import { _validateField } from '../../../../api/data-collect/collector'
const { t } = useI18n()
const props = defineProps<{ model: CollectorObject; collector: CollectorObject; dirty: boolean; saving: boolean; error?: string }>()
const emit = defineEmits<{ apply: [validate: () => Promise<unknown>]; restore: []; trial: []; close: [] }>()
const form = ref<FormInstance>(), rules = ref<InstanceType<typeof ProcessingRules>>(), pluginError = ref('')
const plugin = usePointPlugin(props.model, props.collector)
const initialKey = props.model.pointKey
const accessModes = computed({ get: () => accessValues(props.model), set: (value: string[]) => { props.model.accessModes = value } })
const modeOptions = computed(() => (plugin.capabilities.value.accessModes || accessModes.value.map(value => ({ value, text: value }))).map(item => accessOption(item.value, item.text, t)))
function onPluginError(cause: Error) { pluginError.value = cause.message }
async function validateKey() {
  if (!props.model.pointKey || !props.model.id.startsWith('_new:') && props.model.pointKey === initialKey) return
  const response = await _validateField(props.collector.id, { pointKey: props.model.pointKey, id: props.model.id.startsWith('_new:') ? undefined : props.model.id })
  if (!response.success || response.result?.passed === false) throw new Error(response.result?.reason || response.message || t('collectorWorkspace.identifierDuplicate'))
}
function apply() { emit('apply', async () => { await form.value?.validate(); await rules.value?.validate() }) }
</script>
