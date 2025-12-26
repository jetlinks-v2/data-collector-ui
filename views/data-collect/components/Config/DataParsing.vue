<template>
  <Collapsible
      title="数据解析"
      tip="将点位原始数据解析为平台可用数值或状态"
      v-model:value="data"
      :showSwitch="showSwitch"
      @change="onSwitchChange"
  >
    <template #extraTemplate>
      <a-descriptions :column="1">
        <a-descriptions-item label="数据类型">
          <j-ellipsis>
            {{ collector?.managedConfiguration?.codec || '-' }}
          </j-ellipsis>
        </a-descriptions-item>
        <a-descriptions-item label="内存布局">
          <j-ellipsis>
            {{ collector?.managedConfiguration?.byteLayout || '-' }}
          </j-ellipsis>
        </a-descriptions-item>
      </a-descriptions>
    </template>
    <a-row :gutter="24">
      <a-col :span="12">
        <a-form-item
            label="数据类型"
            :name="['managedConfiguration', 'codec']"
            :rules="[{required: true, message: '请选择'}]"
        >
          <a-select v-model:value="formData.managedConfiguration.codec" placeholder="请选择"
                    :options="dataTypeOptions"/>
        </a-form-item>
      </a-col>
      <a-col :span="12">
        <a-form-item
            label="内存布局"
            :name="['managedConfiguration', 'byteLayout']"
            :rules="[{required: true, message: '请选择'}]"
        >
          <a-select
              v-model:value="formData.managedConfiguration.byteLayout"
              placeholder="请选择"
              :options="memoryOptions"
          />
        </a-form-item>
      </a-col>
    </a-row>
  </Collapsible>
</template>

<script setup>
import Collapsible from "./Collapsible/index.vue";
import {queryCodecProvider} from "@data-collector-ui/api/data-collect/collector";

const props = defineProps({
  showSwitch: {
    type: Boolean,
    default: true
  }
})

const formData = inject('plugin-form', reactive({}))
const collector = inject('point-form-collector', {})
let firstRender = true

if (!('managedConfiguration' in formData)) {
  formData.managedConfiguration = {
    byteLayout: undefined,
    codec: undefined,
    converter: {
      enabled: false
    },
    outlier: {
      enabled: false
    },
    deadband: {
      enabled: false
    },
    handler: {
      enabled: false
    },
  }
}

const data = ref(!props.showSwitch)
const dataTypeOptions = ref([])
const memoryOptions = [
  {
    "label": "AB",
    "value": "AB"
  },
  {
    "label": "BA",
    "value": "BA"
  },
  {
    "label": "AB_CD",
    "value": "AB_CD"
  },
  {
    "label": "CD_AB",
    "value": "CD_AB"
  },
  {
    "label": "BA_DC",
    "value": "BA_DC"
  },
  {
    "label": "DC_BA",
    "value": "DC_BA"
  },
  {
    "label": "AB_CD_EF_GH",
    "value": "AB_CD_EF_GH"
  },
  {
    "label": "GH_EF_CD_AB",
    "value": "GH_EF_CD_AB"
  },
  {
    "label": "BA_DC_FE_HG",
    "value": "BA_DC_FE_HG"
  },
  {
    "label": "HG_FE_DC_BA",
    "value": "HG_FE_DC_BA"
  }
]

const onSwitchChange = (val) => {
  formData.managedConfiguration = {
    ...formData.managedConfiguration,
    codec: val === 'template' ? collector?.managedConfiguration?.codec : undefined,
    byteLayout: val === 'template' ? collector?.managedConfiguration?.byteLayout : undefined,
  }
}

onMounted(() => {
  queryCodecProvider().then(res => {
    if (res.success) {
      dataTypeOptions.value = res.result.map(item => ({
        label: item.name,
        value: item.id,
      }))
    }
  })
})

watch(() => formData.managedConfiguration.codec, () => {
  if (firstRender) {
    data.value = !!(formData?.managedConfiguration?.codec && formData?.managedConfiguration?.byteLayout)
    firstRender = false
  }
}, {
  immediate: true
})
</script>

<style lang="less" scoped>

</style>
