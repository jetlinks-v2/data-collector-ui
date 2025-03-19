<template>
  <a-modal
    visible
    :title="title"
    width="90vw"
    :okText="$t('task.task.010223-0')"
    :mask-closable="false"
    @cancel="onCancel"
    @ok="onOk"
  >
    <a-form
      layout="vertical"
      ref="formRef"
      :model="formModel"
      :rules="rules"
    >
    <div class="task-body">

      <div class="task-form">
          <a-form-item :label="$t('task.task.010223-1')" name="name" v-if="!showBindChildren">
            <a-input v-model:value="formModel.name" :placeholder="$t('task.task.010223-2')" />
          </a-form-item>
          <a-form-item name="thingList" style="width: 100%;">
            <template #label>
              {{ $t('task.task.010223-3') }}
              <div class="form-label-extra gateway-list-label">
                <a-badge :count="formModel.thingList.length" />
                <a-button type="link" @click="openGatewayModal">{{ $t('task.task.010223-4') }}</a-button>
              </div>
            </template>
            <GatewaySelect
              v-model:value="formModel.thingList"
            />
          </a-form-item>
          <a-form-item :label="$t('task.task.010223-5')" name="jobType" required>
            <CheckButton
              v-model:value="formModel.jobType"
              :options="batchOperateOptions"
              :beforeChange="batchOperateChange"
            />
          </a-form-item>
          <a-form-item v-if="!showBindChildren" :label="$t('task.task.010223-6')" name="description">
            <a-textarea
              v-model:value="formModel.description"
              :placeholder="$t('task.task.010223-7')"
              :rows="4"
            />
          </a-form-item>
      </div>
      <div v-if="formModel.jobType" class="task-content">
        <div v-if="!showBindChildren">
          <a-row :gutter="16">
            <a-col :span="12">
              <a-form-item :label="$t('task.task.010223-8')" name="timeoutSeconds" required>
                <a-input-number
                  v-model:value="formModel.timeoutSeconds"
                  :min="1"
                  :max="99999"
                  :precision="0"
                  :placeholder="$t('task.task.010223-9')"
                  style="width: 100%;"
                />
              </a-form-item>
            </a-col>
            <a-col :span="12">
              <a-form-item :label="$t('task.task.010223-10')" name="maxRetry" required>
                <a-input-number
                  v-model:value="formModel.maxRetry"
                  :min="1"
                  :max="99999"
                  :precision="0"
                  :placeholder="$t('task.task.010223-11')"
                  style="width: 100%;"
                />
              </a-form-item>
            </a-col>
          </a-row>
        </div>
        <ContentPlugin v-if="formModel.jobType === 'plugin'" ref="contentRef" :options="formModel.thingList" />
        <ContentRemote v-else-if="formModel.jobType === 'remote'" ref="contentRef" :options="formModel.thingList" />
        <ContentChildren v-else-if="formModel.jobType === 'device'" ref="contentRef" :options="formModel.thingList" :updateDevice="updateDevice" @change="onChildrenChange"/>
        <ContentAiModel v-else-if="formModel.jobType === 'AiModel'" ref="contentRef" :options="formModel.thingList" />
        <ContentAiResource v-else-if="formModel.jobType === 'AiResource'" ref="contentRef" :options="formModel.thingList" />
        <ContentCollectorTemplate v-else-if="formModel.jobType === 'CollectorTemplate'" ref="contentRef"  :options="formModel.thingList" />
      </div>
      <div v-else class="task-content" style="margin-top: 15%;">
        <j-empty>
          <template #description>
            <p>{{$t('Tree.index.4001410-10')}}</p>
            <span>{{$t('task.task.010223-22')}}</span>
          </template>
        </j-empty>
      </div>

      <GatewayModal
        v-if="gatewayData.visible"
        :filter="formModel.thingList"
        @cancel="closeGatewayModal"
        @ok="addGateway"
      />
    </div>
    </a-form>
    <ChildrenModal v-if="modalVisible" @cancel="modalVisible = false" @ok="childOk" @close="childCancel"/>
    <template #footer>
      <div v-if="!showBindChildren">
        <a-button @click="onCancel">{{ $t('task.task.010223-12') }}</a-button>
        <a-button type="primary" :loading="loading" @click="onOk">{{ $t('task.task.010223-13') }}</a-button>
      </div>
    </template>
  </a-modal>
</template>

<script setup name="TaskModal">
import GatewaySelect from './Gateway.vue'
import GatewayModal from './GatewayModal.vue'
import ContentPlugin from './Plugin/index.vue'
import ContentRemote from './Remote/index.vue'
import ContentChildren from './Children/index.vue'
import ContentAiModel from './AiModel/index.vue'
import ContentAiResource from './AiResource/index.vue'
import ContentCollectorTemplate from './CollectorTemplate/index.vue'
import { detail } from '../../../../api/others';
import { createTask } from '../../../../api/edge/batch'
import { useRequest } from '@jetlinks-web/hooks'

