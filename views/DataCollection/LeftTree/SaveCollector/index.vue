<template>
  <a-drawer
    visible
    :title="data.id ? '编辑' : '新增'"
    width="40%"
    @close="emits('close')"
  >
    <div class="collector-form-header">
      <a-space size="large">
        <span>通道</span>
        <span style="font-weight: bold">{{ channel.name }}</span>
      </a-space>
    </div>
    <a-form
      class="form"
      layout="vertical"
      :model="formData"
      name="basic"
      autocomplete="off"
      ref="formRef"
    >
      <a-form-item
        :label="$t('Save.index.4001415-4')"
        name="name"
        :rules="LeftTreeRules.name"
      >
        <a-input
          :placeholder="$t('Save.index.4001415-5')"
          v-model:value="formData.name"
        />
      </a-form-item>
      <template v-if="jsonData">
        <h3 style="font-weight: bold">基本参数</h3>
        <div class="collector-config">
          <RenderComponents :value="jsonData" />
        </div>
      </template>
      <template v-if="provider !== 'COLLECTOR_GATEWAY'">
        <a-form-item
          :name="['configuration', 'inheritBreakerSpec', 'type']"
          :rules="LeftTreeRules.type"
          :label="$t('Save.index.4001415-35')"
        >
          <j-card-select
            :showImage="false"
            v-model:value="formData.configuration.inheritBreakerSpec.type"
            :options="[
              { label: $t('Save.index.4001415-36'), value: 'LowerFrequency' },
              { label: $t('Save.index.4001415-37'), value: 'Break' },
              { label: $t('Save.index.4001415-38'), value: 'Ignore' },
            ]"
            @change="changeCardSelectType"
          />
        </a-form-item>
        <p style="color: #616161"></p>
      </template>
      <template v-else>
        <a-form-item
          :label="$t('Channel.index.290640-4')"
          :name="['configuration', 'collectorProvider']"
          :rules="[{ required: true, message: $t('Channel.data.290641-3') }]"
        >
          <a-select
            style="width: 100%"
            v-model:value="formData.configuration.collectorProvider"
            :options="providerListItems"
            :placeholder="$t('Channel.data.290641-3')"
            allowClear
            show-search
            :filter-option="filterOption"
            :disabled="!!id"
          />
        </a-form-item>
        <a-form-item
          :name="['configuration', 'configuration', 'unitId']"
          :rules="LeftTreeRules.unitId"
          :label="$t('Save.index.4001415-30')"
        >
          <a-input-number
            style="width: 100%"
            :placeholder="$t('Save.index.4001415-30')"
            v-model:value="formData.configuration.configuration.unitId"
            :min="0"
            :max="255"
          />
        </a-form-item>

        <a-form-item
          :name="['configuration', 'endian']"
          :rules="LeftTreeRules.endian"
          :label="$t('Save.index.4001415-39')"
        >
          <j-card-select
            :showImage="false"
            v-model:value="formData.configuration.endian"
            :options="[
              { label: 'AB', value: 'BIG' },
              { label: 'BA', value: 'LITTLE' },
            ]"
            @change="changeCardSelectEndian"
            :column="2"
          />
        </a-form-item>
        <a-form-item
          :name="['configuration', 'endianIn']"
          :rules="LeftTreeRules.endianIn"
          :label="$t('Save.index.4001415-40')"
        >
          <j-card-select
            :showImage="false"
            v-model:value="formData.configuration.endianIn"
            :options="[
              { label: 'AB', value: 'BIG' },
              { label: 'BA', value: 'LITTLE' },
            ]"
            @change="changeCardSelectEndianIn"
            :column="2"
          />
        </a-form-item>
        <div style="color: #616161">
          <p>{{ $t("Save.index.4001415-41") }} {{ endianData }}</p>
          <p>
            {{ $t("Save.index.4001415-42") }}(int32、ieee754 float)
            {{ $t("Save.index.4001415-43") }}({{ $t("Save.index.4001415-44") }})
          </p>
        </div>
      </template>
      <a-form-item
        :name="['configuration', 'requestTimeout']"
        :rules="LeftTreeRules.requestTimeout"
        :label="$t('Save.index.4001415-45')"
      >
        <a-input-number
          style="width: 100%"
          :placeholder="$t('Save.index.4001415-46')"
          v-model:value="formData.configuration.requestTimeout"
          addon-after="ms"
          :max="60000"
          :min="2000"
        />
      </a-form-item>
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
    <template #footer>
      <a-space>
        <j-permission-button
          :loading="loading"
          type="primary"
          hasPermission="DataCollection:updateCollector"
          @click="handleOk"
        >
          确定
        </j-permission-button>
        <a-button @click="emits('close')">取消</a-button>
      </a-space>
    </template>
  </a-drawer>
</template>

