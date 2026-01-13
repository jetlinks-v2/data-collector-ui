<template>
  <div>
    <p>{{ $t('DataCollect.index.400156-2') }}</p>
    <a-form :model="formData" ref="formRef" layout="vertical">
      <!--      <DataParsing :showSwitch="false" :value="true"/>-->
      <CollectionConfiguration :showSwitch="false" :value="true"/>
      <DataConversion/>
      <AbnormalJudgment/>
      <DeadZone/>
      <StorageConfiguration/>
      <ResultProcessing/>
    </a-form>
  </div>
</template>

<script setup>
import ResultProcessing from "@data-collector-ui/views/data-collect/components/Config/ResultProcessing.vue";
import DataConversion from "@data-collector-ui/views/data-collect/components/Config/DataConversion.vue";
import DeadZone from "@data-collector-ui/views/data-collect/components/Config/DeadZone.vue";
import AbnormalJudgment from "@data-collector-ui/views/data-collect/components/Config/AbnormalJudgment.vue";
import StorageConfiguration from "@data-collector-ui/views/data-collect/components/Config/StorageConfiguration.vue";
import DataParsing from "@data-collector-ui/views/data-collect/components/Config/DataParsing.vue";
import CollectionConfiguration
  from "@data-collector-ui/views/data-collect/components/Config/CollectionConfiguration.vue";
import {map} from "lodash-es";
import {
  DATA_COLLECTOR_CONFIG_TYPE,
  DATA_COLLECTOR_SAVE_TYPE,
  PLUGIN_DETAIL_SAVE_EVENTS
} from "@data-collector-ui/views/data-collect/data";
import {getPointMetadata} from "@data-collector-ui/views/data-collect/utils";
import {useI18n} from "vue-i18n";

const {t: $t} = useI18n();

const emits = defineEmits(['save'])
const info = inject('collector-info', ref({}))

const formData = reactive({});
const formRef = ref(null)
const configuration = ref({})

watch(() => info.value, () => {
  Object.assign(formData, info.value)
  formData.accessModes = map(formData.accessModes, 'value')
  formData.features = map(formData.features, 'value')
  Object.assign(formData, formData.configuration?.template || {
    managedConfiguration: {
      byteLayout: undefined,
      codec: undefined,
      converter: {
        enabled: false
      },
      outlier: {
        enabled: false
      },
      deadband: {
        enabled: false
      },
      handler: {
        enabled: false
      },
    }
  })
}, {
  immediate: true
})

provide('plugin-form', formData)
provide(DATA_COLLECTOR_SAVE_TYPE, 'collector')
provide(PLUGIN_DETAIL_SAVE_EVENTS, {
  onValueChange: async (arr) => {
    const res = await formRef.value?.validate(arr.map(i => i.name))
    // 校验表单  保存
    if (res) {
      emits('save', arr)
    }
  }
});
provide('metadata-configuration', configuration)
provide(DATA_COLLECTOR_CONFIG_TYPE, true) // 是否需要立即保存

watch(() => formData?.provider, (val) => {
  if (val) {
    getPointMetadata(val, {}).then((res) => {
      configuration.value = res
    })
  }
}, {
  immediate: true
})
</script>

<style lang="less" scoped>

</style>
