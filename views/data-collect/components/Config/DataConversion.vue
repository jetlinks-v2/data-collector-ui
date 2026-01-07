<template>
  <Collapsible
      title="数据转换"
      tip="对数值进行缩放,换算或映射处理"
      v-model:value="data"
      :show-switch="showSwitch"
      @change="onSwitchChange"
      @outside="onOutsize"
      :showExtra="showExtra"
  >
    <template #extraTemplate>
      <a-descriptions :column="1">
        <a-descriptions-item label="缩放因子">
          <j-ellipsis>
            {{ collector?.managedConfiguration?.converter?.configuration?.factor || '-' }}
          </j-ellipsis>
        </a-descriptions-item>
        <a-descriptions-item label="小数位保留数">
          <j-ellipsis>
            {{ collector?.managedConfiguration?.converter?.configuration?.scale || '-' }}
          </j-ellipsis>
        </a-descriptions-item>
      </a-descriptions>
    </template>
    <a-row :gutter="24">
      <a-col :span="12">
        <a-form-item
            :name="[
              'managedConfiguration',
              'converter',
              'configuration',
              'factor',
            ]"
            label="缩放因子"
            :rules="[
              {
                required: true,
                message: '请输入'
              }
            ]"
        >
          <a-input-number
              v-model:value="formData.managedConfiguration.converter.configuration.factor"
              :controls="false"
              :max="65535"
              placeholder="请输入"
              style="width: 100%"
              type="number"
          />
        </a-form-item>
      </a-col>
      <a-col :span="12">
        <a-form-item
            :name="['managedConfiguration', 'converter', 'configuration', 'scale']"
            label="小数位保留数"
        >
          <a-input-number
              v-model:value="formData.managedConfiguration.converter.configuration.scale"
              :controls="false"
              :max="65535"
              :min="0"
              :precision="0"
              placeholder="请输入"
              style="width: 100%"
          />
        </a-form-item>
      </a-col>
    </a-row>
  </Collapsible>
</template>

<script setup>
import Collapsible from "./Collapsible/index.vue";
import {inject} from "vue";
import {DATA_COLLECTOR_CONFIG_TYPE} from "@data-collector-ui/views/data-collect/data";

const props = defineProps({
  showSwitch: {
    type: Boolean,
    default: true
  }
})
const data = ref(!props.showSwitch)

const formData = inject('plugin-form', reactive({}))
const collector = inject('point-form-collector', {})
const events = inject("plugin-point-detail-events");

const __type = inject(DATA_COLLECTOR_CONFIG_TYPE, false)
let firstRender = true // 第一次渲染

if (!('managedConfiguration' in formData)) {
  formData.managedConfiguration = {
    byteLayout: undefined,
    codec: undefined,
    converter: {
      enabled: false,
      provider: 'scale',
      configuration: {
        factor: 1,
        scale: 3
      },
    },
    outlier: {
      enabled: false,
    },
    deadband: {
      enabled: false,
    },
    handler: {
      enabled: false,
    },
  }
}

if (!('converter' in formData.managedConfiguration)) {
  formData.managedConfiguration.converter = {
    enabled: false,
    provider: 'scale',
    configuration: {
      factor: 1,
      scale: 3
    },
  }
}

if (!('configuration' in formData.managedConfiguration.converter)) {
  formData.managedConfiguration.converter.configuration = {
    factor: 1,
    scale: 3
  }
}

const showExtra = computed(() => {
  return collector.managedConfiguration?.converter?.configuration?.scale !== undefined && collector.managedConfiguration?.converter?.configuration?.factor !== undefined
})

const onSwitchChange = (val) => {
  formData.managedConfiguration = {
    ...formData.managedConfiguration,
    converter: {
      ...formData.managedConfiguration.converter,
      enabled: !!val,
      configuration: {
        ...formData.managedConfiguration.converter.configuration,
        factor: val === 'template' ? collector?.managedConfiguration?.converter?.configuration?.factor : undefined,
        scale: val === 'template' ? collector?.managedConfiguration?.converter?.configuration?.scale : undefined
      }
    }
  }
}

const onOutsize = () => {
  if (__type) {
    const arr = [
      {
        name: ['managedConfiguration', 'converter'],
        value: formData.managedConfiguration.converter
      },
    ]
    events.onValueChange(arr)
  }
}

watch(() => formData.managedConfiguration?.converter?.enabled, (val) => {
  if (firstRender && __type) {
    data.value = !!val
    firstRender = false
  }
}, {
  immediate: true
})
</script>

<style lang="less" scoped>

</style>
