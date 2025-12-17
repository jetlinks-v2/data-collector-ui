<template>
  <a-drawer open title="新增采集器" :width="800" @close="emit('close')">
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
              <a-form-item label="所属通道" name="channelId" :rules="[
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
            <TitleComponent data="基本参数"/>
            <RenderComponents
                v-if="jsonData"
                :value="jsonData"
            />
          </div>
          <TitleComponent data="点位模板">
            <template #extra>
              <div style="color: #999;font-size: 12px">下述配置仅作用于点位，其下属点位默认值自动继承此规则</div>
            </template>
          </TitleComponent>
          <DataParsing :showSwitch="false"/>
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
          <a-button type="primary" @click="handleOk" :loading="loading">保存</a-button>
          <a-button @click="onContinue">确认并继续</a-button>
          <a-button @click="emit('close')">取消</a-button>
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
import {cloneDeep, omit} from "lodash-es";
import {save, update} from "@data-collector-ui/api/data-collect/collector";

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
  name: '',
  collectorProvider: undefined,
  configuration: {
    unitId: '',
    type: undefined,
    endian: 'BIG',
    endianIn: 'BIG',
    requestTimeout: 2000,
    serializable: false,
    inheritBreakerSpec: {
      type: 'LowerFrequency',
    },
    configuration: {}
  },
  circuitBreaker: {
    // type: 'LowerFrequency',
    type: 'Ignore'
  },
  description: '',
});
const formRef = ref(null);
const jsonData = ref();
const loading = ref(false);

provide("plugin-form", formData);
provide("plugin-form-channel", props.channel);
provide(DATA_COLLECTOR_SAVE_TYPE, 'collector')

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

const handleOk = async () => {
  const _data = await formRef.value?.validate();

  if (_data) {

    let _copyData = _data

    if (['COLLECTOR_GATEWAY'].includes(props.channel.provider)) {
      const copyData = cloneDeep(_data)
      _copyData = omit(copyData, ['configuration', 'collectorProvider'])

      _copyData.configuration = {
        configuration: {
          ...omit(_data.configuration, 'collectorProvider'),
          inheritBreakerSpec: {
            type: 'Ignore'
          }
        },
        collectorProvider: _data.configuration?.collectorProvider
      }
    }

    const params = {
      ..._copyData,
      provider: props.channel.provider,
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
        emit('change', true);
      }
    } catch (e) {
      loading.value = false;
    }
  }
};

const onContinue = () => {
  // todo: 数据默认回填:「点位模版」中数据默认填入该通讯协议下新增采集器的上一次配置数据
}

watch(() => props.channel, () => {
  if (props.channel.id) {
    formData.channelId = props.channel.id
    formData.channelName = props.channel.name
    onChange(props.channel)
  }
}, {
  immediate: true
})
</script>

<style lang="less" scoped>

</style>
