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

const props = defineProps({
  data: {
    type: Object,
    default: () => ({})
  }
})

const formData = reactive({
  name: '',
  collectorProvider: undefined,
  configuration: {
    unitId: '',
    type: undefined,
    endian: 'BIG',
    endianIn: 'BIG',
    requestTimeout: 2000,
    serializable: false,
    inheritBreakerSpec: {
      type: 'LowerFrequency',
    },
    configuration: {}
  },
  circuitBreaker: {
    // type: 'LowerFrequency',
    type: 'Ignore'
  },
  description: '',
});
provide("plugin-form", formData);

</script>

<style lang="less" scoped>

</style>
