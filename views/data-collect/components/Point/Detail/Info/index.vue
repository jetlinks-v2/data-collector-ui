<template>
  <div>
    <a-form :model="formData" ref="formRef">
      <TitleComponent data="点位配置"/>
      <RenderComponents
          v-if="jsonData"
          :value="jsonData"
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
import {map} from "lodash-es";
import {DATA_COLLECTOR_CONFIG_TYPE} from "@data-collector-ui/views/data-collect/data";

const info = inject('point-info', ref({}))

const formData = reactive({});
const formRef = ref(null)
const jsonData = ref();
const onChange = async (node) => {
  jsonData.value = await devGetProtocol(node.provider, "pointDetail");
};

watch(() => info.value, () => {
  onChange(info.value)
  Object.assign(formData, info.value)
  formData.accessModes = map(formData.accessModes, 'value')
  formData.features = map(formData.features, 'value')
}, {
  immediate: true
})

provide('plugin-form', formData)
provide("plugin-point-detail-events", {
  onValueChange: async (name, value) => {
    // 只校验当前name的字段,防止一个地方没校验通过影响另一个地方
    const res = await formRef.value?.validate(name)
    // 校验表单  保存
    if (res) {
      // emits('save', name, value)
    }
  }
});
provide(DATA_COLLECTOR_CONFIG_TYPE, true) // 是否需要立即保存
</script>

<style lang="less" scoped>

</style>
