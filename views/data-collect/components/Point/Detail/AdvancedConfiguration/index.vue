<template>
  <a-form :model="formData" ref="formRef" layout="vertical">
    <AbnormalJudgment/>
    <DeadZone/>
    <StorageConfiguration/>
    <ResultProcessing/>
  </a-form>
</template>

<script setup>
import DeadZone from "@data-collector-ui/views/data-collect/components/Config/DeadZone.vue";
import ResultProcessing from "@data-collector-ui/views/data-collect/components/Config/ResultProcessing.vue";
import StorageConfiguration from "@data-collector-ui/views/data-collect/components/Config/StorageConfiguration.vue";
import AbnormalJudgment from "@data-collector-ui/views/data-collect/components/Config/AbnormalJudgment.vue";
import {map} from "lodash-es";
import {DATA_COLLECTOR_CONFIG_TYPE} from "@data-collector-ui/views/data-collect/data";

const info = inject('point-info', ref({}))

const formRef = ref(null)
const formData = reactive({});

watch(() => info.value, () => {
  Object.assign(formData, info.value)
  formData.accessModes = map(formData.accessModes, 'value')
  formData.features = map(formData.features, 'value')
}, {
  immediate: true
})

provide('plugin-form', formData)
provide(DATA_COLLECTOR_CONFIG_TYPE, true) // 是否需要立即保存
</script>

<style lang="less" scoped>

</style>
