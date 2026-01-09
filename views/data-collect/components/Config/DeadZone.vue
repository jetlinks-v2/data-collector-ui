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
    <template #extraTemplate v-if="_deadband.type">
      <a-descriptions :column="1">
        <a-descriptions-item label="类型">
          <j-ellipsis>{{ _deadband?.type || '--' }}</j-ellipsis>
        </a-descriptions-item>
        <a-descriptions-item label="值">
          <j-ellipsis>{{ _deadband?.range || '--' }}</j-ellipsis>
        </a-descriptions-item>
      </a-descriptions>
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
import {DATA_COLLECTOR_CONFIG_TYPE, PLUGIN_DETAIL_SAVE_EVENTS} from "@data-collector-ui/views/data-collect/data";
import {useTermsParseConText} from "@jetlinks-web-core/components/TermsCascader/hooks";
import {omit, pick} from "lodash-es";
import {isEqual} from "./data";

const props = defineProps({
  showSwitch: {
    type: Boolean,
    default: true
  }
})
const data = ref(!props.showSwitch)

const formData = inject('plugin-form', reactive({}))
const collector = inject('point-form-collector', {})

const events = inject(PLUGIN_DETAIL_SAVE_EVENTS);

const __type = inject(DATA_COLLECTOR_CONFIG_TYPE, false)

let firstRender = true // 第一次渲染

// 记录初始值快照，用于检测变化
const initialSnapshot = ref(null)

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

const _options = [
  {name: '=', id: 'neq'},
  {name: '>', id: 'lte'},
  {name: '<', id: 'gte'},
  {name: '≥', id: 'lt'},
  {name: '≤', id: 'gt'},
]

const type = ref('currentValue')
const options = ref([
  {
    title: '死区点位值',
    key: 'currentValue',
    fullName: '死区点位值',
    dataType: 'int',
    termTypes: _options
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

const _deadband = computed(() => {
  const _configuration = collector?.managedConfiguration?.deadband?.configuration || {}
  const __value = _configuration.terms?.[0]?.terms;
  if (__value?.[0]?.column === 'currentValue') {
    const _val = __value.map(i => {
      const _termType = _options.find(item => item.id === i.termType)?.name
      return `死区点位值${_termType}${i.value}`
    }).join('并且')
    return {
      type: '固定值',
      range: _val
    }
  }
  return {
    type: __value?.[0]?.column === `this['currentValue'] - this['lastValue']` ? '百分比' : '',
    range: `${__value?.[0]?.value}%`
  }
})

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
    // 检查值是否真正发生变化
    const currentValue = {
      deadband: formData.managedConfiguration.deadband
    }

    // 如果没有初始快照或值发生了变化，才触发校验和传值
    if (!initialSnapshot.value || !isEqual(initialSnapshot.value, currentValue)) {
      const arr = [
        {
          name: ['managedConfiguration', 'deadband'],
          value: formData.managedConfiguration.deadband
        },
      ]
      events?.onValueChange?.(arr)
      // 更新快照
      initialSnapshot.value = JSON.parse(JSON.stringify(currentValue))
    }
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

// 监听折叠板打开状态,打开时记录初始快照
watch(() => data.value, (newVal) => {
  if (newVal === true) {
    // 折叠板打开时，记录当前值的快照
    initialSnapshot.value = JSON.parse(JSON.stringify({
      deadband: formData.managedConfiguration.deadband
    }))
  }
}, {
  immediate: true  // 确保初始打开时也记录快照
})
</script>

<style lang="less" scoped>

</style>
