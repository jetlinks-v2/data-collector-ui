<template>
  <div>
    <div class="channel-form-header">
      <a-space size="large">
        <span>{{ $t('Info.index.077901-4') }}</span>
        <span style="font-weight: bold">{{ provider }}</span>
      </a-space>
      <a-button :disabled="formData.id" type="link" @click="handleClear"
        >{{ $t('Save.GateWayFormItem.290644-1') }}</a-button
      >
    </div>
    <a-form ref="formRef" layout="vertical" :model="formData" :rules="rules">
      <a-form-item :label="$t('Save.index.290643-2')" name="name">
        <a-input
          :placeholder="$t('Save.index.290643-3')"
          v-model:value="formData.name"
        />
      </a-form-item>
      <a-form-item
        v-if="props.provider === 'COLLECTOR_GATEWAY'"
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
        <RenderComponents v-if="jsonData" :value="jsonData" />
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
</template>

<script setup lang="ts">
import { PropType } from "vue";
import { save, update } from "@collector/api/data-collect/channel";
import { devGetProtocol } from "@collector/utils/utils";
import GateWayFormItem from "./GateWayFormItem.vue";
import RenderComponents from "@collector/components/RenderComponents";
import { cloneDeep, omit } from "lodash-es";
import { useI18n } from "vue-i18n";

const { t: $t } = useI18n();
const props = defineProps({
  provider: {
    type: String,
    default: "",
  },
  data: {
    type: Object as PropType<Record<string, any>>,
  },
  loading: {
    type: Boolean,
    default: false,
  },
});
const emits = defineEmits(["clear", 'update:loading', 'change']);

const formData = reactive({
  id: undefined,
  type: "device",
  name: undefined,
  description: undefined,
  configuration: {},
  circuitBreaker: {
    type: "Ignore",
  },
});

const rules = {
  name: [
    { required: true, message: $t("Channel.data.290641-1")},
    { max: 64, message: $t("Channel.data.290641-2") },
  ],
  description: [{ max: 200, message: $t('Channel.data.290641-14') }],
};

provide("plugin-form", formData);
const formRef = ref();
const jsonData = ref();
const handleClear = () => {
  emits("clear");
};

const onChange = async (val) => {
  if (val && val !== "COLLECTOR_GATEWAY") {
    jsonData.value = await devGetProtocol(val, "channel");
  }
};

const submit = async () => {
  await formRef.value?.validate().then(async () => {
    emits('update:loading', true)
    const submitData =
      formData.type === "device"
        ? omit({...formData, provider: props.provider}, ["type"])
        : {
            name: formData.name,
            description: formData.description,
            provider: props.provider,
          };

    const response = !props.data?.id
      ? await save(submitData).finally(() => {
        emits('update:loading', false) 
      })
      : await update(props.data?.id, { ...props.data, ...submitData }).finally(() => {
        emits('update:loading', false) 
      });
      emits('change', response.result)
  });
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
  { immediate: true, deep: true }
);

watch(
  () => props.provider,
  (value) => {
    if (value) {
      jsonData.value = undefined;
      onChange(value);
    }
  },
  { immediate: true }
);

defineExpose({
  submit: () => submit(),
  reset: () => {
    formRef.value?.resetFields();
  },
})
</script>

<style lang="less" scoped>
.channel-form-header {
  border-bottom: 1px solid #f0f0f0;
  padding-bottom: 10px;
  margin-bottom: 10px;
}
</style>
