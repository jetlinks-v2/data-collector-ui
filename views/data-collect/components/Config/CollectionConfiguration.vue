<template>
  <Collapsible
      :title="$t('DataCollect.index.400156-15')"
      :tip="$t('DataCollect.index.400156-16')"
      v-model:value="data"
      :showSwitch="showSwitch"
      @change="onSwitchChange"
      @outside="onOutsize"
      :showExtra="showExtra"
  >
    <template #extraTemplate>
      <a-descriptions :column="1">
        <a-descriptions-item :label="$t('DataCollect.index.400156-17')">
          <j-ellipsis>
            {{ _accessModes }}
          </j-ellipsis>
        </a-descriptions-item>
        <a-descriptions-item :label="$t('Save.SaveModBus.4001413-30')">
          <j-ellipsis>
            {{ collector?.interval || '-' }}ms
          </j-ellipsis>
        </a-descriptions-item>
        <a-descriptions-item :label="$t('Save.SaveModBus.4001413-32')">
          <j-ellipsis>
            {{ __features ? $t('DataCollect.index.400156-18') : $t('DataCollect.index.400156-19') }}
          </j-ellipsis>
        </a-descriptions-item>
      </a-descriptions>
    </template>
    <a-row :gutter="24">
      <a-col :span="12">
        <a-form-item :label="$t('DataCollect.index.400156-17')" name="accessModes" :rules="[
            {
              required: true,
              message: $t('DataCollect.index.400156-20'),
            }
          ]"
        >
          <j-check-button
              v-model:value="formData.accessModes"
              :multiple="true"
              :options="options"
          />
        </a-form-item>
      </a-col>
      <a-col :span="12">
        <a-form-item
            :label="$t('Save.SaveModBus.4001413-30')"
            name="interval"
            :rules="[
        {
            required: true,
            message: $t('Collector.data.400141-13'),
        },
        {
            pattern: /^\d+$/,
            message: $t('Collector.data.400141-14'),
        },
    ]"
        >
          <a-input-number
              style="width: 100%"
              :placeholder="$t('Save.SaveModBus.4001413-31')"
              v-model:value="formData.interval"
              addon-after="ms"
              :max="2147483648"
              :min="0"
          />
        </a-form-item>
      </a-col>
      <a-col>
        <a-form-item label="" :name="['features']">
          <a-checkbox-group :value="_features" @change="onChange">
            <a-checkbox value="changedOnly">
              {{ $t('Save.SaveModBus.4001413-32') }}
            </a-checkbox>
          </a-checkbox-group>
        </a-form-item>
      </a-col>
    </a-row>
  </Collapsible>
</template>

<script setup>
import Collapsible from "./Collapsible/index.vue";
import {useI18n} from "vue-i18n";
import {inject} from "vue";
import {DATA_COLLECTOR_CONFIG_TYPE, PLUGIN_DETAIL_SAVE_EVENTS} from "@data-collector-ui/views/data-collect/data";
import {isEqual} from "./data";
import {map} from "lodash-es";

const {t: $t} = useI18n();

const props = defineProps({
  showSwitch: {
    type: Boolean,
    default: true
  }
})
const formData = inject('plugin-form', reactive({
  provider: 'modbus_tcp'
}))
const collector = inject('point-form-collector', {})
const events = inject(PLUGIN_DETAIL_SAVE_EVENTS);
const __configuration = inject('metadata-configuration', ref({}))

const __type = inject(DATA_COLLECTOR_CONFIG_TYPE, false)
let firstRender = true

if (!('features' in formData)) {
  formData.features = []
}

const data = ref(!props.showSwitch)

// {$t('DataCollect.index.400156-5')}
const initialSnapshot = ref(null)

const _options = [
  {
    label: $t('Point.index.400149-7'),
    value: 'read',
  },
  {
    label: $t('Point.index.400149-8'),
    value: 'write',
  },
  {
    label: $t('Point.index.400149-21'),
    value: 'subscribe',
  }
]

const options = computed(() => {
  const _dt = map(__configuration.value?.accessModes || [], 'value')
  return _options.map(i => {
    return {
      ...i,
      disabled: !_dt.includes(i.value)
    }
  })
})

const showExtra = computed(() => {
  return !!collector.id// !!collector?.accessModes?.length && !!collector?.interval
})

const _features = computed(() => {
  return formData.features.filter(i => i === 'changedOnly')
})

const _accessModes = computed(() => {
  return options.value.filter(item => (collector?.accessModes || []).includes(item.value)).map(item => item.label).join($t('DataCollect.index.400156-21'))
})

const __features = computed(() => {
  return !!collector.features?.find(i => i === 'changedOnly')
})

const onSwitchChange = (val) => {
  if (val === 'template') {
    formData.accessModes = collector.accessModes || []
    formData.interval = collector.interval
    formData.features = collector.features?.includes('changedOnly') ? ['changedOnly', ...formData.features] : formData.features.filter(i => i !== 'changedOnly')
  } else {
    formData.accessModes = []
    formData.interval = undefined
    formData.features = formData.features.filter(i => i !== 'changedOnly')
  }
  if (val !== true) {
    onOutsize()
  }
}

const onOutsize = () => {
  if (__type) {
    // {$t('DataCollect.index.400156-6')}
    const currentValue = {
      accessModes: formData.accessModes,
      interval: formData.interval,
      features: formData.features
    }

    // {$t('DataCollect.index.400156-7')}
    if (!initialSnapshot.value || !isEqual(initialSnapshot.value, currentValue)) {
      const arr = [
        {
          name: 'accessModes',
          value: formData.accessModes?.filter?.(i => i)
        },
        {
          name: 'interval',
          value: formData.interval
        },
        {
          name: 'features',
          value: formData.features.filter(i => i)
        }
      ]
      events?.onValueChange?.(arr)
      // {$t('DataCollect.index.400156-8')}
      initialSnapshot.value = JSON.parse(JSON.stringify(currentValue))
    }
  }
}

const onChange = (val) => {
  const arr = formData.features.filter(i => i !== 'changedOnly')
  formData.features = [...val, ...arr]
}

watch(() => formData.accessModes, () => {
  if (firstRender && __type) {
    data.value = !!formData.accessModes?.length
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
      accessModes: formData.accessModes,
      interval: formData.interval,
      features: formData.features
    }))
  }
}, {
  immediate: true  // {$t('DataCollect.index.400156-13')}
})

// watch(() => [collector.accessModes, collector.interval], () => {
//   if (collector.accessModes?.length > 0 && collector.interval) {
//     data.value = 'template'
//     onSwitchChange(data.value)
//   }
// }, {
//   immediate: true
// })

watch(() => collector.id, (val) => {
  if (!!val) {
    data.value = 'template'
    onSwitchChange(data.value)
  }
}, {
  immediate: true
})
</script>

<style lang="less" scoped>

</style>

