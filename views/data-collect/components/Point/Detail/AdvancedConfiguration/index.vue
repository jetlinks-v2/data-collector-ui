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
import {cloneDeep, map} from "lodash-es";
import {DATA_COLLECTOR_CONFIG_TYPE, PLUGIN_DETAIL_SAVE_EVENTS} from "@data-collector-ui/views/data-collect/data";

const emits = defineEmits(['save'])

const info = inject('point-info', ref({}))
const errorList = inject('point-info-error-list', ref([]))

const formRef = ref(null)
const formData = reactive({});

watch(() => info.value, () => {
  Object.assign(formData, cloneDeep(info.value))
  formData.accessModes = map(formData.accessModes, 'value')
  formData.features = map(formData.features, 'value')
}, {
  immediate: true
})

provide('plugin-form', formData)
provide(PLUGIN_DETAIL_SAVE_EVENTS, {
  onValueChange: async () => {
    const res = await formRef.value?.validate().catch((err) => {
      errorList.value = err.errorFields || []
    })
    // 校验表单  保存
    if (res) {
      emits('save', formData)
    } else {
      errorList.value = []
    }
  }
});
provide(DATA_COLLECTOR_CONFIG_TYPE, true) // 是否需要立即保存

defineExpose({
  onSave: async () => {
    const res = await formRef.value?.validate().catch((err) => {
      errorList.value = err.errorFields || []
    })
    if (res) {
      return true
    }
  }
})
</script>

<style lang="less" scoped>

</style>
