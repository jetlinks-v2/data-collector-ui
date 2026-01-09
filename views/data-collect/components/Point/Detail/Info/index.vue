<template>
  <div>
    <a-form :model="formData" ref="formRef">
      <TitleComponent data="点位配置"/>
      <RenderComponents
          v-if="jsonData"
          :value="jsonData"
      />
      <template v-if="configuration?.autoCodec === false">
        <DataParsing/>
      </template>
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
import {DATA_COLLECTOR_CONFIG_TYPE, PLUGIN_DETAIL_SAVE_EVENTS} from "@data-collector-ui/views/data-collect/data";
import {getPointMetadata} from "@data-collector-ui/views/data-collect/utils";

const emits = defineEmits(['save'])

const info = inject('point-info', ref({}))
const errorList = inject('point-info-error-list', ref([]))

const formData = reactive({});
const formRef = ref(null)
const jsonData = ref();
const configuration = ref({})
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
provide(PLUGIN_DETAIL_SAVE_EVENTS, {
  onValueChange: async () => {
    const res = await formRef.value?.validate().catch((err) => {
      errorList.value = err
    })
    // 校验表单  保存
    if (res) {
      emits('save', formData)
    }
  }
});
provide(DATA_COLLECTOR_CONFIG_TYPE, true) // 是否需要立即保存
provide('metadata-configuration', configuration)
provide('point-metadata-events', {
  pointMetadataEvents: async (provider, _configuration) => {
    if (_configuration) {
      getPointMetadata(provider, _configuration).then((res) => {
        configuration.value = res
      })
    } else {
      configuration.value = {}
    }
  }
})
</script>

<style lang="less" scoped>

</style>
