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

const props = defineProps({
  data: {
    type: Object,
    default: () => ({})
  }
})
const formData = reactive({
  name: '',
  configuration: props.data.configuration || {
    valueType: undefined,
    terms: [],
    pointAddress: "",
    interval: 3000,
  },
  accessModes: [],
  features: [],
  description: props.data.description || "",
});
const formRef = ref(null)

provide('formData', formData)
</script>

<style lang="less" scoped>

</style>
