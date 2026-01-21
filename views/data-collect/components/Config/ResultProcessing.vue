<template>
  <Collapsible
      :title="$t('DataCollect.index.400155-11')"
      :tip="$t('DataCollect.index.400155-12')"
      v-model:value="data"
      :show-switch="showSwitch"
      @change="onSwitchChange"
      @outside="onOutsize"
      :showExtra="showExtra"
  >
    <template #extraTemplate>
      <a-descriptions :column="1">
        <a-descriptions-item :label="$t('DataCollect.index.400155-13')">
          {{
            collector?.managedConfiguration?.handler?.configuration?.shakeLimit?.enabled ? $t('DataCollect.index.400155-14') : $t('DataCollect.index.400155-15')
          }}
        </a-descriptions-item>
      </a-descriptions>
      <template v-if="collector?.managedConfiguration?.handler?.configuration?.shakeLimit?.enabled">
        <p v-if="_handler?.reason && _handler.time && _handler?.threshold">
          <b>{{ _handler?.reason }}</b>
          {{ `异常时,${_handler.time}秒内最多触发${_handler?.threshold}次同一类型告警` }}
        </p>
      </template>
    </template>
    <a-form-item :name="['managedConfiguration', 'handler']"
                 :rules="[
            {
              validator: validatorValue,
              trigger: ['change', 'blur']
            }
        ]">
      <div style="display: flex; align-items: center;">
        <a-switch
            v-model:checked="formData.managedConfiguration.handler.configuration.shakeLimit.enabled"
            style="margin-right: 12px"
        />
        <template v-if="!formData.managedConfiguration.handler.configuration.shakeLimit.enabled">
          {{ $t('DataCollect.index.400155-16') }}
        </template>
        <template v-else>
          <a-select
              show-search
              :placeholder="$t('DataCollect.index.400155-17')"
              style="width: 240px;
              margin: 0 10px"
              :options="options"
              v-model:value="type"
              @change="onTypeChange"
          />
          {{ $t('DataCollect.index.400155-18') }}
          <a-input-number :placeholder="$t('DataCollect.index.400155-19')" style="margin: 0 10px" :min="0"
                          :precision="0"
                          v-model:value="formData.managedConfiguration.handler.configuration.shakeLimit.time"/>
          {{ $t('DataCollect.index.400155-20') }}
          <a-input-number :placeholder="$t('DataCollect.index.400155-19')" style="margin: 0 10px" :min="1"
                          :precision="0"
                          v-model:value="formData.managedConfiguration.handler.configuration.shakeLimit.threshold"/>
          {{ $t('DataCollect.index.400155-21') }}
        </template>
      </div>
    </a-form-item>
  </Collapsible>
</template>
<script setup>
import Collapsible from "./Collapsible/index.vue";
import {inject} from "vue";
import {DATA_COLLECTOR_CONFIG_TYPE, PLUGIN_DETAIL_SAVE_EVENTS} from "@data-collector-ui/views/data-collect/data";
import {getCollectorError} from "@data-collector-ui/api/data-collect/collector";
import {isEqual} from "./data";
import {useI18n} from "vue-i18n";

const props = defineProps({
  showSwitch: {
    type: Boolean,
    default: true
  }
})
const {t: $t} = useI18n();
const data = ref(!props.showSwitch)

const formData = inject('plugin-form', reactive({}))
const collector = inject('point-form-collector', {})
const events = inject(PLUGIN_DETAIL_SAVE_EVENTS);
const errorList = ref([])
const __type = inject(DATA_COLLECTOR_CONFIG_TYPE, false)
const oldCollector = inject('old-collector', ref({}))

let firstRender = true // 第一次渲染

// 记录初始值快照，用于检测变化
const initialSnapshot = ref(null)

