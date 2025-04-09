<template >
  <a-drawer
      :title="data.id ? $t('Save.SaveModBus.4001413-0') : $t('Point.index.400149-0')"
      :visible="true"
      @cancel="handleCancel"
      width="500px"
  >
    <a-form
        class="form"
        layout="vertical"
        :model="formData"
        ref="formRef"
    >
      <a-form-item :label="$t('Save.SaveModBus.4001413-2')" name="name">
        <a-input
            :placeholder="$t('Save.SaveModBus.4001413-3')"
            v-model:value="formData.name"
        />
      </a-form-item>
      <a-divider />
      <RenderComponents v-if="jsonData" :value="jsonData" />

      <a-form-item
          :label="$t('Save.SaveModBus.4001413-30')"
          :name="['configuration', 'interval']"
      >
        <a-input-number
            style="width: 100%"
            :placeholder="$t('Save.SaveModBus.4001413-31')"
            v-model:value="formData.configuration.interval"
            addon-after="ms"
            :max="2147483648"
            :min="0"
        />
      </a-form-item>

      <a-form-item label="" :name="['features']">
        <a-checkbox-group v-model:value="formData.features">
          <a-checkbox value="changedOnly" name="type"
          >{{$t('Save.SaveModBus.4001413-32')}}</a-checkbox
          >
        </a-checkbox-group>
      </a-form-item>

      <a-divider />
      <j-title data="数据预处理" />
      <DeathArea v-model:value="formData.configuration.terms" />

      <a-divider />
      <a-form-item :label="$t('Save.SaveModBus.4001413-33')" :name="['description']">
        <a-textarea
            :placeholder="$t('Save.SaveModBus.4001413-34')"
            v-model:value="formData.description"
            :maxlength="200"
            :rows="3"
            showCount
        />
      </a-form-item>
    </a-form>
    <template #footer>
      <a-button key="back" @click="handleCancel">{{$t('Save.SaveModBus.4001413-35')}}</a-button>
      <j-permission-button
          key="submit"
          type="primary"
          :loading="loading"
          @click="handleOk"
          style="margin-left: 8px"
          :hasPermission="`DataCollect/Collector:${
                    id ? 'update' : 'add'
                }`"
      >
        {{$t('Save.SaveModBus.4001413-36')}}
      </j-permission-button>
    </template>
  </a-drawer>
</template>
<script setup>
import {
  savePointBatch,
  updatePoint,
} from '@collector/api/data-collect/collector';
import { cloneDeep } from 'lodash-es';
import { useI18n } from 'vue-i18n';
import {devGetProtocol} from "@collector/utils/utils";
import RenderComponents from "@collector/components/RenderComponents";
import DeathArea from "./DeathArea.vue";

const { t: $t } = useI18n();

const props = defineProps({
  data: {
    type: Object,
    default: () => {},
  },
  collector: {
    type: Object,
    default: () => {},
  },
});

const emit = defineEmits(['save', 'close']);
const loading = ref(false);
const formRef = ref();
const jsonData = ref();
const id = props.data.id;

const formData = reactive({
  name: '',
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

provide("plugin-form-collector", props.collector);

const handleOk = async () => {
  await formRef.value?.validate();
  loading.value = true;
  const response = !id
      ? await savePointBatch(formData).catch(() => {})
      : await updatePoint(id, { ...props.data, ...formData }).catch(() => {});
  emit('change', response?.status === 200);
  loading.value = false;
};

const handleCancel = () => {
  emit('close');
};
watch(
    () => props.data,
    () => {
      Object.assign(formData, cloneDeep(props.data));
      formData.features = props.data.features?.[0]?.value;
      if (props.data.accessModes?.length !== 0) {
        formData.accessModes =
            props.data.accessModes?.map((item) => item.value) || [];
      }
    },
    { immediate: true, deep: true },
);

const getProtocol = async () => {
  jsonData.value = await devGetProtocol(props.collector.provider, "point");
};
getProtocol();

provide("plugin-form", formData);
</script>

<style lang="less" scoped></style>
