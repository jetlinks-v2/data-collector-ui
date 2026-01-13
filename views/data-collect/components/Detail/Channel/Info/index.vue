<template>
  <div>
    <template v-if="jsonData">
      <TitleComponent :data="$t('DataCollect.index.400156-0')"/>
      <a-form :model="formData" ref="formRef">
        <RenderComponents
            v-if="jsonData"
            :value="jsonData"
        />
      </a-form>
    </template>
    <TitleComponent :data="$t('DataCollect.index.400156-1')"/>
    <PointDataVolume type="channel" :id="info.id" />
    <AbnormalDataTrend type="channel" :id="info.id" />
  </div>
</template>

<script setup>
import RenderComponents from "@data-collector-ui/components/RenderComponents";
import {devGetProtocol} from "@data-collector-ui/utils/utils";
import PointDataVolume from '../../Echarts/PointDataVolume.vue'
import AbnormalDataTrend from '../../Echarts/AbnormalDataTrend.vue'
import {useI18n} from "vue-i18n";

const {t: $t} = useI18n();

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
