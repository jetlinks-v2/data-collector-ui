<template>
  <a-modal
      :title="$t('BatchUpdate.index.4001419-0')"
      :open="true"
      width="700px"
      @cancel="handleCancel"
      :destroyOnClose="true"
      @close="emit('close')"
  >
    <div class="sizeText">
      <span v-if="isAllSelected">{{ $t('BatchUpdate.index.4001419-2', [labelName.join(',')]) }}</span>
      <span v-else>{{$t('BatchUpdate.index.4001419-1', [data.length, labelName.join(',')])}}</span>
      <small>{{ $t('collectorWorkspace.batchKeepUnchanged') }}</small>
    </div>
    <a-form
        class="form"
        layout="vertical"
        :model="formData"
        name="basic"
        autocomplete="off"
        ref="formRef"
    >
<!--      <a-form-item :label="$t('BatchUpdate.index.4001419-3')" v-if="provider === 'BACNetIp'">-->
<!--        <a-select-->
<!--            v-model:value="formData.valueType"-->
<!--            allowClear-->
<!--            :placeholder="$t('BatchUpdate.index.4001419-4')"-->
<!--        >-->
<!--          <a-select-option-->
<!--              v-for="item in bacnetValueType"-->
<!--              :key="item"-->
<!--              :value="item"-->
<!--          >{{ item }}-->
<!--          </a-select-option-->
<!--          >-->
<!--        </a-select>-->
<!--      </a-form-item>-->
      <a-form-item :label="$t('BatchUpdate.index.4001419-5')" name="accessModes">
        <j-card-select
            multiple
            :showImage="false"
            v-model:value="formData.accessModes"
            :options="options"
        />
      </a-form-item>
      <a-form-item
          :name="['interval']"
          :rules="[
                    {
                        pattern: regOnlyNumber,
                        message: $t('BatchUpdate.index.4001419-9'),
                    },
                ]"
      >
        <template #label>
                    <span>
                        {{ $t('BatchUpdate.index.4001419-10') }}
                        <a-tooltip :title="$t('BatchUpdate.index.4001419-11')">
                            <AIcon
                                type="QuestionCircleOutlined"
                                style="margin-left: 2px"
                            />
                        </a-tooltip>
                    </span>
        </template>
        <a-input-number
            style="width: 100%"
            :placeholder="$t('BatchUpdate.index.4001419-12')"
            :value="formData.interval"
            @change="changeInterval"
            addon-after="ms"
            :max="2147483648"
            :min="0"
            :precision="0"
        />
      </a-form-item>
      <!--      <a-form-item :label="$t('BatchUpdate.index.4001419-13')">-->
      <!--        <a-switch v-model:checked="formData.pushControl"></a-switch>-->
      <!--      </a-form-item>-->
      <!--      <a-form-item :name="['features']" v-if="formData.pushControl">-->
      <!--        <a-checkbox-group v-model:value="formData.features">-->
      <!--          <a-checkbox value="changedOnly" name="type"-->
      <!--          >{{ $t('BatchUpdate.index.4001419-14') }}-->
      <!--          </a-checkbox-->
      <!--          >-->
      <!--        </a-checkbox-group>-->
      <!--      </a-form-item>-->
    </a-form>
    <template #footer>
      <a-button key="back" @click="handleCancel">{{ $t('BatchUpdate.index.4001419-15') }}</a-button>
      <j-permission-button
          key="submit"
          type="primary"
          :loading="loading"
          @click="handleOk"
          style="margin-left: 8px"
      >
        {{ $t('BatchUpdate.index.4001419-16') }}
      </j-permission-button>
    </template>
  </a-modal>
</template>
<script lang="ts" setup>
import {
  savePointBatch,
  updatePoints
} from '@data-collector-ui/api/data-collect/collector';
import {map} from 'lodash-es';
import {applyBatchPointPatch, buildBatchPointPatch} from '@data-collector-ui/utils/batchPointPatch';
import {useI18n} from 'vue-i18n';
import {regOnlyNumber} from "@data-collector-ui/views/DataCollect/Channel/data";
import {getPointMetadata} from "@data-collector-ui/views/data-collect/utils";
import { onlyMessage } from '@jetlinks-web/utils';

const {t: $t} = useI18n();

const props = defineProps({
  data: {
    type: Array,
    default: () => [],
  },
  provider: {
    type: String,
    default: '',
  },
  isAllSelected: {
    type: Boolean,
    default: false,
  },
  getBatchParams: {
    type: Function,
    default: () => {
    },
  }
});

const emit = defineEmits(['save', 'close']);
const loading = ref(false);
const formRef = ref();

const formData = ref({
  accessModes: [] as string[],
  interval: undefined as number | undefined,
});
// InputNumber emits null when cleared; an empty batch field means unchanged, never zero.
const changeInterval = (value: number | string | null | undefined) => {
  formData.value.interval = value == null || value === '' ? undefined : Number(value);
};
const configuration = ref({})

// const bacnetValueType = ref<string[]>([]);

// const getIdAndType = async () => {
//   const resp: any = await getBacnetValueType();
//   if (resp.success) {
//     bacnetValueType.value = resp.result;
//   }
// };

const options = computed(() => {
  const arr = map((configuration.value?.accessModes || []), 'value')
  return [
    { label: $t('BatchUpdate.index.4001419-6'), value: 'read' },
    { label: $t('BatchUpdate.index.4001419-7'), value: 'write' },
    { label: $t('BatchUpdate.index.4001419-8'), value: 'subscribe' },
  ].map(i => {
    return {
      ...i,
      disabled: !arr.includes(i.value)
    }
  })
})

const handleOk = async () => {
  if (loading.value) return;
  await formRef.value?.validate();
  const patch = buildBatchPointPatch(formData.value);
  if (Object.keys(patch).length) {
    const params = props.data.map((point: any) => applyBatchPointPatch(point, patch));
    loading.value = true;
    const response = props.isAllSelected 
    ? await updatePoints({query: props.getBatchParams(), point: patch}).finally(() => {
      loading.value = false;
    })
    : await savePointBatch(params).finally(() => {
      loading.value = false;
    });
    if (response.success) {
      onlyMessage($t('Point.index.400149-14'));
      emit('save');
    }
  } else {
    emit('close');
  }
};

const handleCancel = () => {
  emit('close');
};

watch(
    () => props.provider,
    () => {
      // if (props.provider === 'BACNetIp') {
      //   getIdAndType();
      // }
      getPointMetadata(props.provider, {}).then((res) => {
        configuration.value = res
      })
    },
    {immediate: true},
);

const labelName = computed(() => {
  const arr = [];
  if (formData.value.accessModes.length) {
    arr.push($t('BatchUpdate.index.4001419-5'));
  }
  if (formData.value.interval != null) {
    arr.push($t('BatchUpdate.index.4001419-10'));
  }
  return arr;
});
</script>

<style lang="less" scoped>
.sizeText {
  margin-bottom: 20px;
}
.sizeText small { display:block; margin-top:4px; color:var(--ant-color-text-tertiary,#8c8c8c); }
</style>
