<template>
  <Collapsible
      :title="$t('DataCollect.index.400154-10')"
      :tip="$t('DataCollect.index.400154-11')"
      v-model:value="data"
      :show-switch="showSwitch"
      @change="onSwitchChange"
      @outside="onOutsize"
      :showExtra="showExtra"
  >
    <template #extraTemplate>
      <a-descriptions :column="1">
        <a-descriptions-item :label="$t('DataCollect.index.400154-12')">
          <j-ellipsis>
            {{ collector?.managedConfiguration?.converter?.configuration?.factor || '-' }}
          </j-ellipsis>
        </a-descriptions-item>
        <a-descriptions-item :label="$t('DataCollect.index.400154-13')">
          <j-ellipsis>
            {{ collector?.managedConfiguration?.converter?.configuration?.scale || '-' }}
          </j-ellipsis>
        </a-descriptions-item>
      </a-descriptions>
    </template>
    <a-row :gutter="24">
      <a-col :span="12">
        <a-form-item
            :name="[
              'managedConfiguration',
              'converter',
              'configuration',
              'factor',
            ]"
            :label="$t('DataCollect.index.400154-12')"
            :rules="[
              {
                required: data,
                message: $t('DataCollect.index.400154-14')
              }
            ]"
        >
          <a-input-number
              v-model:value="formData.managedConfiguration.converter.configuration.factor"
              :controls="false"
              :max="65535"
              :placeholder="$t('DataCollect.index.400154-14')"
              style="width: 100%"
              type="number"
          />
        </a-form-item>
      </a-col>
      <a-col :span="12">
        <a-form-item
            :name="['managedConfiguration', 'converter', 'configuration', 'scale']"
            :label="$t('DataCollect.index.400154-13')"
        >
          <a-input-number
              v-model:value="formData.managedConfiguration.converter.configuration.scale"
              :controls="false"
              :max="65535"
              :min="0"
              :precision="0"
              :placeholder="$t('DataCollect.index.400154-14')"
              style="width: 100%"
          />
        </a-form-item>
      </a-col>
    </a-row>
  </Collapsible>
</template>

<script setup>
import Collapsible from "./Collapsible/index.vue";
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
let firstRender = true // 第一次渲染
const oldCollector = inject('old-collector', ref({}))

// 记录初始值快照，用于检测变化
const initialSnapshot = ref(null)

if (!('managedConfiguration' in formData)) {
  formData.managedConfiguration = {
    byteLayout: undefined,
    codec: undefined,
    converter: {
      enabled: false,
      provider: 'scale',
      configuration: {
        factor: 1,
        scale: 3
      },
    },
    outlier: {
      enabled: false,
    },
    deadband: {
      enabled: false,
    },
    handler: {
      enabled: false,
    },
  }
}

if (!('converter' in formData.managedConfiguration)) {
  formData.managedConfiguration.converter = {
    enabled: false,
    provider: 'scale',
    configuration: {
      factor: 1,
      scale: 3
    },
  }
}

if (!('configuration' in formData.managedConfiguration.converter)) {
  formData.managedConfiguration.converter.configuration = {
    factor: 1,
    scale: 3
  }
}

const showExtra = computed(() => {
  return !!collector.id // return collector.managedConfiguration?.converter?.configuration?.scale !== undefined && collector.managedConfiguration?.converter?.configuration?.factor !== undefined
})

const onSwitchChange = (val) => {
  formData.managedConfiguration.converter = {
    ...formData.managedConfiguration.converter,
    enabled: !!val,
    provider: 'scale',
    configuration: {
      ...formData.managedConfiguration.converter.configuration,
      factor: val === 'template' ? collector?.managedConfiguration?.converter?.configuration?.factor : undefined,
      scale: val === 'template' ? collector?.managedConfiguration?.converter?.configuration?.scale : undefined
    }
  }
  if (val !== true) {
    setTimeout(() => { // 校验无法马上生效
      onOutsize()
    })
  }
}

const onOutsize = () => {
  if (__type) {
    // 检查值是否真正发生变化
    const currentValue = {
      converter: formData.managedConfiguration.converter
    }

    // 如果没有初始快照或值发生了变化，才触发校验和传值
    if (!initialSnapshot.value || !isEqual(initialSnapshot.value, currentValue)) {
      const arr = [
        {
          name: ['managedConfiguration', 'converter'],
          value: formData.managedConfiguration.converter
        },
      ]
      events?.onValueChange?.(arr, true)
      // 更新快照
      initialSnapshot.value = JSON.parse(JSON.stringify(currentValue))
    }
  }
}

watch(() => formData.managedConfiguration?.converter?.enabled, (val) => {
  if (firstRender && (__type || formData.id || oldCollector.value?.channelId)) {
    data.value = !!val
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
      converter: formData.managedConfiguration.converter
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
</script>

<style lang="less" scoped>

</style>
