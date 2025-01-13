<template>
  <a-modal
    :title="data.id ? $t('Save.index.290643-0') : $t('Save.index.290643-1')"
    :visible="true"
    width="700px"
    :maskClosable="false"
    @cancel="handleCancel"
  >
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
        />
      </a-form-item>
      <a-form-item
        v-if="formData.provider === 'MODBUS_TCP'"
        :name="['configuration', 'host']"
        :rules="FormValidate.host"
      >
        <template #label>
          {{ $t("Save.index.290643-6") }}
          <a-tooltip :title="$t('Save.index.290643-7')">
            <AIcon type="QuestionCircleOutlined" style="margin-left: 2px" />
          </a-tooltip>
        </template>
        <a-input
          :placeholder="$t('Save.index.290643-8')"
          v-model:value="formData.configuration.host"
        />
      </a-form-item>
      <a-form-item
        v-if="formData.provider === 'MODBUS_TCP'"
        :label="$t('Save.index.290643-9')"
        :name="['configuration', 'port']"
        :rules="FormValidate.port"
      >
        <a-input-number
          style="width: 100%"
          :placeholder="$t('Save.index.290643-10')"
          v-model:value="formData.configuration.port"
          :min="0"
          :max="65535"
        />
      </a-form-item>
      <a-form-item
        v-if="formData.provider === 'OPC_UA'"
        :label="$t('Save.index.290643-11')"
        :name="['configuration', 'endpoint']"
        :rules="FormValidate.endpoint"
      >
        <a-input
          :placeholder="$t('Save.index.290643-12')"
          v-model:value="formData.configuration.endpoint"
        />
      </a-form-item>
      <a-form-item
        v-if="formData.provider === 'OPC_UA'"
        :label="$t('Save.index.290643-13')"
        :name="['configuration', 'securityPolicy']"
        :rules="FormValidate.securityPolicy"
      >
        <a-select
          style="width: 100%"
          v-model:value="formData.configuration.securityPolicy"
          :options="Options['security-policies']"
          :placeholder="$t('Save.index.290643-14')"
          allowClear
          show-search
          :filter-option="filterOption"
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
      <a-form-item
        v-if="formData.provider === 'OPC_UA'"
        :label="$t('Save.index.290643-17')"
        :name="['configuration', 'securityMode']"
        :rules="FormValidate.securityMode"
      >
        <a-select
          style="width: 100%"
          v-model:value="formData.configuration.securityMode"
          :options="Options['security-modes']"
          :placeholder="$t('Save.index.290643-18')"
          allowClear
          show-search
          :filter-option="filterOption"
        />
      </a-form-item>
      <a-form-item
        v-if="isSecurityMode"
        :label="$t('Save.index.290643-19')"
        :name="['configuration', 'certId']"
        :rules="FormValidate.certId"
      >
        <a-select
          style="width: 100%"
          v-model:value="formData.configuration.certId"
          :options="certificateList"
          :placeholder="$t('Save.index.290643-20')"
          allowClear
          show-search
          :filter-option="filterOption"
        />
      </a-form-item>
      <a-form-item
        v-if="formData.provider === 'OPC_UA'"
        :label="$t('Save.index.290643-21')"
        :name="['configuration', 'authType']"
        :rules="FormValidate.authType"
      >
        <j-card-select
          :showImage="false"
          v-model:value="formData.configuration.authType"
          :options="Options['auth-types']"
          @change="changeAuthType"
          :column="2"
        />
      </a-form-item>
      <a-form-item
        v-if="isAuthType"
        :label="$t('Save.index.290643-22')"
        :name="['configuration', 'username']"
        :rules="FormValidate.username"
      >
        <a-input
          :placeholder="$t('Save.index.290643-23')"
          v-model:value="formData.configuration.username"
        />
      </a-form-item>
      <a-form-item
        v-if="isAuthType"
        :label="$t('Save.index.290643-24')"
        :name="['configuration', 'password']"
        :rules="FormValidate.password"
      >
        <a-input-password
          :placeholder="$t('Save.index.290643-25')"
          v-model:value="formData.configuration.password"
        />
      </a-form-item>
      <template v-if="formData.provider === 'BACNetIp'">
        <a-form-item
          :label="$t('Save.index.290643-26')"
          :name="['configuration', 'instanceNumber']"
          :rules="{
            required: true,
            trigger: 'blur',
            validator: validate,
          }"
        >
          <a-input-number
            style="width: 100%"
            v-model:value="formData.configuration.instanceNumber"
            :min="0"
            :precision="0"
            :max="999999999999"
            :placeholder="$t('Save.index.290643-27')"
          ></a-input-number>
        </a-form-item>
        <a-form-item
          :label="$t('Save.index.290643-28')"
          :name="['configuration', 'overIp', 'localBindAddress']"
          :rules="{
            required: true,
            trigger: 'blur',
            message: $t('Save.index.290643-29'),
          }"
        >
          <a-input
            v-model:value="formData.configuration.overIp.localBindAddress"
          >
          </a-input>
        </a-form-item>
        <a-form-item
          :label="$t('Save.index.290643-30')"
          :name="['configuration', 'overIp', 'port']"
          :rules="{
            required: true,
            trigger: 'blur',
            message: $t('Save.index.290643-31'),
          }"
        >
          <a-input-number
            v-model:value="formData.configuration.overIp.port"
            style="width: 100%"
            :min="1"
            :max="65535"
            :precision="0"
            :placeholder="$t('Save.index.290643-31')"
          ></a-input-number>
        </a-form-item>
        <a-form-item
          :label="$t('Save.index.290643-32')"
          :name="['configuration', 'overIp', 'subnetAddress']"
          :rules="{
            trigger: 'change',
            validator: validateSubnetAddress,
          }"
        >
          <a-input
            v-model:value="formData.configuration.overIp.subnetAddress"
            style="width: 100%"
            :placeholder="$t('Save.index.290643-33')"
          ></a-input>
        </a-form-item>
        <a-form-item
          :label="$t('Save.index.290643-34')"
          :name="['configuration', 'overIp', 'networkPrefixLength']"
        >
          <a-input-number
            v-model:value="formData.configuration.overIp.networkPrefixLength"
            style="width: 100%"
            :min="1"
            :max="65535"
            :precision="0"
            :placeholder="$t('Save.index.290643-35')"
          ></a-input-number>
        </a-form-item>
      </template>
      <!-- <a-form-item
                v-if="formData.provider === 'snap7'"
                :name="['configuration', 'connect']"
            >
                <a-input v-model:value="formData.configuration.connect"/>
            </a-form-item> -->
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
    <template #footer>
      <a-button key="back" @click="handleCancel">{{
        $t("Save.index.290643-38")
      }}</a-button>
      <j-permission-button
        key="submit"
        type="primary"
        :loading="loading"
        @click="handleOk"
        style="margin-left: 8px"
        :hasPermission="`DataCollect/Channel:${id ? 'update' : 'add'}`"
      >
        {{ $t("Save.index.290643-39") }}
      </j-permission-button>
    </template>
  </a-modal>
