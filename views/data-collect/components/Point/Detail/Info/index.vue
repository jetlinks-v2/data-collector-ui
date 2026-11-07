<template>
  <div>
    <a-form :model="formData" ref="formRef">
      <TitleComponent :data="$t('DataCollect.index.400151-40')"/>
      <RenderComponents
          v-if="jsonData"
          :value="jsonData"
      />
      <DataParsing v-if="configuration.autoCodec === false" :showSwitch="false"/>
      <CollectionConfiguration :showSwitch="false"/>
      <DataConversion/>
    </a-form>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import DataParsing from '../../../Config/DataParsing.vue'
import CollectionConfiguration from '../../../Config/CollectionConfiguration.vue'
import DataConversion from '../../../Config/DataConversion.vue'
import RenderComponents from '@data-collector-ui/components/RenderComponents/RenderComponents.vue'
import { usePointDetailForm } from '../usePointDetailForm'
import { usePointDetailMetadata } from '../usePointDetailMetadata'
const { t: $t } = useI18n()
const { info, formData, formRef, flush, isDirty, discard } = usePointDetailForm({ syncInterval: true })
const { jsonData, configuration } = usePointDetailMetadata(info)
defineExpose({ flush, isDirty, discard })
</script>
