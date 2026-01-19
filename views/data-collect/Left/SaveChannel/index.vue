<template>
  <a-drawer
    visible
    :title="data.id ? $t('DataCollect.index.400150-26') : $t('DataCollect.index.400150-27')"
    :maskClosable="false"
    width="40%"
    @close="emits('close')"
  >
    <Provider v-if="step === 0" :options="options" v-model:value="provider" v-model:name="providerName" @change="step = 1"/>
    <ChannelForm
      v-show="step === 1"
      ref="channelForm"
      v-model:loading="loading"
      :provider="provider"
      :name="providerName"
      :data="data"
      @clear="step = 0"
      @change="saveChange"
    />
    <template #footer>
      <a-space v-if="provider && step === 1">
        <j-permission-button :loading="loading" type="primary" @click="handleOk">
          {{ $t('DataCollect.index.400150-20') }}
        </j-permission-button>
        <a-button @click="emits('close')">{{ $t('DataCollect.index.400150-19') }}</a-button>
      </a-space>
    </template>
  </a-drawer>
</template>

<script setup lang="ts">
import { PropType } from "vue";
import Provider from "./Provider.vue";
import ChannelForm from "./ChannelForm.vue";
import { getProviders } from "@data-collector-ui/api/data-collect/channel";
import { useProvider } from "../../hook/useProvider";
import { onlyMessage } from '@jetlinks-web/utils'
import { useI18n } from 'vue-i18n';

const {t: $t} = useI18n();
const props = defineProps({
  data: {
    type: Object as PropType<Record<string, any>>,
    default: () => {},
  },
});
const emits = defineEmits(['close', 'saveSuccess']);

const { data: options } = useProvider();
const step = ref(0);
const provider = ref("");
const providerName = ref("");
const channelForm = ref();
const loading = ref(false);

const handleOk = () => {
  channelForm.value?.submit();
}

//保存成功
const saveChange = (val: boolean | Record<string, any>) => {
  if(val) {
    onlyMessage($t('DataCollect.index.400150-28'));
    emits('saveSuccess', val);
  }
};
watch(
  () => props.data,
  (val) => {
    if (val?.provider) {
      provider.value = val?.provider;
      step.value = 1;
    }
  },
  { immediate: true }
);

watch(
  () => provider.value,
  () => {
    channelForm.value?.reset();
  }
)
</script>

<style lang="less" scoped>
.provider-item {
  border: 1px solid #e8e8e8;
  padding: 10px;
  border-radius: 5px;
  width: 100%;
  margin-top: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
  &.active {
  }
  img {
    width: 80px;
    height: 80px;
  }
  .no-image {
    width: 80px;
    height: 80px;
    background: #e8e8e8;
  }
}
</style>
