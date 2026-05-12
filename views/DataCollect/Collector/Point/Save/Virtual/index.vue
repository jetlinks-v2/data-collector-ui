<template>
  <a-modal
    :title="$t('Virtual.index.400159-0')"
    open
    centered
    :confirmLoading="loading"
    :maskClosable="false"
    @cancel="emits('close')"
    @ok="submit"
    :width="1200"
  >
    <div style="height: 500px; overflow-y: auto">
      <a-form
        ref="formRef"
        name="config-form"
        layout="vertical"
        :model="formData"
        :rules="rules"
      >
        <a-form-item :label="$t('Save.SaveBACNet.4001416-2')" name="name">
          <a-input
            v-model:value="formData.name"
            :maxlength="64"
            autocomplete="off"
            :placeholder="$t('Save.SaveBACNet.4001416-3')"
          />
        </a-form-item>
        <a-form-item name="virtualPoint">
          <template #label>
            <div class="label">
              {{ $t('Virtual.index.400159-1') }}
              <div class="label-content">
                <div class="label-btn" @click="choosePoint">
                  <div class="btn" v-for="i of checkPoint.keyPoint">
                    {{ i.name || "--" }}
                  </div>
                </div>
                {{ $t('Virtual.index.400159-2') }}
              </div>
            </div>
          </template>
        </a-form-item>
      </a-form>
      <Editor
        ref="editorRef"
        v-model:codeValue="codeValue"
        :data="data"
        :keyPoint="checkPoint.keyPoint"
        @codePoint="handlePoint"
      />
    </div>
    <CheckPoint
      v-if="checkPointVisible"
      :modalType="checkPoint.type"
      :data="checkPoint.keyPoint"
      @choosePoint="selectedPoint"
      @getCode="getCode"
      @close="checkPointVisible = false"
    />
  </a-modal>
</template>

<script setup>
import { onlyMessage } from "@jetlinks-web/utils";
import {useI18n} from 'vue-i18n';
import CheckPoint from "./components/CheckPoint.vue";
import Editor from "./components/Editor.vue";
import {
  savePoint,
  updatePoint,
} from '@data-collector-ui/api/data-collect/collector';

const {t: $t} = useI18n();

const props = defineProps({
  data: {
    type: Object,
    default: () => {},
  },
});

const emits = defineEmits(["close", "change"]);

const formRef = ref();
const editorRef = ref();
const loading = ref(false);

const formData = ref({
  name: "",
});
//编辑器代码
const codeValue = ref("return ");

const currentPoint = ref({});

const checkPointVisible = ref(false);

const checkPoint = reactive({
  type: "keyPoint", // keyPoint/commonPoint
  keyPoint: [],
});

//获取代码
const getCode = (e) => {
  codeValue.value += e;
  checkPointVisible.value = false;
};

const handlePoint = () => {
  checkPoint.type = "commonPoint";
  checkPointVisible.value = true;
};

const validator = (_rule, value) => {
  if (checkPoint.keyPoint.length < 3) {
    return Promise.reject($t('Virtual.index.400159-3'));
  } else {
    return Promise.resolve();
  }
};

const rules = {
  name: [{ required: true, message: $t('Virtual.index.400159-4'), trigger: "blur" }],
  virtualPoint: [{ required: true, validator: validator, trigger: "blur" }],
};

const choosePoint = () => {
  checkPoint.type = "keyPoint";
  checkPointVisible.value = true;
};

const selectedPoint = (data) => {
  checkPoint.keyPoint = data;
  checkPointVisible.value = false;
  console.log(checkPoint.keyPoint, "keyPoint");
};

const submit = async () => {
  // 提交点位
  // 获取子组件的值
  const valid = await formRef?.value.validate();
  // const list = editorRef.value.getStr(editorRef.value.data);
  let param = {
    name: formData.value.name,
    provider: "virtual",
    collectorId: props.data.collectorId,
    features: [],
    accessModes: ["subscribe"],
    inheritBreaker: false,
    pointKey: "",
    configuration: {
      name: checkPoint.keyPoint.map((i) => ({ name: i.name, id: i.id })),
      triggerPoints: [
        {
          collectorId: checkPoint.keyPoint[1].id, //关键点位设备id
          pointId: checkPoint.keyPoint[2].id, //关键点位id
        },
      ],
      subscribeRule: {
        // ...editorRef.value.subscribeRule
        lang: "js",
        script: editorRef.value.code,
        window: !!editorRef.value.winActions.radioType
          ? {
              // enabled: true,
              type: editorRef.value.winActions.radioType,
              span: editorRef.value.winActions.interval,
              every: editorRef.value.winActions.interval, //窗口滑动大小
              aggregation: editorRef.value.winActions.fun, //计算函数
            }
          : undefined,
      },
    },
  };

  loading.value = true;
  // 修改点位
  const id = !!currentPoint.value.id ? currentPoint.value.id : undefined;
  const res = id
    ? await updatePoint(id, param).finally(() => {
        loading.value = false;
      })
    : await savePoint(param).finally(() => {
        loading.value = false;
      });
  if (res.status === 200) {
    onlyMessage($t('DataCollect.index.400150-28'));
    emits("change", true);
  }
  loading.value = false;
};

onMounted(() => {
  if (props.data) {
    Object.assign(currentPoint.value, props.data);
    formData.value.name = currentPoint.value?.name;
    checkPoint.keyPoint = currentPoint.value?.configuration?.name || [];
    codeValue.value =
      currentPoint.value?.configuration?.subscribeRule?.script || "return ";
  }
});
</script>
<style lang="less" scoped>
.label {
  display: flex;
  .label-content {
    display: flex;
    .label-btn {
      max-width: 22.5rem;
      overflow: hidden;
      // overflow-x: auto;
      white-space: nowrap;
      text-overflow: ellipsis;
      margin: 0 0.25rem;
      display: inline-flex;

      padding: 0 0.5rem;
      min-width: 7.5rem;
      align-items: baseline;
      background-color: #f8f9fa;
      .btn {
        width: 8rem;
        overflow: hidden;
        text-overflow: ellipsis;
        margin: 0 0.25rem;
        padding: 0 0.125rem;
        text-align: center;
        background-color: #fafafa;
        border: #e0e0e0 0.0625rem solid;
        border-radius: 0.25rem;
        color: #00a4ff;
        max-width: 6.25rem;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        align-items: center;
        flex-wrap: nowrap;
      }
    }
  }
}
</style>
