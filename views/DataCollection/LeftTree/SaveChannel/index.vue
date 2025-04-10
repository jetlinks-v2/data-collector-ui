<template>
  <a-drawer
    visible
    :title="data?.id ? '编辑' : '新增'"
    width="40%"
    @close="emits('close')"
  >
    <Provider v-if="!provider" :options="options" v-model:value="provider" />
    <ChannelForm
      v-else
      ref="channelForm"
      v-model:loading="loading"
      :provider="provider"
      :data="data"
      @clear="provider = ''"
      @change="saveChange"
    />
    <template #footer>
      <a-space v-if="provider">
        <j-permission-button :loading="loading" type="primary" @click="handleOk">
          确定
        </j-permission-button>
        <j-permission-button @click="emits('close')">取消</j-permission-button>
      </a-space>
    </template>
  </a-drawer>
</template>

<script setup lang="ts">
import { PropType } from "vue";
import Provider from "./Provider.vue";
import ChannelForm from "./ChannelForm.vue";
import { getProviders } from "@collector/api/data-collect/channel";
import { useRequest } from "@jetlinks-web/hooks";
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

const { data: options } = useRequest(getProviders);
const provider = ref("");
const channelForm = ref();
const loading = ref(false);

const handleOk = () => {
  channelForm.value?.submit();
}

//保存成功
const saveChange = (val: boolean | Record<string, any>) => {
  if(val) {
    onlyMessage($t('Channel.index.290640-15'));
    emits('saveSuccess', val);
  }
};
watch(
  () => props.data,
  (val) => {
    if (val?.provider) {
      provider.value = val?.provider;
    }
  },
  { immediate: true }
);
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
