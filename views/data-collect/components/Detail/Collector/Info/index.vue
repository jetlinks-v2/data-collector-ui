<template>
  <div>
    <template v-if="jsonData">
      <TitleComponent data="基本参数"/>
      <a-form :model="formData" ref="formRef">
        <RenderComponents
            v-if="jsonData"
            :value="jsonData"
        />
      </a-form>
    </template>
    <TitleComponent data="数据图表"/>
    <PointDataVolume type="collector" :id="info.id" />
    <PointStatusStatistics />
    <AbnormalDataTrend type="collector" :id="info.id" />
  </div>
</template>

<script setup>
import PointDataVolume from "../../../Detail/Echarts/PointDataVolume.vue";
import PointStatusStatistics from "../../../Detail/Echarts/PointStatusStatistics.vue";
import AbnormalDataTrend from "../../../Detail/Echarts/AbnormalDataTrend.vue";
import RenderComponents from "@data-collector-ui/components/RenderComponents";
import {devGetProtocol} from "@data-collector-ui/utils/utils";

const emits = defineEmits(['save'])

const info = inject('collector-info', ref({}))
const jsonData = ref();

const formData = reactive({
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
});
const formRef = ref()
const onChange = async (node) => {
  jsonData.value = await devGetProtocol(node.provider, "collectorDetail");
};

watch(() => info.value, () => {
  onChange(info.value)
  Object.assign(formData, info.value)
}, {
  immediate: true
})

provide("plugin-collector-detail-form", formData);
provide("plugin-collector-detail-events", {
  onValueChange: async (arr) => {
    const res = await formRef.value?.validate(arr.map(i => i.name))
    // 校验表单  保存
    if (res) {
      emits('save', arr)
    }
  }
});
</script>

<style lang="less" scoped>

</style>
