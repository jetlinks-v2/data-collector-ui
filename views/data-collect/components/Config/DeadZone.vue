<template>
  <Collapsible title="点位死区" tip="死区范围内的数据将被过滤（仅适用于数值类型）,减少抖动和冗余" v-model:value="data"
               :show-switch="showSwitch" @change="onSwitchChange">
    <template #extraTemplate>
      木有写
    </template>
    <div style="margin-bottom: 16px">
      <a-radio-group v-model:value="type" button-style="solid">
        <a-radio-button value="a">固定值</a-radio-button>
        <a-radio-button value="b">百分比</a-radio-button>
      </a-radio-group>
      <a-tooltip title="最近一次采集到的值与上一次采集值比对，数值浮动在百分比以内时将被过滤">
        <AIcon type="QuestionCircleOutlined" style="margin-left: 12px"/>
      </a-tooltip>
    </div>
    <template v-if="type === 'a'">
      <TermsCascaderGroup
          v-model:value="terms"
          :builtinOptions="builtinParams"
          :builtinOptionsMap="builtinParamsMap"
      >
      </TermsCascaderGroup>
    </template>
    <template v-else>
      <a-form-item
          :name="[
              'managedConfiguration',
              'converter',
              'configuration',
              'factor',
            ]"
          :rules="[
              {
                required: true,
                message: '请输入'
              }
            ]"
      >
        <a-input-number
            :max="100"
            placeholder="请输入"
            style="width: 50%"
            :min="0"
            addon-after="%"
        />
      </a-form-item>
      <p>最近一次采集到的值与上一次采集值比对，数值浮动在百分比以内时将被过滤</p>
    </template>
  </Collapsible>
</template>

<script setup>
import Collapsible from "./Collapsible/index.vue";

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

if (!('deadband' in formData.managedConfiguration)) {
  formData.managedConfiguration.deadband = {
    enabled: false,
    provider: undefined,
    configuration: {},
  }
}

if (!('configuration' in formData.managedConfiguration.deadband)) {
  formData.managedConfiguration.deadband.configuration = {}
}

const type = ref('a')

const columns = [
  {
    id: 'id',
    name: '设备ID',
    dataType: 'string',
    termTypes: [
      {id: 'eq', name: '等于'},
      {id: 'like', name: '包含'},
      {id: 'in', name: '在...中'}
    ]
  },
  {
    id: 'state',
    name: '状态',
    dataType: 'object',
    termTypes: [{id: 'eq', name: '等于'}],
    others: {
      elements: [
        {text: '在线', value: 'online'},
        {text: '离线', value: 'offline'}
      ]
    }
  }
]

const options = ref([])
const optionsMap = ref(new Map())
const terms = ref({
  column: undefined,
  termType: undefined,
  value: {
    source: 'fixed',
    value: undefined
  }
})

// // 注入参数数据
// useTermsParseConText({ options: options, map: optionsMap });

// 内置参数
const builtinParams = [
  {label: '当前用户', value: 'userId'},
  {label: '当前时间', value: 'timestamp'}
]
const builtinParamsMap = new Map(builtinParams.map(i => [i.value, i]))


const onSwitchChange = (val) => {
  formData.managedConfiguration.deadband.enabled = !!val
}

watch(() => formData.managedConfiguration?.deadband?.enabled, (val) => {
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