import {useBatchOperateOptions} from "../util";
import {Modal} from "ant-design-vue";
import {onlyMessage} from "@jetlinks-web/utils";
import ChildrenModal from './Children/ChildrenModal.vue'
import { useI18n } from 'vue-i18n';
import {  cloneDeep } from 'lodash-es';

const { t: $t } = useI18n();

const props = defineProps({
  value: {
    type: Object,
    default: () => ({})
  },
  list: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['cancel', 'ok'])

const { loading, run } = useRequest( createTask, {
  immediate: false,
  onSuccess() {
    emit('ok')
    onlyMessage($t('log.TaskDetail.866822-30'))
  }
})

const { batchOperateOptions } = useBatchOperateOptions()

const contentRef = ref()
const formRef = ref()
const formModel = reactive({
  name: '',
  jobType: undefined,
  thingList: cloneDeep(props.list),
  description: undefined
})
const modalVisible = ref(false)

const gatewayData = reactive({
  visible: false,
  selectRow: []
})
const showBindChildren = computed(() => {
  return formModel.jobType === 'device'
})

const title = computed(() => {
  return batchOperateOptions.value.find(item => item.value === formModel.jobType)?.label
})

const rules = {
  name: [
    { required: true, message: $t('task.task.010223-14') },
    { max: 64, message: $t('task.task.010223-15') },
  ],
  type: [
    {
      required: true,
      validator: (_rule, value) => {
        if (!value) {
          return Promise.reject($t('task.task.010223-16'));
        } else {
          return Promise.resolve();
        }
      },
    },
  ],
  thingList: [{
    required: true,
    validator: (_rule, value) => {
      if (!value.length) {
        return Promise.reject($t('task.task.010223-17'));
      } else {
        return Promise.resolve();
      }
    },
  }],
  description: [
    { max: 200, message: $t('task.task.010223-18'), trigger: 'blur' },
  ],
  timeoutSeconds: [
    {
      required: true,
      message: $t('task.task.010223-19')
    }
  ],
  maxRetry: [
    {
      required: true,
      message: $t('task.task.010223-11')
    }
  ]
}

const updateDevice = (id) => {
  detail(id).then(resp => {
    if (resp.success) {
      formModel.thingList = formModel.thingList.map(item => {
        if (item.id) {
          item.state = resp.result.state
        }
        return item
      })
    }
  })
}

const closeGatewayModal = () => {
  gatewayData.visible = false
  gatewayData.selectRow = []
}
const openGatewayModal = () => {
  gatewayData.visible = true
}

const addGateway = (rows) => {
  gatewayData.visible = false
  formModel.thingList.push(...rows.map(item => ({
    value: item.id,
    label: item.name,
    ...item
  })))
}

const onCancel = () => {
  if(formModel.jobType === 'device' && contentRef.value.checked()) {
    modalVisible.value = true
  }else{
    emit('cancel')
  }
}

const onOk = async () => {
  const formResp = await formRef.value.validate()

  if (!formResp) {
    return
  }

  const commandArgs = await contentRef.value.getValue()

  if (!commandArgs.length) {
    onlyMessage($t('task.task.010223-20', [title.value]), 'warning')
    return
  }

  const newThingList = formModel.thingList.map(item => {
    return {
      thingId: item.id || item.thingId,
      thingType: 'device',
      thingName: item.name || item.thingName
    }
  })
  const newParams = {
    ...formModel,
    thingList: newThingList,
    commandArgs,
    resourceTotal: newThingList.length,
    serviceId: formModel.jobType === 'plugin' ? 'pluginService:driver' : formModel.jobType === 'CollectorTemplate' ? 'commonService:entityTemplate' : 'aiService:modelManager',
    commandId: 'SaveByTemplate',
    others: {
      thingList: newThingList,
      commandTotal: commandArgs.length || 0
    }
  }

  run(newParams)
}

const batchOperateChange = (e) => {
  if (e === formModel.jobType) {
    return
  }
  if(formModel.jobType) {
    return new Promise((resolve, reject) => {
      Modal.confirm({
        title: $t('task.task.010223-21'),
        onOk() {
          resolve(true)
        },
        onCancel() {
          resolve(false)
        }
      })
    })
  }
}

const init = () => {
  const keys = Object.keys(props.value || {})
  if(keys.length) {
    keys.forEach(key => {
      if (key in toRaw(formModel)) {
        formModel[key] = props.value[key]
      }
    })
  }
}

init()


const childCancel = () => {
  modalVisible.value = false
  emit('cancel')
}

const childOk = async() => {
  await contentRef.value?.onClose()
  setTimeout(() => {
    childCancel()
  }, 300)
}

const onChildrenChange = (e)=>{
  console.log('eeeee====',e);
}

</script>

<style scoped lang="less">
.task-body {
  display: flex;
  gap: 24px;

  .task-form {
    width: 380px;
  }


  .task-content {
    flex: 1 1 0;
  }

  .form-label-extra {
    position: absolute;
    right: 0;
    display: flex;
    align-items: center;
    // gap: 24px;
    transform: translateX(calc(100% + 12px));
  }

  .gateway-list-label {
    // width: 15rem;
    // justify-content: space-between;
    // padding-right: 24px;
  }
}
</style>
