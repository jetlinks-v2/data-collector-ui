<template>
  <Collapsible title="异常判断" tip="定义正常数据范围（仅适用于数值类型）,异常数据默认丢弃" v-model:value="data"
               :show-switch="showSwitch" @change="onSwitchChange">
    <template #extraTemplate>
      木有写
    </template>
    <TermsCascader
        v-model:value="terms"
        :builtinOptions="builtinParams"
        :showValueType="false"
    />
  </Collapsible>
</template>

<script setup>
import Collapsible from "./Collapsible/index.vue";
import {useTermsParseConText} from "@jetlinks-web-core/components/TermsCascader/hooks";

const props = defineProps({
  showSwitch: {
    type: Boolean,
    default: true
  }
})
const data = ref(!props.showSwitch)

const formData = inject('plugin-form', reactive({}))
const collector = inject('point-form-collector', {})
let firstRender = true // 第一次渲染
const options = ref([
  {title: '正常点位值', key: 'current', fullName: '正常点位值', dataType: 'number', termTypes: [{name: '在...之间', id: 'btw'}]}
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

watch(() => formData.managedConfiguration?.outlier?.enabled, (val) => {
  if (firstRender) {
    data.value = !!val
    firstRender = false
  }
}, {
  immediate: true
})
</script>

<style lang="less" scoped>

</style>
