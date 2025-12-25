<template>
  <a-drawer open title="新增点位" width="800px" @close="emit('close')">
    <div style="display: flex; flex-direction: column; justify-content: space-between; height: 100%">
      <div style="flex: 1; min-height: 0; overflow: hidden auto">
        <a-form :model="formData" ref="formRef" layout="vertical">
          <a-row :gutter="[24, 24]">
            <a-col :span="12">
              <a-form-item :label="$t('Save.SaveModBus.4001413-2')" name="name"
                           :rules="[{required: true, message: '请输入名称', trigger: ['blur']}]">
                <a-input
                    :placeholder="$t('Save.SaveModBus.4001413-3')"
                    v-model:value="formData.name"
                />
              </a-form-item>
            </a-col>
            <a-col :span="12">
              <a-form-item label="所属采集器" name="collectorId" :disabled="true">
                <a-input
                    placeholder="请选择"
                    v-model:value="formData.collectorName"
                    disabled
                />
              </a-form-item>
            </a-col>
          </a-row>
          <div class="point-config" v-if="jsonData">
            <h3>点位配置</h3>
            <!--todo: 请求远程的动态配置-->
            <div>
              <RenderComponents v-if="jsonData" :value="jsonData"/>
            </div>
          </div>
          <DataParsing/>
          <CollectionConfiguration/>
          <DataConversion/>
          <div style="cursor: pointer; font-weight: bold;" @click="configVisible = !configVisible">
            高级配置
            <AIcon :type="!configVisible ? 'RightOutlined' : 'DownOutlined'"/>
          </div>
          <template v-if="configVisible">
            <AbnormalJudgment/>
            <DeadZone/>
            <StorageConfiguration/>
            <ResultProcessing/>
          </template>
        </a-form>
      </div>
      <div style="padding-top: 24px;">
        <a-space>
          <a-button type="primary" @click="onSubmit(false)">保存</a-button>
          <a-button @click="onSubmit(true)">确认并继续</a-button>
          <a-button @click="emit('close')">取消</a-button>
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
  collectorId: props.collector?.id,
  collectorName: props.collector.name,
  name: undefined,
  provider: props.collector.provider,
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

provide('plugin-form', formData)
provide('point-form-collector', props.collector)
provide(DATA_COLLECTOR_SAVE_TYPE, 'point')

console.log(props.collector, 'props.collector')
const onChange = async (provider) => {
  jsonData.value = await devGetProtocol(provider || 'MODBUS_TCP', "point");
};

const onSubmit = async (flag) => {
  console.log(formData, 'formData', flag)
  const resp = await formRef.value?.validate?.()
  if (resp) {
    // emit('save', formData)
  }
}

watch(() => props.collector, () => {
  console.log(props.collector)
  if (props.collector.id) {
    formData.collectorId = props.collector.id
    formData.collectorName = props.collector.name
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
