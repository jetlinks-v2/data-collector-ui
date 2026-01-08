<template>
  <Collapsible
      title="采集配置"
      tip="设置访问类型,采集频率及数据推送等设置"
      v-model:value="data"
      :showSwitch="showSwitch"
      @change="onSwitchChange"
      @outside="onOutsize"
      :showExtra="showExtra"
  >
    <template #extraTemplate>
      <a-descriptions :column="1">
        <a-descriptions-item label="访问类型">
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
            {{ __features ? '是' : '否' }}
          </j-ellipsis>
        </a-descriptions-item>
      </a-descriptions>
    </template>
    <a-row :gutter="24">
      <a-col :span="12">
        <a-form-item label="访问类型" name="accessModes" :rules="[
            {
              required: true,
              message: '请选择',
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
import {getSupportAccessModes} from "@data-collector-ui/api/data-collect/collector";

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

const __type = inject(DATA_COLLECTOR_CONFIG_TYPE, false)
let firstRender = true

if (!('features' in formData)) {
  formData.features = []
}

const data = ref(!props.showSwitch)

// 记录初始值快照，用于检测变化
const initialSnapshot = ref(null)

const options = ref([])

const showExtra = computed(() => {
  return !!collector?.accessModes?.length && !!collector?.interval
})

const _features = computed(() => {
  return formData.features.filter(i => i === 'changedOnly')
})

const _accessModes = computed(() => {
  return options.filter(item => (collector?.accessModes || []).includes(item.value)).map(item => item.label).join('、')
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
}

const onOutsize = () => {
  if (__type) {
    // 检查值是否真正发生变化
    const currentValue = {
      accessModes: formData.accessModes,
      interval: formData.interval,
      features: formData.features
    }

    // 如果没有初始快照或值发生了变化，才触发校验和传值
    if (!initialSnapshot.value || !isEqual(initialSnapshot.value, currentValue)) {
      const arr = [
        {
          name: 'accessModes',
          value: formData.accessModes.filter(i => i)
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
      // 更新快照
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

// 监听折叠板打开状态，打开时记录初始快照
watch(() => data.value, (newVal) => {
  if (newVal === true) {
    // 折叠板打开时，记录当前值的快照
    initialSnapshot.value = JSON.parse(JSON.stringify({
      accessModes: formData.accessModes,
      interval: formData.interval,
      features: formData.features
    }))
  }
}, {
  immediate: true  // 确保初始打开时也记录快照
})

const querySupportAccessModes = async () => {
  const resp = await getSupportAccessModes(formData.provider)
  if (resp.success) {
    options.value = resp.result.map(i => {
      return {...i, label: i.text}
    })
  }
}

querySupportAccessModes()
</script>

<style lang="less" scoped>

</style>

