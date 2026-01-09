<template>
  <a-drawer open title="其余配置" width="800px" @close="emit('close')">
    <div style="display: flex; flex-direction: column; justify-content: space-between; height: 100%">
      <div style="flex: 1; min-height: 0; overflow: hidden auto">
        <a-form :model="formData" ref="formRef" layout="vertical">
          <!--          <DataParsing/>-->
          <!--          <CollectionConfiguration/>-->
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
          <a-button type="primary" @click="save">保存</a-button>
          <a-button @click="emit('close')">取消</a-button>
        </a-space>
      </div>
    </div>
  </a-drawer>
</template>

<script setup>
import DataConversion from "../../../Config/DataConversion.vue";
import AbnormalJudgment from "../../../Config/AbnormalJudgment.vue";
import DeadZone from "../../../Config/DeadZone.vue";
import StorageConfiguration from "../../../Config/StorageConfiguration.vue";
import ResultProcessing from "../../../Config/ResultProcessing.vue";
import {useI18n} from "vue-i18n";
import {DATA_COLLECTOR_SAVE_TYPE} from "@data-collector-ui/views/data-collect/data";
import { randomString } from '@jetlinks-web/utils'
import { cloneDeep } from 'lodash-es'

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
  name: undefined,
  provider: undefined,
  collectorId: undefined,
  collectorName: undefined,
  channelId: undefined,
  channelName: undefined,
  description: undefined,
  interval: 3000,
  inheritBreaker: false, // 是否继承熔断
  circuitBreaker: undefined, // 错误处理方式
  priority: undefined, // 优先级
  features: [],
  pointKey: undefined,
  accessModes: [], // 可选值： read , write ,subscribe
  managedConfiguration: {}, // 点位管理配置
  configuration: {},
});
const formRef = ref(null)
const configVisible = ref(true)

const save = async () => {
  const resp =  await formRef.value.validate()
  if (resp) {
    emit('save',  toRaw(formData))
  }
}

const init = () => {
  Object.keys(formData).forEach((key) => {
    formData[key] = props.data[key]
  })
}

init()

provide('plugin-form', formData)
provide('point-form-collector', props.collector)
provide(DATA_COLLECTOR_SAVE_TYPE, 'point')

</script>

<style lang="less" scoped>
.point-config {
  border: 1px solid #e8e8e8;
  padding: 16px;
  border-radius: 6px;
  margin-bottom: 16px;
}
</style>
