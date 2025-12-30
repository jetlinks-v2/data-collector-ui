<template>
  <div>
    <p>下述配置仅作用于点位，其下属点位默认值自动继承此规则</p>
    <a-form :model="formData" ref="formRef" layout="vertical">
      <DataParsing :showSwitch="false"/>
      <CollectionConfiguration :showSwitch="false"/>
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
import {DATA_COLLECTOR_CONFIG_TYPE, DATA_COLLECTOR_SAVE_TYPE} from "@data-collector-ui/views/data-collect/data";

const info = inject('collector-info', ref({}))

const formData = reactive({});
const formRef = ref(null)

watch(() => info.value, () => {
  Object.assign(formData, info.value)
  formData.accessModes = map(formData.accessModes, 'value')
  formData.features = map(formData.features, 'value')
  Object.assign(formData, formData.configuration?.template || {})
}, {
  immediate: true
})

provide('plugin-form', formData)
provide(DATA_COLLECTOR_SAVE_TYPE, 'collector')
provide(DATA_COLLECTOR_CONFIG_TYPE, true) // 是否需要立即保存
</script>

<style lang="less" scoped>

</style>
