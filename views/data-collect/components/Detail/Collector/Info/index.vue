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
    <PointStatusStatistics/>
    <AbnormalDataTrend/>
  </div>
</template>

<script setup>
import PointDataVolume from "../../../Detail/Echarts/PointDataVolume.vue";
import PointStatusStatistics from "../../../Detail/Echarts/PointStatusStatistics.vue";
import AbnormalDataTrend from "../../../Detail/Echarts/AbnormalDataTrend.vue";
import RenderComponents from "@data-collector-ui/components/RenderComponents";
import {devGetProtocol} from "@data-collector-ui/utils/utils";

const props = defineProps({
  data: {
    type: Object,
    default: () => ({})
  }
})

const jsonData = ref();
const formData = reactive({
  channelId: undefined,
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
const formRef = ref()
const onChange = async (node) => {
  jsonData.value = await devGetProtocol(node.provider, "collectorDetail");
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
