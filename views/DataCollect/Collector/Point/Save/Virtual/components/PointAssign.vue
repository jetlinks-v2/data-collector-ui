<template>
  <a-modal
    open
    :title="$t('Virtual.PointAssign.400159-0')"
    centered
    :maskClosable="false"
    @cancel="emits('close')"
    @ok="submitData"
  >
    <div class="body_height_60">
      <a-form ref="formRef" layout="vertical" :model="formState">
        <a-form-item
          :label="$t('Save.SaveBACNet.4001416-2')"
          name="pointID"
          :rules="[{ required: true, message: $t('Virtual.PointAssign.400159-2'), trigger: 'blur' }]"
        >
          <a-select
            :placeholder="$t('DataCollect.index.400156-20')"
            v-model:value="formState.pointID"
            :options="options"
            :disabled="!!formState.pointID && type !== 'add'"
          >
          </a-select>
        </a-form-item>
        <a-form-item
          v-if="!formState.type"
          :label="$t('Save.SaveBACNet.4001416-8')"
          name="type"
          :rules="[{ required: true, message: $t('Collector.data.400141-8') }]"
        >
          <a-radio-group
            v-model:value="formState.type"
            style="margin-bottom: 10px"
          >
            <a-radio-button value="Number">{{ $t('Virtual.data.400159-0') }}</a-radio-button>
            <a-radio-button value="Boolean">{{ $t('Virtual.data.400159-37') }}</a-radio-button>
            <a-radio-button value="DateTime">{{ $t('Virtual.data.400159-29') }}</a-radio-button>
            <a-radio-button value="String">{{ $t('Virtual.data.400159-38') }}</a-radio-button>
          </a-radio-group>
        </a-form-item>
        <a-form-item
          v-if="formState.type"
          :label="$t('Virtual.PointAssign.400159-4')"
          name="current"
          :rules="[{ required: true, message: $t('Virtual.TypeForm.400159-0'), trigger: 'blur' }]"
        >
          <TypeForm
            v-model:value="formState.current"
            :inputType="formState.type"
          />
        </a-form-item>
        <a-form-item
          v-if="formState.type"
          :label="$t('Virtual.PointAssign.400159-5')"
          name="last"
          :rules="[{ required: true, message: $t('Virtual.TypeForm.400159-0'), trigger: 'blur' }]"
        >
          <TypeForm
            v-model:value="formState.last"
            :inputType="formState.type"
          />
        </a-form-item>
      </a-form>
    </div>
  </a-modal>
</template>
<script setup>
import { dataType } from "../data";
import {useI18n} from 'vue-i18n';
import TypeForm from "./TypeForm.vue";

const {t: $t} = useI18n();
const props = defineProps({
  options: {
    type: Array,
    default: [],
  },
  type: {
    type: String,
    default: "",
  },
  data: {
    type: Object,
    default: () => {},
  },
});
const emits = defineEmits("close", "submit");
const formState = reactive({
  pointID: "",
  current: undefined,
  last: undefined,
  type: "",
});
const formRef = ref();

const getType = (type) => {
  let typeStr = "";
  dataType.forEach((i) => {
    if (
      i.children
        .map((j) => j.id.toLocaleUpperCase())
        .includes(type.toLocaleUpperCase())
    ) {
      typeStr = i.id;
    }
  });
  return typeStr;
};

const submitData = () => {
  formRef?.value.validate().then(() => {
    emits("submit", formState);
  });
};

watch(
  () => formState.pointID,
  (val) => {
    if (!val) {
      return;
    } else {
      formState.type = getType(val.split(",")[1]);
    }
  }
);

onMounted(() => {
  if (props.type === "edit") {
    formState.pointID = props.data?.value;
  }
});
</script>
<style lang="less" scoped></style>
