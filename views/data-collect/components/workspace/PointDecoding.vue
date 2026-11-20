<template>
  <div class="cw-decoding-fields">
    <a-form-item :label="$t('collectorWorkspace.dataType')" :name="['managedConfiguration','codec']" :rules="[{required:true}]">
      <ConfigSelect v-model:value="model.managedConfiguration!.codec" :options="codecs.map(codec => ({value:codec.id,label:codec.name || codec.id}))" :loading="loading" kind="codec" show-search />
      <a-button v-if="failed" type="link" size="small" @click="retry">{{ $t('collectorWorkspace.loadFailed') }}</a-button>
    </a-form-item>
    <a-form-item :label="$t('collectorWorkspace.byteOrder')" :name="['managedConfiguration','byteLayout']">
      <ConfigSelect v-model:value="model.managedConfiguration!.byteLayout" :options="byteLayoutOptions.map(option => byteOrderOption(option.value, t))" :placeholder="$t('collectorBatchDefault')" allow-clear />
    </a-form-item>
  </div>
</template>
<script setup lang="ts">
import type { CollectorObject, PointCapabilities } from '../../../../types/workspace'
import { byteLayoutOptions } from '../Config/data'
import { useI18n } from 'vue-i18n'
import { toRef } from 'vue'
import { usePointCodecs } from '../../hook/usePointCodecs'
import ConfigSelect from '../../../../components/ConfigSelect.vue'
import { byteOrderOption } from '../../../../utils/configOptions'
const { t } = useI18n()
const props = defineProps<{ model: CollectorObject; capabilities: PointCapabilities }>()
const { codecs, loading, failed, retry } = usePointCodecs(toRef(props, 'capabilities'))
</script>
