<template>
  <Collapsible
      :title="$t('DataCollect.index.400155-5')"
      :tip="$t('DataCollect.index.400155-6')"
      v-model:value="data"
      :show-switch="showSwitch"
      @change="onSwitchChange"
      @outside="onOutsize"
      :showExtra="showExtra"
  >
    <template #extraTemplate>
      <a-descriptions :column="1">
        <a-descriptions-item :label="$t('DataCollect.index.400155-7')">
          <j-ellipsis>
            {{
              `${collector?.managedConfiguration?.outlier?.configuration?.min}~${collector?.managedConfiguration?.outlier?.configuration?.max}`
            }}
          </j-ellipsis>
        </a-descriptions-item>
      </a-descriptions>
    </template>
    <a-form-item
        :name="['managedConfiguration', 'outlier']"
        :rules="[
            {
              validator: validatorValue,
              trigger: ['change', 'blur']
            }
        ]"
    >
      <TermsCascader
          :value="terms"
          :showValueType="false"
          @change="onChange"
      />
    </a-form-item>
  </Collapsible>
</template>

<script setup>
import Collapsible from "./Collapsible/index.vue";
import {useTermsParseConText} from "@jetlinks-web-core/components/TermsCascader/hooks";
import {inject} from "vue";
import {DATA_COLLECTOR_CONFIG_TYPE, PLUGIN_DETAIL_SAVE_EVENTS} from "@data-collector-ui/views/data-collect/data";
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
const options = ref([
  {
    title: $t('DataCollect.index.400155-8'),
    key: 'current',
    fullName: $t('DataCollect.index.400155-8'),
    dataType: 'int',
    termTypes: [{name: $t('DataCollect.index.400156-3'), id: 'btw'}]
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
      enabled: false,
    },
    handler: {
      enabled: false,
      configuration: {},
      "provider": "range",
    },
  }
}

if (!('outlier' in formData.managedConfiguration)) {
  formData.managedConfiguration.outlier = {
    enabled: false,
    "provider": "range",
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

const showExtra = computed(() => {
  return !!collector.managedConfiguration?.outlier?.enabled
})

const onChange = () => {
  formData.managedConfiguration.outlier.configuration.min = terms.value.value?.[0]
  formData.managedConfiguration.outlier.configuration.max = terms.value.value?.[1]
}

const validatorValue = (_rule, _value) => new Promise(async (resolve, reject) => {
  if (_value.enabled) {
    const value = _value.configuration || {}
    if (value.min != null && value.max != null) {
      if (value.min <= value.max) {
        return resolve("");
      } else {
        return reject($t('DataCollect.index.400155-9'));
      }
    } else {
      return reject($t('DataCollect.index.400155-10'));
    }
  }
  return resolve("");
});

const onSwitchChange = (val) => {
  formData.managedConfiguration = {
    ...formData.managedConfiguration,
    outlier: {
      ...formData.managedConfiguration.outlier,
      enabled: !!val,
      "provider": "range",
      configuration: {
        ...formData.managedConfiguration.outlier.configuration,
        min: val === 'template' ? collector?.managedConfiguration?.outlier?.configuration?.min : undefined,
        max: val === 'template' ? collector?.managedConfiguration?.outlier?.configuration?.max : undefined
      }
    }
  }
}

const onOutsize = () => {
  if (__type) {
    // {$t('DataCollect.index.400156-6')}
    const currentValue = {
      outlier: formData.managedConfiguration.outlier
    }

    // {$t('DataCollect.index.400156-7')}
    if (!initialSnapshot.value || !isEqual(initialSnapshot.value, currentValue)) {
      const arr = [
        {
          name: ['managedConfiguration', 'outlier'],
          value: formData.managedConfiguration.outlier
        },
      ]
      events?.onValueChange?.(arr)
      // 更新快照
      initialSnapshot.value = JSON.parse(JSON.stringify(currentValue))
    }
  }
}

watch(() => formData.managedConfiguration?.outlier?.enabled, (val) => {
  if (firstRender && __type) {
    data.value = !!val
    const _configuration = formData.managedConfiguration?.outlier?.configuration || {min: undefined, max: undefined}
    terms.value = {
      column: 'current',
      termType: 'btw',
      value: _configuration ? [_configuration.min, _configuration.max] : []
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
      outlier: formData.managedConfiguration.outlier
    }))
  }
}, {
  immediate: true  // 确保初始打开时也记录快照
})
</script>

<style lang="less" scoped>

</style>
