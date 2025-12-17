<template>
  <div>
    <template v-if="jsonData">
      <TitleComponent data="基本参数"/>
      <a-form :model="formData" ref="formRef" layout="vertical">
        <RenderComponents
            v-if="jsonData"
            :value="jsonData"
        />
      </a-form>
    </template>
    <TitleComponent data="数据图表"/>
    <PointDataVolume/>
    <AbnormalDataTrend/>
  </div>
</template>

<script setup>
import RenderComponents from "@data-collector-ui/components/RenderComponents";
import {devGetProtocol} from "@data-collector-ui/utils/utils";
import PointDataVolume from '../../Echarts/PointDataVolume.vue'
import AbnormalDataTrend from '../../Echarts/AbnormalDataTrend.vue'

const props = defineProps({
  data: {
    type: Object,
    default: () => ({})
  }
})

const jsonData = ref();
const formData = reactive({
  id: undefined,
  type: "device",
  name: undefined,
  description: undefined,
  configuration: {},
  circuitBreaker: {
    type: "Ignore",
  },
});
const formRef = ref()
const onChange = async (node) => {
  jsonData.value = await devGetProtocol(node.provider, "channelDetail");
};

watch(() => props.data, () => {
  onChange(props.data)
  Object.assign(formData, props.data)
}, {
  immediate: true
})

provide("plugin-form", formData);
</script>

<style lang="less" scoped>

</style>