const flag = computed(() => !!formData.managedConfiguration?.handler?.enabled)
const type = ref()
const options = computed(() => {
  const arr = errorList.value.map(i => {
    return {
      ...i,
      label: `${i.description}(${i.name})`,
      value: i.code
    }
  })
  return [
    {
      label: $t('DataCollect.index.400155-22'),
      value: 'outlier'
    },
    {
      label: $t('DataCollect.index.400155-23'),
      value: 'deadband'
    },
    ...arr
  ]
})

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
      enabled: false,
      provider: 'alarm',
      configuration: {
        shakeLimit: {
          enabled: false,
          "alarmFirst": true,
          "outputFirst": false,
          "continuous": false,
          "rolling": false
        }
      }
    },
  }
}

if (!('handler' in formData.managedConfiguration)) {
  formData.managedConfiguration.handler = {
    enabled: false,
    provider: 'alarm',
    configuration: {
      "reason": "deadband",
      shakeLimit: {
        enabled: false,
        "alarmFirst": true,
        "outputFirst": false,
        "continuous": false,
        "rolling": false
      }
    }
  }
}

if (!('configuration' in formData.managedConfiguration.handler)) {
  formData.managedConfiguration.handler.configuration = {
    "reason": "deadband",
    shakeLimit: {
      enabled: false,
      "alarmFirst": true,
      "outputFirst": false,
      "continuous": false,
      "rolling": false
    }
  }
}

const showExtra = computed(() => {
  return !!collector.id // return !!collector.managedConfiguration?.handler?.enabled
})

const onSwitchChange = (val) => {
  formData.managedConfiguration.handler.enabled = !!val
  if (val !== true) {
    onOutsize()
  }
}

const _handler = computed(() => {
  const _configuration = collector?.managedConfiguration?.handler?.configuration || {};
  const _reason = _configuration.reason || _configuration.code
  return {
    ..._configuration.shakeLimit,
    reason: options.value.find(i => i.value === _reason).label || _reason
  }
})
const onOutsize = () => {
  if (__type) {
    // 检查值是否真正发生变化
    const currentValue = {
      handler: formData.managedConfiguration.handler
    }

    // 如果没有初始快照或值发生了变化，才触发校验和传值
    if (!initialSnapshot.value || !isEqual(initialSnapshot.value, currentValue)) {
      const arr = [
        {
          name: ['managedConfiguration', 'handler'],
          value: formData.managedConfiguration.handler
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
    if (_value.configuration.shakeLimit.enabled) {
      if (!((_value.configuration.reason || _value.configuration.code) && _value.configuration.shakeLimit.time != null && _value.configuration.shakeLimit.threshold != null)) {
        return reject($t('DataCollect.index.400155-19'));
      }
    }
  }
  return resolve("");
});

const onTypeChange = (e, option) => {
  if (option.code) {
    formData.managedConfiguration.handler.configuration.reason = undefined
    formData.managedConfiguration.handler.configuration.code = option.code
  } else {
    formData.managedConfiguration.handler.configuration.reason = e
    formData.managedConfiguration.handler.configuration.code = undefined
  }
}

watch(() => formData.managedConfiguration?.handler?.enabled, (val) => {
  if (firstRender && (__type || formData.id || oldCollector.value?.channelId)) {
    data.value = !!val
    const _configuration = formData.managedConfiguration?.handler?.configuration || {}
    type.value = _configuration.reason || _configuration.code
    firstRender = false
  }
}, {
  immediate: true
})

// 监听折叠板打开状态，打开时记录初始快照
watch(() => data.value, (newVal) => {
  if (newVal === true) {
    // 折叠板打开时，记录当前值的快照
    initialSnapshot.value = JSON.parse(JSON.stringify({
      handler: formData.managedConfiguration.handler
    }))
  }
}, {
  immediate: true  // 确保初始打开时也记录快照
})

watch(() => collector.id, (val) => {
  if (!!val) {
    data.value = 'template'
    onSwitchChange(data.value)
  }
}, {
  immediate: true
})

onMounted(() => {
  getCollectorError().then(resp => {
    if (resp.success) {
      errorList.value = resp.result
    }
  })
})
</script>

<style lang="less" scoped>

</style>
