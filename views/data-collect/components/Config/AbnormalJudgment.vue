<template>
  <Collapsible
      title="异常判断"
      tip="定义正常数据范围（仅适用于数值类型）,异常数据默认丢弃"
      v-model:value="data"
      :show-switch="showSwitch"
      @change="onSwitchChange"
      @outside="onOutsize"
      :showExtra="showExtra"
  >
    <template #extraTemplate>
      <a-descriptions :column="1">
        <a-descriptions-item label="异常值范围">
          <j-ellipsis>
            {{
              `${collector?.managedConfiguration?.outlier?.configuration?.min}~${collector?.managedConfiguration?.outlier?.configuration?.max}`
            }}
          </j-ellipsis>
        </a-descriptions-item>
      </a-descriptions>
    </template>
    <!--    todo: 需要校验值的大小和必填-->
    <a-form-item
        :name="['managedConfiguration', 'outlier', 'configuration']"
        :rules="[
            {
validator: validatorValue,
            }
        ]"
    >
      <TermsCascader
          v-model:value="terms"
          :builtinOptions="builtinParams"
          :showValueType="false"
      />
    </a-form-item>
  </Collapsible>
</template>

<script setup>
import Collapsible from "./Collapsible/index.vue";
import {useTermsParseConText} from "@jetlinks-web-core/components/TermsCascader/hooks";
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
const options = ref([
  {
    title: '正常点位值',
    key: 'current',
    fullName: '正常点位值',
    dataType: 'number',
    termTypes: [{name: '在...之间', id: 'btw'}]
  }
])
const optionsMap = ref(new Map())
optionsMap.value.set('current', options.value[0])

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

if (!('outlier' in formData.managedConfiguration)) {
  formData.managedConfiguration.outlier = {
    enabled: false,
    provider: undefined,
    configuration: {},
  }
}

if (!('configuration' in formData.managedConfiguration.outlier)) {
  formData.managedConfiguration.outlier.configuration = {}
}

useTermsParseConText({options: options, map: optionsMap});

const terms = ref({
  column: 'current',
  termType: 'btw',
  value: []
})

const builtinParams = [
  {label: '当前用户', value: 'userId'},
  {label: '当前时间', value: 'timestamp'}
]

const showExtra = computed(() => {
  return !!collector.managedConfiguration?.outlier?.enabled
})

const validatorValue = (_rule, value) => new Promise(async (resolve, reject) => {
  // todo: 校验判断
  console.log(value)
  // if (!value) return resolve("");
  // if (!(regIP.test(value) || regIPv6.test(value) || regDomain.test(value))) {
  //   return reject($lang('MODBUS_TCP.channel.20250207-6'));
  // }
  return resolve("");
});

const onSwitchChange = (val) => {
  formData.managedConfiguration = {
    ...formData.managedConfiguration,
    outlier: {
      ...formData.managedConfiguration.outlier,
      enabled: !!val,
      configuration: {
        ...formData.managedConfiguration.outlier.configuration,
        min: val === 'template' ? collector?.managedConfiguration?.outlier?.configuration?.min : undefined,
        max: val === 'template' ? collector?.managedConfiguration?.outlier?.configuration?.max : undefined
      }
    }
  }

  console.log(formData.managedConfiguration.outlier)
}

const onOutsize = () => {
  console.log('outside')
  if (__type) {
    events.onValueChange('managedConfiguration', formData.managedConfiguration)
    console.log('outside')
  }
}

watch(() => formData.managedConfiguration?.outlier?.enabled, (val) => {
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
