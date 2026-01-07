<template>
  <Collapsible
      title="点位死区"
      tip="死区范围内的数据将被过滤（仅适用于数值类型）,减少抖动和冗余"
      v-model:value="data"
      :show-switch="showSwitch"
      @change="onSwitchChange"
      @outside="onOutsize"
      :showExtra="showExtra"
  >
    <template #extraTemplate>
      木有写
    </template>
    <a-form-item
        :name="['managedConfiguration', 'deadband']"
        :rules="[
          {
            validator: validatorValue,
              trigger: ['change', 'blur']
          }
        ]"
    >
      <div style="margin-bottom: 16px">
        <a-radio-group v-model:value="type" button-style="solid" @change="onRadioChange">
          <a-radio-button value="currentValue">固定值</a-radio-button>
          <a-radio-button value="this['currentValue'] - this['lastValue']">百分比</a-radio-button>
        </a-radio-group>
        <a-tooltip title="最近一次采集到的值与上一次采集值比对，数值浮动在百分比以内时将被过滤">
          <AIcon type="QuestionCircleOutlined" style="margin-left: 12px"/>
        </a-tooltip>
      </div>
      <template v-if="type === 'currentValue'">
        <TermsCascaderGroupItem
            :value="terms"
            :showValueType="false"
            @change="onChange"
        >
        </TermsCascaderGroupItem>
      </template>
      <template v-else>
        <a-input-number
            addon-after="%"
            placeholder="请输入值"
            :min="1"
            :max="65535"
            style="width: 50%"
            v-model:value="percent"
            @change="onValueChange"
        />

        <p>最近一次采集到的值与上一次采集值比对，数值浮动在百分比以内时将被过滤</p>
      </template>
    </a-form-item>
  </Collapsible>
</template>

<script setup>
import Collapsible from "./Collapsible/index.vue";
import {inject} from "vue";
import {DATA_COLLECTOR_CONFIG_TYPE} from "@data-collector-ui/views/data-collect/data";
import {useTermsParseConText} from "@jetlinks-web-core/components/TermsCascader/hooks";
import {omit, pick} from "lodash-es";

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
      enabled: false
    },
    outlier: {
      enabled: false
    },
    deadband: {
      enabled: false,
      provider: "term",
      configuration: {},
    },
    handler: {
      enabled: false
    },
  }
}

if (!('deadband' in formData.managedConfiguration)) {
  formData.managedConfiguration.deadband = {
    enabled: false,
    provider: "term",
    configuration: {},
  }
}

if (!('configuration' in formData.managedConfiguration.deadband)) {
  formData.managedConfiguration.deadband.configuration = {}
}

const type = ref('currentValue')
const options = ref([
  {
    title: '死区点位值',
    key: 'currentValue',
    fullName: '死区点位值',
    dataType: 'int',
    termTypes: [
      {name: '=', id: 'neq'},
      {name: '>', id: 'lte'},
      {name: '<', id: 'gte'},
      {name: '≥', id: 'lt'},
      {name: '≤', id: 'gt'},
    ]
  }
])
const optionsMap = ref(new Map())
optionsMap.value.set('currentValue', options.value[0])
const terms = ref(
    [
      {
        column: 'currentValue',
        termType: 'neq',
        value: undefined
      }
    ]
)
const percent = ref()

useTermsParseConText({options: options, map: optionsMap});


const onRadioChange = () => {
  formData.managedConfiguration.deadband.configuration = {
    terms: [{}]
  }
}

const showExtra = computed(() => {
  return !!collector.managedConfiguration?.deadband?.enabled
})

const onSwitchChange = (val) => {
  formData.managedConfiguration.deadband.enabled = !!val
  formData.managedConfiguration.deadband.provider = "term"
  if (!val) {
    // 初始化
    type.value = 'currentValue'
    percent.value = undefined
    terms.value = [
      {
        column: 'currentValue',
        termType: 'neq',
        value: undefined
      }
    ]
    formData.managedConfiguration.deadband.configuration = {}
  }
}

const onOutsize = () => {
  if (__type) {
    const arr = [
      {
        name: ['deadband'],
        value: formData.managedConfiguration.deadband
      },
    ]
    events.onValueChange(arr)
  }
}

const validatorValue = (_rule, _value) => new Promise(async (resolve, reject) => {
  if (_value.enabled) {
    const value = _value.configuration || {};
    const __value = value.terms?.[0]?.terms?.[0];
    if (!(__value?.column && __value.termType && __value?.value != null)) {
      return reject('请输入值');
    }
  }
  return resolve("");
});

const onChange = (val) => {
  terms.value = val.map(i => {
    return {
      ...i,
      column: "currentValue",
      termType: i.termType || "neq",
      type: 'and'
    }
  })
  formData.managedConfiguration.deadband.configuration = {
    terms: [{
      terms: terms.value.map(i => {
        return pick(i, ['termType', 'type', 'value', 'key', 'column'])
      })
    }]
  }

}

const onValueChange = () => {
  formData.managedConfiguration.deadband.configuration = {
    terms: [{
      terms: [
        {
          "column": type.value,
          "value": percent.value,
          "termType": "neq",
        }
      ]
    }]
  }
}

watch(() => formData.managedConfiguration?.deadband?.enabled, (val) => {
  if (firstRender && __type) {
    data.value = !!val
    // 处理数据回显
    const _configuration = formData.managedConfiguration?.deadband?.configuration || {}
    const __value = _configuration.terms?.[0]?.terms?.[0];
    type.value = __value?.column || 'currentValue'
    if (__value) {
      if (type.value === 'currentValue') {
        terms.value = _configuration.terms?.[0]?.terms || [{
          column: 'currentValue',
          termType: 'neq',
          value: undefined
        }]
      } else {
        percent.value = __value.value
      }
    }
    firstRender = false
  }
}, {
  immediate: true
})
</script>

<style lang="less" scoped>

</style>
