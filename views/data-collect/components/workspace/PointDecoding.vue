<template>
  <div class="cw-form-grid">
    <a-form-item :label="$t('collectorWorkspace.dataType')" :name="['managedConfiguration','codec']" :rules="[{required:true}]">
      <ConfigSelect v-model:value="model.managedConfiguration!.codec" :options="(capabilities.supportCodecs || []).map(codec => ({value:codec.id,label:codec.name || codec.id}))" kind="codec" show-search />
    </a-form-item>
    <a-form-item :label="$t('collectorWorkspace.byteOrder')" :name="['managedConfiguration','byteLayout']" :rules="[{required:true}]">
      <ConfigSelect v-model:value="model.managedConfiguration!.byteLayout" :options="byteLayoutOptions.map(option => byteOrderOption(option.value, t))" />
    </a-form-item>
  </div>
</template>
<script setup lang="ts">
import type { CollectorObject, PointCapabilities } from '../../../../types/workspace'
import { byteLayoutOptions } from '../Config/data'
import { useI18n } from 'vue-i18n'
import ConfigSelect from '../../../../components/ConfigSelect.vue'
import { byteOrderOption } from '../../../../utils/configOptions'
const { t } = useI18n()
defineProps<{ model: CollectorObject; capabilities: PointCapabilities }>()
</script>
