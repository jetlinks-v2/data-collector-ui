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
    <PointDataVolume type="channel" :id="info.id" />
    <AbnormalDataTrend type="channel" :id="info.id" />
  </div>
</template>

<script setup>
import RenderComponents from "@data-collector-ui/components/RenderComponents";
import {devGetProtocol} from "@data-collector-ui/utils/utils";
import PointDataVolume from '../../Echarts/PointDataVolume.vue'
import AbnormalDataTrend from '../../Echarts/AbnormalDataTrend.vue'

const emits = defineEmits(['save'])
const info = inject('channel-info', ref({}))
const jsonData = ref();
const formData = reactive({
  configuration: {},
});
const formRef = ref()
const onChange = async () => {
  jsonData.value = await devGetProtocol(info.value.provider, "channelDetail");
};

watch(() => info.value, () => {
  onChange(info.value)
  Object.assign(formData, info.value)
}, {
  immediate: true
})

provide("plugin-channel-detail-form", formData);
provide("plugin-channel-detail-events", {
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