<script setup lang="ts">
import { devGetProtocol } from "@collector/utils/utils";
import RenderComponents from "@collector/components/RenderComponents";
import { useI18n } from "vue-i18n";
import { PropType } from "vue";
import { cloneDeep, omit } from "lodash-es";
import {
  save,
  update,
  getProviders,
} from "@collector/api/data-collect/collector";
import { onlyMessage } from "@jetlinks-web/utils";

const { t: $t } = useI18n();
const props = defineProps({
  data: {
    type: Object as PropType<Record<string, any>>,
    default: () => ({}),
  },
  channel: {
    type: Object as PropType<Record<string, any>>,
    default: () => ({}),
  },
});
const emits = defineEmits(["close", "save"]);
const loading = ref(false);
const formRef = ref();

const jsonData = ref();
const formData = reactive({
  channelId: undefined,
  name: "",
  collectorProvider: undefined,
  configuration: {
    unitId: "",
    type: undefined,
    endian: "BIG",
    endianIn: "BIG",
    requestTimeout: 2000,
    serializable: false,
    inheritBreakerSpec: {
      type: "LowerFrequency",
    },
    configuration: {},
  },
  circuitBreaker: {
    // type: 'LowerFrequency',
    type: "Ignore",
  },
  description: "",
});

const LeftTreeRules = {
  channelId: [
    {
      required: true,
      message: $t("Collector.data.400141-25"),
      trigger: "blur",
    },
  ],
  name: [
    {
      required: true,
      message: $t("Collector.data.400141-26"),
    },
    { max: 64, message: $t("Collector.data.400141-2") },
  ],
  // type: [{ required: true, message: '请选择处理方式', trigger: 'blur' }],
  endian: [
    {
      required: true,
      message: $t("Collector.data.400141-29"),
      trigger: "blur",
    },
  ],
  endianIn: [
    {
      required: true,
      message: $t("Collector.data.400141-30"),
      trigger: "blur",
    },
  ],
  requestTimeout: [
    {
      pattern: /^\d+$/,
      message: $t("Collector.data.400141-31"),
      trigger: "change",
    },
  ],
};

const onChange = async (provider: string) => {
  if (provider && !["COLLECTOR_GATEWAY"].includes(provider)) {
    jsonData.value = await devGetProtocol(provider, "collector");
  } else {
    jsonData.value = undefined;
  }
};

const handleOk = async () => {
  const _data = await formRef.value?.validate();
  if (_data) {
    let _copyData = _data;
    if (["COLLECTOR_GATEWAY"].includes(props.channel?.provider || props.data.provider)) {
      const copyData = cloneDeep(_data);
      _copyData = omit(copyData, ["configuration", "collectorProvider"]);
      _copyData.configuration = {
        configuration: {
          ...omit(_data.configuration, "collectorProvider"),
          inheritBreakerSpec: {
            type: "Ignore",
          },
        },
        collectorProvider: _data.configuration?.collectorProvider,
      };
    }
    const params = {
      ..._copyData,
      provider: props.channel?.provider || props.data.provider,
      channelId: props.channel?.id || props.data.channelId,
      channelName: props.channel?.name || props.data.channelName,
      circuitBreaker: {
        type: "Ignore",
      },
    };
    loading.value = true;
    try {
      const response = !props.data.id
        ? await save(params)
        : await update(props.data.id, { ...props.data, ...params });
      loading.value = false;
      if (response.success) {
        emits("save", props.data?.id ? "save" : "add",  props.data?.id ? formData : response.result);
        onlyMessage($t('Tree.index.4001410-12'), 'success');
      }
    } catch (e) {
      loading.value = false;
    }
  }
};

watch(
  () => props.data,
  (value) => {
    if (value.id) {
      let copyValue = cloneDeep(value);
      if (
        !copyValue?.configuration?.inheritBreakerSpec &&
        copyValue.provider !== "COLLECTOR_GATEWAY"
      ) {
        copyValue.configuration = {
          ...copyValue.configuration,
          inheritBreakerSpec: {
            type: value.circuitBreaker?.type,
          },
        };
        copyValue.circuitBreaker.type = "Ignore";
      }
      if (copyValue.provider === "COLLECTOR_GATEWAY") {
        Object.assign(formData, copyValue);

        formData.configuration = {
          ...copyValue.configuration,
          ...copyValue.configuration?.configuration,
        };
      } else {
        Object.assign(formData, copyValue);
      }
      onChange(copyValue.provider);
    }
  },
  { immediate: true, deep: true }
);

watch(
  () => props.channel,
  (value) => {
    if (value && Object.keys(value).length) {
      onChange(value.provider);
    }
  },
  { immediate: true, deep: true }
);

provide("plugin-form", formData);
provide("plugin-form-channel", props.channel);
</script>
<style lang="less" scoped>
.collector-form-header {
  border-bottom: 1px solid #f0f0f0;
  padding-bottom: 10px;
  margin-bottom: 10px;
}
.collector-config {
  border: 1px solid #f0f0f0;
  padding: 10px;
  margin-bottom: 10px;
  border-radius: 5px;
  box-shadow: 0 0 5px rgba(0, 0, 0, 0.1);
}
</style>
