<template>
  <a-drawer open :title="data?.id ? $t('DataCollect.index.400151-2') : $t('DataCollect.index.400151-3')" :width="800" @close="emit('close')">
    <div style="display: flex; flex-direction: column; justify-content: space-between; height: 100%">
      <div style="flex: 1; min-height: 0; overflow: hidden auto">
        <a-form :model="formData" ref="formRef" layout="vertical">
          <a-row :gutter="[24, 24]">
            <a-col :span="12">
              <a-form-item
                  :label="$t('Save.index.4001415-4')"
                  name="name"
                  :rules="[
        { required: true, message: i18n.global.t('Collector.data.400141-26') },
        { max: 64, message: i18n.global.t('Collector.data.400141-2') },
    ]"
              >
                <a-input
                    :placeholder="$t('Save.index.4001415-5')"
                    v-model:value="formData.name"
                />

              </a-form-item>
            </a-col>
            <a-col :span="12">
              <a-form-item :label="$t('DataCollect.index.400151-4')" name="channelId" :rules="[
                  { required: true, message: i18n.global.t('Collector.data.400141-26') }
              ]">
                <a-input
                    v-model:value="formData.channelName"
                    :disabled="true"
                />
              </a-form-item>
            </a-col>
          </a-row>
          <div class="point-config" v-if="jsonData">
            <TitleComponent :data="$t('DataCollect.index.400151-5')"/>
            <div class="point-config-content">
              <RenderComponents
                  v-if="jsonData"
                  :value="jsonData"
              />
            </div>
          </div>
          <TitleComponent :data="$t('DataCollect.index.400151-6')">
            <template #extra>
              <div style="color: #999;font-size: 12px">{{ $t('DataCollect.index.400151-7') }}</div>
            </template>
          </TitleComponent>
          <!--          <DataParsing :showSwitch="false"/>-->
          <CollectionConfiguration :showSwitch="false"/>
          <DataConversion/>
          <AbnormalJudgment/>
          <DeadZone/>
          <StorageConfiguration/>
          <ResultProcessing/>
          <a-form-item :label="$t('Save.index.4001415-47')" name="description">
            <a-textarea
                :placeholder="$t('Save.index.4001415-48')"
                v-model:value="formData.description"
                :maxlength="200"
                :rows="3"
                showCount
            />
          </a-form-item>
        </a-form>
      </div>
      <div style="padding-top: 24px;">
        <a-space>
          <a-button type="primary" @click="handleOk(false)" :loading="loading">{{ $t('DataCollect.index.400151-8') }}</a-button>
          <a-button v-if="!data?.id" @click="handleOk(true)" :loading="loading">{{ $t('DataCollect.index.400151-9') }}</a-button>
          <a-button @click="emit('close')">{{ $t('DataCollect.index.400151-10') }}</a-button>
        </a-space>
      </div>
    </div>
  </a-drawer>
</template>

<script setup>
import ResultProcessing from "@data-collector-ui/views/data-collect/components/Config/ResultProcessing.vue";
import DataConversion from "@data-collector-ui/views/data-collect/components/Config/DataConversion.vue";
import DeadZone from "@data-collector-ui/views/data-collect/components/Config/DeadZone.vue";
import RenderComponents from "@data-collector-ui/components/RenderComponents";
import AbnormalJudgment from "@data-collector-ui/views/data-collect/components/Config/AbnormalJudgment.vue";
import StorageConfiguration from "@data-collector-ui/views/data-collect/components/Config/StorageConfiguration.vue";
import DataParsing from "@data-collector-ui/views/data-collect/components/Config/DataParsing.vue";
import CollectionConfiguration
  from "@data-collector-ui/views/data-collect/components/Config/CollectionConfiguration.vue";
import {useI18n} from "vue-i18n";
import i18n from "@jetlinks-web-core/locales";
import {devGetProtocol} from "@data-collector-ui/utils/utils";
import {DATA_COLLECTOR_SAVE_TYPE} from "@data-collector-ui/views/data-collect/data";
import {cloneDeep, omit, pick} from "lodash-es";
import {save, update} from "@data-collector-ui/api/data-collect/collector";
import {onlyMessage} from "@jetlinks-web/utils";
import {getPointMetadata} from "@data-collector-ui/views/data-collect/utils";

const {t: $t} = useI18n();
const props = defineProps({
  data: {
    type: Object,
    default: () => ({})
  },
  channel: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits(['close', 'save'])
const formData = reactive({
  channelId: props.channel.id,
  channelName: props.channel.name,
  name: undefined,
  provider: props.channel.provider,
  configuration: {
    "function": undefined,
    "parameter": {
      "address": undefined,
      "quantity": undefined
    },
  },
  description: undefined,
  accessModes: [],
  features: [],
  interval: undefined,
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
});
const formRef = ref(null);
const jsonData = ref();
const loading = ref(false);
const configuration = ref({})

const defaultKeys = ['accessModes', 'features', 'interval', 'managedConfiguration']

provide("plugin-form", formData);
provide("plugin-form-channel", props.channel);
provide('point-form-collector', {})
provide(DATA_COLLECTOR_SAVE_TYPE, 'collector')
provide('metadata-configuration', configuration)

const _filterList = ["COLLECTOR_GATEWAY", "virtual"]
const onChange = async (node) => {
  if (
      node?.provider && !_filterList.includes(node.provider)
  ) {
    jsonData.value = await devGetProtocol(node.provider, "collector");
  } else {
    jsonData.value = undefined
  }
};

const handleOk = async (flag) => {
  const _data = await formRef.value?.validate();
  if (_data) {
    let _copyData = {...formData}
    // if (['COLLECTOR_GATEWAY'].includes(props.channel.provider)) {
    //   const copyData = cloneDeep(_data)
    //   _copyData = omit(copyData, ['configuration', 'collectorProvider'])
    //
    //   _copyData.configuration = {
    //     configuration: {
    //       ...omit(_data.configuration, 'collectorProvider'),
    //       inheritBreakerSpec: {
    //         type: 'Ignore'
    //       }
    //     },
    //     collectorProvider: _data.configuration?.collectorProvider
    //   }
    // } else {
    //   _copyData.configuration = {
    //     ..._data.configuration,
    //     template: pick(_data, defaultKeys)
    //   }
    // }
    const params = {
      ...omit(_copyData, defaultKeys),
      configuration: {
        ..._data.configuration,
        template: pick(_copyData, defaultKeys)
      },
      circuitBreaker: {
        type: 'Ignore'
      }
    };
    loading.value = true;
    try {
      const response = !props.data.id
          ? await save(params)
          : await update(props.data.id, {...props.data, ...params})
      loading.value = false;
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
    } catch (e) {
      loading.value = false;
    }
  }
};

watch(() => props.channel, () => {
  if (props.channel.id) {
    formData.channelId = props.channel.id
    formData.channelName = props.channel.name
    formData.provider = props.channel.provider
    onChange(props.channel)
  }
}, {
  immediate: true,
  deep: true
})

watch(() => props.data, (val) => {
  if (val.id) {
    Object.assign(formData, val)
    const _template = val.configuration?.template || {}
    defaultKeys.forEach(i => { // 转换模板中的数据
      formData[i] = _template[i]
    })
    onChange(props.data)
  }
}, {
  immediate: true,
  deep: true
})

watch(() => formData.provider, (val) => {
  if (val) {
    getPointMetadata(val, {}).then((res) => {
      configuration.value = res
    })
  }
}, {
  immediate: true
})
</script>

<style lang="less" scoped>
.point-config-content {
  margin-bottom: 12px;
}
</style>
