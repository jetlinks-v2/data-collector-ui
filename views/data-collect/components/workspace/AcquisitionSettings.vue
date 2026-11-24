<template>
  <div class="cw-content-fields cw-acquisition-fields">
    <a-form-item v-if="accessModes.includes('read') || !accessModes.length" name="interval" :label="$t('collectorEditing.period')" :rules="[{ type: 'number', min: 0 }]"><I18nT keypath="collectorEditing.every" scope="global" tag="span" class="cw-period-value"><template #value><a-input-number v-model:value="model.interval" :min="0" :precision="0" :controls="false" :aria-label="$t('collectorEditing.period')" /></template></I18nT></a-form-item>
    <a-form-item name="accessModes" :label="$t('collectorWorkspace.access')"><ConfigSelect v-model:value="accessModes" kind="access" mode="multiple" :options="modeOptions" :aria-label="$t('collectorWorkspace.access')" /></a-form-item>
    <PointDecoding v-if="decoding && capabilities.autoCodec === false" :model="model" :capabilities="capabilities" />
  </div>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import { I18nT, useI18n } from 'vue-i18n'
import { accessValues, type CollectorObject, type PointCapabilities } from '../../../../types/workspace'
import { accessOption } from '../../../../utils/configOptions'
import ConfigSelect from '../../../../components/ConfigSelect.vue'
import PointDecoding from './PointDecoding.vue'

// Point edits and new-point defaults share values, candidate semantics and validation.
const props = defineProps<{ model: CollectorObject; capabilities: PointCapabilities; decoding?: boolean }>()
const { t } = useI18n()
const accessModes = computed({ get: () => accessValues(props.model), set: (value: string[]) => { props.model.accessModes = value } })
const modeOptions = computed(() => (props.capabilities.accessModes || accessModes.value.map(value => ({ value, text: value }))).map(item => accessOption(item.value, item.text, t)))
</script>
