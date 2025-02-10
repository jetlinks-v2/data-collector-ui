<template>
  <a-modal
      :title="data.id ? $t('Save.index.290643-0') : $t('Save.index.290643-1')"
      :visible="true"
      width="700px"
      :maskClosable="false"
      @cancel="handleCancel"
  >
    <div style="max-height: 600px; overflow-y: auto">
      <a-form
          class="form"
          layout="vertical"
          :model="formData"
          name="basic"
          autocomplete="off"
          :rules="FormValidate"
          ref="formRef"
      >
        <a-form-item :label="$t('Save.index.290643-2')" name="name">
          <a-input
              :placeholder="$t('Save.index.290643-3')"
              v-model:value="formData.name"
          />
        </a-form-item>
        <a-form-item :label="$t('Save.index.290643-4')" name="provider">
          <a-select
              style="width: 100%"
              v-model:value="formData.provider"
              :options="providersList"
              :placeholder="$t('Save.index.290643-5')"
              allowClear
              show-search
              :filter-option="filterOption"
              :disabled="!!id"
              @change="onChange"
          />
        </a-form-item>
        <a-form-item
            v-if="formData.provider === 'COLLECTOR_GATEWAY'"
            :name="['configuration', 'deviceId']"
            :rules="[{ required: true, message: $t('Save.index.290643-15') }]"
            :label="$t('Save.index.290643-16')"
        >
          <GateWayFormItem
              v-model:name="formData.configuration.deviceName"
              v-model:value="formData.configuration.deviceId"
          />
        </a-form-item>
        <template v-else>
          <RenderComponents v-if="jsonData" :value="jsonData"/>
        </template>
        <a-form-item :label="$t('Save.index.290643-36')" name="description">
          <a-textarea
              :placeholder="$t('Save.index.290643-37')"
              v-model:value="formData.description"
              :maxlength="200"
              :rows="3"
              showCount
          />
        </a-form-item>
      </a-form>
    </div>
    <template #footer>
      <a-button key="back" @click="handleCancel">{{ $t('Save.index.290643-38') }}</a-button>
      <j-permission-button
          key="submit"
          type="primary"
          :loading="loading"
          @click="handleOk"
          style="margin-left: 8px"
          :hasPermission="`DataCollect/Channel:${id ? 'update' : 'add'}`"
      >
        {{ $t('Save.index.290643-39') }}
      </j-permission-button>
    </template>
  </a-modal>
</template>
<script setup>
import {
  save,
  update,
  getProviders,
} from '@collector/api/data-collect/channel';
import {FormValidate, FormState} from '../data';
import {cloneDeep} from 'lodash-es';
import {useI18n} from 'vue-i18n';
import {devGetProtocol} from "@collector/utils/utils";
import GateWayFormItem from "./GateWayFormItem.vue";

const {t: $t} = useI18n();

const props = defineProps({
  data: {
    type: Object,
    default: () => ({})
  },
});

const emit = defineEmits(['change']);
const loading = ref(false);
const id = props.data.id;
const formRef = ref();
const jsonData = ref();

const providersList = ref([]);
const formData = reactive(cloneDeep(FormState));

provide("plugin-form", formData);

const handleOk = async () => {
  const params = await formRef.value?.validate();
  if (params?.provider === 'COLLECTOR_GATEWAY') {
    params.configuration.deviceName =
        formData.configuration.deviceName;
  }
  // if (params?.provider === 'snap7') {
  //   params.configuration = {
  //     connect: false,
  //   };
  // } else if (params?.provider === 'iec104') {
  //   params.configuration = {};
  // } else if (params?.provider === 'BACNetIp') {
  //   if (!params.configuration.overIp?.subnetAddress) {
  //     params.configuration.overIp = omit(params.configuration.overIp, ['subnetAddress'])
  //   }
  // }

  params.circuitBreaker = {
    type: 'Ignore',
  };

  loading.value = true;
  const response = !id
      ? await save(params).catch(() => {
      })
      : await update(id, {...props.data, ...params}).catch(() => {
      });
  emit('change', response?.status === 200);
  loading.value = false;
  formRef.value?.resetFields();
};

const onChange = async (val) => {
  if(val !== 'COLLECTOR_GATEWAY'){
    jsonData.value = await devGetProtocol(val, 'channel');
  }
};

const handleCancel = () => {
  emit('change', false);
  formRef.value?.resetFields();
};

const filterOption = (input, option) => {
  return option.label.toLowerCase().indexOf(input.toLowerCase()) >= 0;
};

const getProvidersList = async () => {
  const resp = await getProviders();
  if (resp.success) {
    providersList.value = resp.result
        .map((item) => {
          return {
            ...item,
            value: item.id,
            label: item.name,
          };
        });
  }
};
watch(
    () => props.data,
    (value) => {
      if (value?.id) {
        Object.assign(formData, cloneDeep(value));
        if (value?.provider) {
          onChange(value.provider);
        }
      }
    },
    {immediate: true, deep: true},
);

onMounted(() => {
  getProvidersList();
})
</script>

<style lang="less" scoped></style>
