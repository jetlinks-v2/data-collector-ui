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
                <a-select
                    placeholder="请选择"
                    v-model:value="formData.collectorId"
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
          <a-button type="primary">保存</a-button>
          <a-button @click="emit('close')">确认并继续</a-button>
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
  name: '',
  collectorId: props.collector?.collectorId,
  configuration: props.data.configuration || {
    valueType: undefined,
    terms: [],
    pointAddress: "",
    interval: 3000,
  },
  accessModes: [],
  features: [],
  description: props.data.description || "",
});
const formRef = ref(null)
const jsonData = ref();
const configVisible = ref(false)

provide('formData', formData)
provide(DATA_COLLECTOR_SAVE_TYPE, 'point')

const getProtocol = async () => {
  jsonData.value = await devGetProtocol(props.collector?.provider || 'MODBUS_TCP', "point");
};
getProtocol();


</script>

<style lang="less" scoped>
.point-config {
  border: 1px solid #e8e8e8;
  padding: 16px;
  border-radius: 6px;
  margin-bottom: 16px;
}
</style>
