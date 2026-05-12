<template>
  <div class="scan-plugin">
    <RenderComponents v-if="jsonData" ref="renderRef" :value="jsonData"/>
  </div>
</template>

<script setup>
import RenderComponents from "@data-collector-ui/components/RenderComponents/RenderComponents.vue";
import {devGetProtocol} from "@data-collector-ui/utils/utils";
import {savePointBatch} from "@data-collector-ui/api/data-collect/collector";

const props = defineProps({
  collector: {
    type: Object,
    default: () => ({})
  }
})

const renderRef = ref()
const jsonData = ref()
const scanSetting = inject('plugin-scan-point', ref({
  columns: [],
  selectedData: [],
  handleData: undefined,
}))
const collectorData = computed(() => props.collector || {})

provide('collector-data', collectorData)

const handleSave = async () => {
  const data = await renderRef.value?.onSave?.()
  const handleData = scanSetting.value?.handleData

  if (data === false) {
    return {
      success: false,
      validated: false,
    }
  }

  if (!data?.length || typeof handleData !== 'function') {
    return {
      success: false,
      validated: true,
      empty: true,
    }
  }

  const list = handleData(data)

  if (!Array.isArray(list) || !list.length) {
    return {
      success: false,
      validated: true,
      empty: true,
    }
  }

  const resp = await savePointBatch(list)
  return {
    success: !!resp?.success,
    response: resp,
  }
}

watch(
    () => props.collector?.provider,
    async (provider) => {
      scanSetting.value = {
        columns: [],
        selectedData: [],
        handleData: undefined,
      }
      jsonData.value = provider ? await devGetProtocol(provider, 'scan') : undefined
    },
    { immediate: true },
)

defineExpose({
  handleSave,
})
</script>

<style scoped lang="less">
.scan-plugin {
  min-height: 0;
  height: 100%;
}
</style>
