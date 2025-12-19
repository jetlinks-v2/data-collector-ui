<template>
  <a-modal open title="新增多条" :width="700" @cancel="emit('close')" @ok="onSave">
    <RenderComponents v-if="jsonData" :value="jsonData"/>
  </a-modal>
</template>

<script setup>
import {devGetProtocol} from "@data-collector-ui/utils/utils";
import RenderComponents from "@data-collector-ui/components/RenderComponents/RenderComponents.vue";

const props = defineProps({
  provider: {
    type: String,
    default: () => '',
  }
})
const emit = defineEmits(['close', 'save'])
const jsonData = ref();
const formValidateFn = ref(null)
const getPointBatchConfig = async (val) => {
  jsonData.value = await devGetProtocol(val, "pointBatchModal");
};

watch(() => props.provider, (val) => {
  if (val) {
    getPointBatchConfig(val);
  }
}, {
  immediate: true
})

const onSave = async () => {
  const list = await formValidateFn.value?.()
  if (list) {
    // 获取点位数组
    const arr = list.map((item) => ({
      ...item,
      name: undefined,
      features: [],
      accessModes: []
    }))
    emit('save', arr)
    emit('close')
  }
}

provide('point-batch-actions', (fn) => {
  formValidateFn.value = fn
})
</script>

<style lang="less" scoped>

</style>
