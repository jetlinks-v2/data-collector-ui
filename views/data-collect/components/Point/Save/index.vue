<template>
  <a-drawer open :maskClosable="false" :closable="false" :title="$t('DataCollect.index.400151-26')" width="800px" @close="emit('close')">
    <template #extra>
      <a-button type="text" @click="emit('close')">
        <AIcon type="CloseOutlined" />
      </a-button>
    </template>
    <div style="display: flex; flex-direction: column; justify-content: space-between; height: 100%">
      <div style="flex: 1; min-height: 0; overflow: hidden auto">
        <a-form :model="formData" ref="formRef" layout="vertical">
          <a-row :gutter="[24, 24]">
            <a-col :span="12">
              <a-form-item :label="$t('Save.SaveModBus.4001413-2')" name="name"
                           :rules="[{required: true, message: $t('DataCollect.index.400156-22'), trigger: ['blur']}]">
                <a-input
                    :placeholder="$t('Save.SaveModBus.4001413-3')"
                    v-model:value="formData.name"
                />
              </a-form-item>
            </a-col>
            <a-col :span="12">
              <a-form-item :label="$t('DataCollect.index.400151-27')" name="collectorId" :disabled="true">
                <a-input
                    :placeholder="$t('DataCollect.index.400151-28')"
                    v-model:value="formData.collectorName"
                    disabled
                />
              </a-form-item>
            </a-col>
          </a-row>
          <div class="point-config" v-if="jsonData">
            <h3>{{ $t('DataCollect.index.400151-29') }}</h3>
            <div>
              <RenderComponents v-if="jsonData" :value="jsonData"/>
            </div>
          </div>
          <template v-if="configuration?.autoCodec === false">
            <DataParsing :disabledList="[false]"/>
          </template>
          <CollectionConfiguration :disabledList="[false]"/>
          <DataConversion />
          <div style="display: flex; align-items: center; justify-content: space-between; font-weight: bold;">
            <span>{{ $t('DataCollect.index.400151-30') }}</span>
            <a-switch v-model:checked="configVisible" :aria-label="$t('DataCollect.index.400151-30')" />
          </div>
          <template v-if="configVisible">
            <AbnormalJudgment/>
            <DeadZone/>
            <template v-if="formData.accessModes?.includes('read') ">
              <StorageConfiguration/>
            </template>
            <ResultProcessing/>
          </template>
        </a-form>
      </div>
      <div style="padding-top: 24px;">
        <a-space>
          <a-button type="primary" @click="onSubmit(false)" :loading="loading">{{ $t('DataCollect.index.400151-8') }}</a-button>
          <a-button @click="onSubmit(true)" :loading="loading">{{ $t('DataCollect.index.400151-9') }}</a-button>
          <a-button @click="emit('close')">{{ $t('DataCollect.index.400151-10') }}</a-button>
        </a-space>
      </div>
    </div>
  </a-drawer>
</template>

<script setup>
import DataParsing from "../../Config/DataParsing.vue";
import CollectionConfiguration from "../../Config/CollectionConfiguration.vue";
import DataConversion from "../../Config/DataConversion.vue";
import AbnormalJudgment from "../../Config/AbnormalJudgment.vue";
import DeadZone from "../../Config/DeadZone.vue";
import StorageConfiguration from "../../Config/StorageConfiguration.vue";
import ResultProcessing from "../../Config/ResultProcessing.vue";
import {DATA_COLLECTOR_SAVE_TYPE} from "@data-collector-ui/views/data-collect/data";
import {useI18n} from "vue-i18n";
import {devGetProtocol} from "@data-collector-ui/utils/utils";
import RenderComponents from "@data-collector-ui/components/RenderComponents";
import {savePointBatch, updatePoint} from "@data-collector-ui/api/data-collect/collector";
import {onlyMessage} from "@jetlinks-web/utils";
import {getPointMetadata} from "@data-collector-ui/views/data-collect/utils";

const {t: $t} = useI18n();

const props = defineProps({
  data: {
    type: Object,
    default: () => ({})
  },
  collector: {
    type: Object,
    default: () => ({})
  }
})
const emit = defineEmits(['close', 'save'])

const formData = reactive({
  channelId: props.collector?.channelId,
  channelName: props.collector?.channelName,
  collectorId: props.collector?.id,
  collectorName: props.collector.name,
  provider: props.collector.provider,
  name: undefined,
  "configuration": {
    "function": undefined,
    "parameter": {
      "address": undefined,
      "quantity": undefined
    }
  },
  managedConfiguration: {
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
  },
  description: undefined,
});
const formRef = ref(null)
const jsonData = ref();
const configVisible = ref(false)
const loading = ref(false)
const configuration = ref({})
const advancedFeatures = ['storageData', 'storageOutlier', 'storageDeadband']
const advancedManagedConfigurationKeys = ['outlier', 'deadband', 'handler']

const _collector = computed(() => {
  return {...props.collector, ...(props.collector?.configuration?.template || {})}
})

provide('plugin-form', formData)
provide('point-form-collector', _collector.value)
provide(DATA_COLLECTOR_SAVE_TYPE, 'point')
provide('metadata-configuration', configuration)
provide('point-metadata-events', {
  pointMetadataEvents: async (provider, _configuration) => {
    if(_configuration){
      getPointMetadata(provider, _configuration).then((res) => {
        configuration.value = res
      })
    } else {
      configuration.value = {}
    }
  }
})

const onChange = async (provider) => {
  jsonData.value = await devGetProtocol(provider || 'modbus_tcp', "point");
};

const buildSubmitData = () => {
  const data = !props.data?.id ? {...formData} : {...props.data, ...formData}
  if (configVisible.value) {
    return data
  }

  // 关闭高级配置时仅忽略提交值，保留表单内容供用户重新开启后继续编辑。
  const managedConfiguration = Object.fromEntries(
      Object.entries(data.managedConfiguration || {})
          .filter(([key]) => !advancedManagedConfigurationKeys.includes(key))
  )
  return {
    ...data,
    features: (data.features || []).filter(item => !advancedFeatures.includes(item)),
    managedConfiguration
  }
}

const onSubmit = async (flag) => {
  const resp = await formRef.value?.validate?.()
  if (resp) {
    loading.value = true;
    const submitData = buildSubmitData()
    const response = !props.data?.id
        ? await savePointBatch(submitData).finally(() => {
          loading.value = false
        })
        : await updatePoint(props.data?.id, submitData).finally(() => {
          loading.value = false
        });
    if (response.success) {
      onlyMessage($t('DataCollect.index.400151-11'))
      if (flag) {
        // formData.configuration = {}
        formData.name = undefined
        formData.id = undefined
        formData.description = undefined
      } else {
        emit('save');
      }
    }
  }
}

watch(() => props.collector, () => {
  if (props.collector.id) {
    formData.collectorId = props.collector.id
    formData.collectorName = props.collector.name
    formData.channelId = props.collector.channelId
    formData.channelName = props.collector.channelName
    formData.provider = props.collector.provider
    onChange(props.collector.provider)
  }
}, {
  immediate: true
})
</script>

<style lang="less" scoped>
.point-config {
  border: 1px solid #e8e8e8;
  padding: 16px;
  border-radius: 6px;
  margin-bottom: 16px;
}
</style>
