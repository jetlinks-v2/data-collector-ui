<template>
  <a-modal
    open
    title="点位赋值"
    centered
    :maskClosable="false"
    @cancel="emits('close')"
    @ok="submitData"
  >
    <div class="body_height_60">
      <a-form ref="formRef" layout="vertical" :model="formState">
        <a-form-item
          label="点位名称"
          name="pointID"
          :rules="[{ required: true, message: '请选择点位', trigger: 'blur' }]"
        >
          <a-select
            placeholder="请选择"
            v-model:value="formState.pointID"
            :options="options"
            :disabled="!!formState.pointID && type !== 'add'"
          >
          </a-select>
        </a-form-item>
        <a-form-item
          v-if="!formState.type"
          label="数据类型"
          name="type"
          :rules="[{ required: true, message: '请选择数据类型' }]"
        >
          <a-radio-group
            v-model:value="formState.type"
            style="margin-bottom: 10px"
          >
            <a-radio-button value="Number">数值类型</a-radio-button>
            <a-radio-button value="Boolean">布尔类型</a-radio-button>
            <a-radio-button value="DateTime">时间类型</a-radio-button>
            <a-radio-button value="String">字符类型</a-radio-button>
          </a-radio-group>
        </a-form-item>
        <a-form-item
          v-if="formState.type"
          label="实时值"
          name="current"
          :rules="[{ required: true, message: '请输入值', trigger: 'blur' }]"
        >
          <TypeForm
            v-model:value="formState.current"
            :inputType="formState.type"
          />
        </a-form-item>
        <a-form-item
          v-if="formState.type"
          label="上一值"
          name="last"
          :rules="[{ required: true, message: '请输入值', trigger: 'blur' }]"
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
import TypeForm from "./TypeForm.vue";
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
