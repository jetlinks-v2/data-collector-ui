<template>
  <div>
    <a-form :model="formData" ref="formRef" layout="vertical">
      <TitleComponent data="点位信息"/>
      <!-- todo: 点位信息:动态加载每个provider的点位信息-->
      <DataParsing/>
      <CollectionConfiguration/>
      <DataConversion/>
    </a-form>
  </div>
</template>

<script setup>
import DataParsing from "@data-collector-ui/views/data-collect/components/Config/DataParsing.vue";
import CollectionConfiguration
  from "@data-collector-ui/views/data-collect/components/Config/CollectionConfiguration.vue";
import DataConversion from "@data-collector-ui/views/data-collect/components/Config/DataConversion.vue";

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
