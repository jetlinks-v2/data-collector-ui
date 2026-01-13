<template>
  <Collapsible
      :title="$t('DataCollect.index.400154-15')"
      :tip="$t('DataCollect.index.400154-16')"
      v-model:value="data"
      :show-switch="showSwitch"
      @change="onSwitchChange"
      @outside="onOutsize"
      :showExtra="showExtra"
  >
    <template #extraTemplate v-if="_deadband.type">
      <a-descriptions :column="1">
        <a-descriptions-item :label="$t('DataCollect.index.400154-17')">
          <j-ellipsis>{{ _deadband?.type || '--' }}</j-ellipsis>
        </a-descriptions-item>
        <a-descriptions-item :label="$t('DataCollect.index.400154-18')">
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
          <a-radio-button value="currentValue">{{ $t('DataCollect.index.400155-0') }}</a-radio-button>
          <a-radio-button value="this['currentValue'] - this['lastValue']">{{ $t('DataCollect.index.400155-1') }}</a-radio-button>
        </a-radio-group>
        <a-tooltip :title="$t('DataCollect.index.400155-2')">
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
            :placeholder="$t('DataCollect.index.400155-3')"
            :min="1"
            :max="65535"
            style="width: 50%"
            v-model:value="percent"
            @change="onValueChange"
        />

        <p>{{ $t('DataCollect.index.400155-2') }}</p>
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
import {useI18n} from "vue-i18n";

const {t: $t} = useI18n();

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

let firstRender = true // {$t('DataCollect.index.400156-4')}

// {$t('DataCollect.index.400156-5')}
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
    title: $t('DataCollect.index.400155-4'),
    key: 'currentValue',
    fullName: $t('DataCollect.index.400155-4'),
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
      return `${$t('DataCollect.index.400155-4')}${_termType}${i.value}`
    }).join($t('DataCollect.index.400156-14'))
    return {
      type: $t('DataCollect.index.400155-0'),
      range: _val
    }
  }
  return {
    type: __value?.[0]?.column === `this['currentValue'] - this['lastValue']` ? $t('DataCollect.index.400155-1') : '',
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
    // {$t('DataCollect.index.400156-11')}
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
    // {$t('DataCollect.index.400156-6')}
    const currentValue = {
      deadband: formData.managedConfiguration.deadband
    }

    // {$t('DataCollect.index.400156-7')}
    if (!initialSnapshot.value || !isEqual(initialSnapshot.value, currentValue)) {
      const arr = [
        {
          name: ['managedConfiguration', 'deadband'],
          value: formData.managedConfiguration.deadband
        },
      ]
      events?.onValueChange?.(arr)
      // {$t('DataCollect.index.400156-8')}
      initialSnapshot.value = JSON.parse(JSON.stringify(currentValue))
    }
  }
}

const validatorValue = (_rule, _value) => new Promise(async (resolve, reject) => {
  if (_value.enabled) {
    const value = _value.configuration || {};
    const __value = value.terms?.[0]?.terms?.[0];
    if (!(__value?.column && __value.termType && __value?.value != null)) {
      return reject($t('DataCollect.index.400155-3'));
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
    // {$t('DataCollect.index.400156-12')}
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

// {$t('DataCollect.index.400156-9')}
watch(() => data.value, (newVal) => {
  if (newVal === true) {
    // {$t('DataCollect.index.400156-10')}
    initialSnapshot.value = JSON.parse(JSON.stringify({
      deadband: formData.managedConfiguration.deadband
    }))
  }
}, {
  immediate: true  // {$t('DataCollect.index.400156-13')}
})
</script>

<style lang="less" scoped>

</style>
