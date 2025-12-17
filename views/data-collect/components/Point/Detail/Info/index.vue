<template>
  <div>
    <a-form :model="formData" ref="formRef" layout="vertical">
      <TitleComponent data="点位信息"/>
      <!-- todo: 点位信息:动态加载每个provider的点位信息-->
      <RenderComponents
          :key="data.id + (data.state?.value || data.state)"
          v-if="data.id && data.provider !== 'COLLECTOR_GATEWAY' && jsonData" :value="jsonData"
      />
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
import {devGetProtocol} from "@data-collector-ui/utils/utils";
import RenderComponents from "@data-collector-ui/components/RenderComponents/RenderComponents.vue";

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
const jsonData = ref();
provide('formData', formData)

const getProtocol = async () => {
  jsonData.value = await devGetProtocol(props.data?.provider || 'MODBUS_TCP', "pointDetail");
};

getProtocol();
</script>

<style lang="less" scoped>

</style>
