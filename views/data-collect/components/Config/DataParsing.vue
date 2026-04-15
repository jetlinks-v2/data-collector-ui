<template>
  <Collapsible
      :title="$t('DataCollect.index.400154-34')"
      :tip="$t('DataCollect.index.400154-35')"
      v-model:value="data"
      :showSwitch="showSwitch"
      @change="onSwitchChange"
      @outside="onOutsize"
      :showExtra="showExtra"
      :disabledList="disabledList"
  >
    <template #extraTemplate>
      <a-descriptions :column="1">
        <a-descriptions-item :label="$t('DataCollect.index.400154-25')">
          <j-ellipsis>
            {{ collector?.managedConfiguration?.codec || '-' }}
          </j-ellipsis>
        </a-descriptions-item>
        <a-descriptions-item :label="$t('DataCollect.index.400154-26')">
          <j-ellipsis>
            {{ collector?.managedConfiguration?.byteLayout || '-' }}
          </j-ellipsis>
        </a-descriptions-item>
      </a-descriptions>
    </template>
    <a-row :gutter="24">
      <a-col :span="12">
        <a-form-item
            :label="$t('DataCollect.index.400154-25')"
            :name="['managedConfiguration', 'codec']"
            :rules="[{required: data, message: $t('DataCollect.index.400154-22')}]"
        >
          <a-select v-model:value="formData.managedConfiguration.codec" :placeholder="$t('DataCollect.index.400154-22')"
                    :options="_dataTypeOptions" allow-clear/>
        </a-form-item>
      </a-col>
      <a-col :span="12">
        <a-form-item
            :label="$t('DataCollect.index.400154-26')"
            :name="['managedConfiguration', 'byteLayout']"
            :rules="[{required: data, message: $t('DataCollect.index.400154-22')}]"
        >
          <a-select
              v-model:value="formData.managedConfiguration.byteLayout"
              :placeholder="$t('DataCollect.index.400154-22')"
              :options="memoryOptions"
          />
        </a-form-item>
      </a-col>
    </a-row>
  </Collapsible>
</template>

<script setup>
import Collapsible from "./Collapsible/index.vue";
import {queryCodecProvider} from "@data-collector-ui/api/data-collect/collector";
import {DATA_COLLECTOR_CONFIG_TYPE, PLUGIN_DETAIL_SAVE_EVENTS} from "@data-collector-ui/views/data-collect/data";
import {inject} from "vue";
import {isEqual} from "./data";
import {useI18n} from "vue-i18n";

const {t: $t} = useI18n();

const props = defineProps({
  showSwitch: {
    type: Boolean,
    default: true
  },
  disabledList: {
    type: Array,
    default: []
  }
})

const formData = inject('plugin-form', reactive({}))
const collector = inject('point-form-collector', {})
const events = inject(PLUGIN_DETAIL_SAVE_EVENTS);
const __configuration = inject('metadata-configuration', ref({}))

const __type = inject(DATA_COLLECTOR_CONFIG_TYPE, false)
let firstRender = true

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
      enabled: false
    },
    handler: {
      enabled: false
    },
  }
}

const data = ref(!props.showSwitch)
const dataTypeOptions = ref([])
const memoryOptions = [
  {
    "label": "AB",
    "value": "AB"
  },
  {
    "label": "BA",
    "value": "BA"
  },
  {
    "label": "AB_CD",
    "value": "AB_CD"
  },
  {
    "label": "CD_AB",
    "value": "CD_AB"
  },
  {
    "label": "BA_DC",
    "value": "BA_DC"
  },
  {
    "label": "DC_BA",
    "value": "DC_BA"
  },
  {
    "label": "AB_CD_EF_GH",
    "value": "AB_CD_EF_GH"
  },
  {
    "label": "GH_EF_CD_AB",
    "value": "GH_EF_CD_AB"
  },
  {
    "label": "BA_DC_FE_HG",
    "value": "BA_DC_FE_HG"
  },
  {
    "label": "HG_FE_DC_BA",
    "value": "HG_FE_DC_BA"
  }
]

const showExtra = computed(() => {
  return !!collector.id // return !!collector?.managedConfiguration?.codec && !!collector?.managedConfiguration?.byteLayout
})

const _dataTypeOptions = computed(() => {
  const supportCodecs = __configuration.value?.supportCodecs || []
  return dataTypeOptions.value.filter(i => supportCodecs.length === 0 || supportCodecs.findIndex((v) => v.id === i.value) > -1)
})

const onSwitchChange = (val) => {
  formData.managedConfiguration = {
    ...formData.managedConfiguration,
    codec: val === 'template' ? collector?.managedConfiguration?.codec : undefined,
    byteLayout: val === 'template' ? collector?.managedConfiguration?.byteLayout : undefined,
  }
  if (!val) {
    // 需要立即保存
    onOutsize()
  }
}

const onOutsize = () => {
  if (__type) {
    // 检查值是否真正发生变化
    const currentValue = {
      codec: formData.managedConfiguration.codec,
      byteLayout: formData.managedConfiguration.byteLayout
    }

    // 如果没有初始快照或值发生了变化，才触发校验和传值
    if (!initialSnapshot.value || !isEqual(initialSnapshot.value, currentValue)) {
      const arr = [
        {
          name: ['managedConfiguration', 'codec'],
          value: formData.managedConfiguration.codec
        },
        {
          name: ['managedConfiguration', 'byteLayout'],
          value: formData.managedConfiguration.byteLayout
        },
      ]
      events?.onValueChange?.(arr)
      // 更新快照
      initialSnapshot.value = JSON.parse(JSON.stringify(currentValue))
    }
  }
}

onMounted(() => {
  queryCodecProvider().then(res => {
    if (res.success) {
      dataTypeOptions.value = res.result.map(item => ({
        label: item.name,
        value: item.id,
      }))
    }
  })
})

watch(() => formData.managedConfiguration?.codec, () => {
  if (firstRender) {
    if (!props.showSwitch) {
      data.value = true
    } else if (__type) {
      data.value = !!(formData?.managedConfiguration?.codec && formData?.managedConfiguration?.byteLayout)
    } else {
      data.value = false
    }
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
      codec: formData?.managedConfiguration?.codec,
      byteLayout: formData?.managedConfiguration?.byteLayout
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