</template>
<script lang="ts" setup>
import {
  save,
  update,
  queryOptionsList,
  queryCertificateList,
  getProviders,
} from "../../../../api/data-collect/channel";
import { FormValidate, FormState, protocolList } from "../data";
import type { FormInstance } from "ant-design-vue";
import type { FormDataType } from "../type.d";
import { cloneDeep, isArray, omit } from "lodash-es";
// import { protocolList } from '@/utils/consts';
import GateWayFormItem from "./GateWayFormItem.vue";
import { testIpv4_6 } from "@/utils/validate";
import { useI18n } from "vue-i18n";

const { t: $t } = useI18n();

const props = defineProps({
  data: {
    type: Object,
    default: () => {},
  },
});

const emit = defineEmits(["change"]);
const loading = ref(false);
const id = props.data.id;
const formRef = ref<FormInstance>();

const certificateList = ref([]);
const providersList = ref([]);
const Options = ref({
  "auth-types": [],
  "security-modes": [],
  "security-policies": [],
});

const formData = ref<FormDataType>(cloneDeep(FormState));

const handleOk = async () => {
  const params: any = await formRef.value?.validate();
  if (params?.provider === "COLLECTOR_GATEWAY") {
    params.configuration.deviceName = formData.value.configuration.deviceName;
  }
  if (params?.provider === "snap7") {
    params.configuration = {
      connect: false,
    };
  } else if (params?.provider === "iec104") {
    params.configuration = {};
  } else if (params?.provider === "BACNetIp") {
    if (!params.configuration.overIp?.subnetAddress) {
      params.configuration.overIp = omit(params.configuration.overIp, [
        "subnetAddress",
      ]);
    }
  }

  params.circuitBreaker = {
    type: "Ignore",
  };

  loading.value = true;
  const response = !id
    ? await save(params).catch(() => {})
    : await update(id, { ...props.data, ...params }).catch(() => {});
  emit("change", response?.status === 200);
  loading.value = false;
  formRef.value?.resetFields();
};

const validate = async (_rule: any, value: string) => {
  if (!value) {
    return Promise.reject($t("Save.index.290643-40"));
  } else {
    const reg = new RegExp(/^[0-9]*$/);
    if (!reg.test(value) || parseInt(value) < 0) {
      return Promise.reject($t("Save.index.290643-41"));
    }
    return Promise.resolve();
  }
};

const validateSubnetAddress = async (_rule: any, value: string) => {
  if (value && !testIpv4_6(value)) {
    return Promise.reject($t("Save.index.290643-42"));
  }
  return Promise.resolve();
};

const handleCancel = () => {
  emit("change", false);
  formRef.value?.resetFields();
};

const changeAuthType = (value: Array<string>) => {
  formData.value.configuration.authType = value[0];
};

const isAuthType = computed(() => {
  const { authType } = formData.value.configuration;
  return isArray(authType)
    ? authType[0] === "username" && formData.value.provider === "OPC_UA"
    : authType === "username" && formData.value.provider === "OPC_UA";
});
const isSecurityMode = computed(() => {
  const { securityMode } = formData.value.configuration;
  return securityMode === "SignAndEncrypt" || securityMode === "Sign"
    ? true
    : false;
});

const filterOption = (input: string, option: any) => {
  return option.label.toLowerCase().indexOf(input.toLowerCase()) >= 0;
};

const getOptionsList = async () => {
  for (let key in Options.value) {
    const res: any = await queryOptionsList(key);
    if (res.status === 200) {
      Options.value[key] = res.result.map((item: any) => ({
        label: item?.text || item,
        value: item?.value || item,
      }));
    }
  }
};
const getCertificateList = async () => {
  const res: any = await queryCertificateList();
  if (res.status === 200) {
    certificateList.value = res.result.map((item: any) => ({
      label: item.name,
      value: item.id,
    }));
  }
};

const getProvidersList = async () => {
  const resp: any = await getProviders();
  if (resp.status === 200) {
    providersList.value = resp.result.map((i: any) => {
      if (i.name === "opc-ua") {
        getOptionsList();
      }
      return {
        label: i.name,
        value: i.id,
      };
    });
  }
};
getProvidersList();
getCertificateList();

watch(
  () => props.data,
  (value) => {
    if (value.id) {
      formData.value = value as FormDataType;
    }
  },
  { immediate: true, deep: true }
);
</script>

<style lang="less" scoped></style>
