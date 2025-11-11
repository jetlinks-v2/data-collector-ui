<template>
  <div class="editor-box">
    <div class="left">
      <span
        v-for="item in symbolList.filter((t, i) => i <= 3)"
        :key="item.key"
        @click="addOperatorValue(item.value)"
      >
        {{ item.value }}
      </span>
      <span>
        <a-dropdown>
          <AIcon type="MoreOutlined" />
          <template #overlay>
            <a-menu>
              <a-menu-item
                v-for="item in symbolList.filter((t, i) => i > 6)"
                :key="item.key"
                @click="addOperatorValue(item.value)"
              >
                {{ item.value }}
              </a-menu-item>
            </a-menu>
          </template>
        </a-dropdown>
      </span>
      <a-button
        type="text"
        v-for="i in buttonOptions"
        :key="i.key"
        @click="i.click"
      >
        {{ i.name }}
      </a-button>
    </div>
    <div style="width: 100%; height: 20rem">
      <MonacoEditor
        ref="editor"
        theme="vs"
        language="javascript"
        v-model:modelValue="code"
        @change="changeCode"
        :init="editorInit"
      />
    </div>
    <div class="actions-window">
      <span>按</span>
      <a-radio-group v-model:value="winActions.radioType">
        <a-space>
          <a-radio-button
            value="time"
            @click.native.prevent="onRadioChange('time')"
            >时间窗口</a-radio-button
          >
          <a-radio-button
            value="num"
            @click.native.prevent="onRadioChange('num')"
            >次数窗口</a-radio-button
          >
        </a-space>
      </a-radio-group>
      <span>每</span>
      <a-input-number
        id="inputNumber"
        v-model:value="winActions.interval"
        :min="1"
        style="width: auto !important"
      />
      <span v-if="winActions.radioType === 'num'">次，使用</span>
      <span v-else>秒，使用</span>
      <a-select
        placeholder="请选择函数"
        v-model:value="winActions.fun"
        style="width: 120px"
      >
        <a-select-option :value="item.value" v-for="item of functionList"
          >{{ item.value }}({{ item.text }})</a-select-option
        >
      </a-select>
      <span>计算一次</span>
    </div>
    <div>
      <a-row>
        <a-col :span="12">
          <div class="point-assignment">
            <div class="point-header">
              <span>点位赋值</span>
              <span class="result-text">对上方规则使用的点位进行赋值</span>
              <div>
                <span v-if="winActions.radioType !== '' && !showRun">
                  <a-button type="primary" ghost @click="beginRun('again')"
                    >发送数据</a-button
                  >
                </span>
              </div>
            </div>
            <div class="point-content">
              <div v-for="(item, index) of pointModal.list" class="card">
                <div class="card-name">
                  {{ item.name }}
                </div>
                <div class="card-content" @click="choosePoint(item)">
                  <span v-if="item.current === '' && item.last === ''"
                    >点击赋值</span
                  >
                  <span v-else>
                    <a-space>
                      <span>{{ item.current }}(当前值)</span>
                      <span>{{ item.last }}(上一值)</span>
                    </a-space>
                  </span>
                </div>
                <div class="pointDelete">
                  <a-button
                    type="text"
                    danger
                    @click="() => deletePoint(index)"
                  >
                    <template #icon>
                      <AIcon type="DeleteOutlined" />
                    </template>
                  </a-button>
                </div>
              </div>
              <a-button
                type="dashed"
                style="width: 100%"
                shape="round"
                @click="choosePoint('add')"
                >新增</a-button
              >
            </div>
          </div>
        </a-col>
        <a-col :span="12">
          <div class="running-result">
            <div class="run-header">
              <span>调试结果</span>
              <a-space>
                <a-button
                  type="primary"
                  ghost
                  @click="beginRun('begin')"
                  v-if="showRun"
                  >开始调试</a-button
                >
                <a-button type="primary" ghost @click="stopRun" v-else
                  >停止调试</a-button
                >
                <a-button type="primary" ghost @click="clear">清空</a-button>
              </a-space>
            </div>
            <div class="run-body">
              <p v-for="item of runDate.payload">
                {{ dayjs(item.time).format("HH:mm:ss") }} {{ item.content }}
              </p>
            </div>
          </div>
        </a-col>
      </a-row>
    </div>
    <Actions
      v-if="modal.visible"
      :title="modal.title"
      :list="modal.options"
      :type="modal.type"
      :name="modal.name"
      @updateCode="updateCode"
      @close="modal.visible = false"
    />
    <CheckPoint
      v-if="visibleCheckPoint"
      @choosePoint="addPoint"
      @close="visibleCheckPoint = false"
    />
    <PointAssign
      v-if="pointModal.visible"
      :options="pointModal.options"
      :type="pointAssignType"
      :data="assignPointData"
      @close="pointModal.visible = false"
      @submit="assign"
    />
  </div>
</template>

<script setup>
import { symbolList } from "../data";
import { getFunction, getOperator } from "@data-collector-ui/api/data-collect/collector";
import Actions from "./Actions.vue";
import { cloneDeep } from "lodash-es";
import CheckPoint from "./CheckPoint.vue";
import PointAssign from "./PointAssign.vue";
import dayjs from "dayjs";
import { onlyMessage } from "@jetlinks-web/utils";
import { wsClient } from '@jetlinks-web/core';
import { omit } from "lodash-es";

const props = defineProps({
  codeValue: {
    type: String,
    default: "",
  },
  keyPoint: {
    type: Array,
    default: [],
  },
  data: {
    type: Object,
    default: () => {},
  },
});
const emits = defineEmits(["codePoint", "update:codeValue"]);
const editor = ref();
const showRun = ref(true);
const pointAssignType = ref("add");
const visibleCheckPoint = ref(false);
const currentPoint = ref();
const assignPointData = ref();
const virtualId = new Date().getTime();

const runDate = reactive({
  payload: [],
  requestId: "",
});

const modal = reactive({
  title: "",
  options: [],
  visible: false,
  type: "",
  name: "",
});

const winActions = reactive({
  radioType: "",
  interval: "",
  fun: "",
});

const pointModal = reactive({
  type: "edit",
  list: [],
  visible: false,
  options: [],
});

const subRef = ref();

const functionList = ref([]);

const code = ref();
const propertyCalculateRule = ref([]);

//编辑器初始化
const editorInit = (editor, monaco) => {
  monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: true,
    noSyntaxValidation: false,
  });

  // compiler options
  monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
    allowJs: true,
    checkJs: true,
    allowNonTsExtensions: true,
    target: monaco.languages.typescript.ScriptTarget.ESNext,
    strictNullChecks: false,
    strictPropertyInitialization: true,
    strictFunctionTypes: true,
    strictBindCallApply: true,
    useDefineForClassFields: true, //permit class static fields with private name to have initializer
    moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
    module: monaco.languages.typescript.ModuleKind.CommonJS,
    typeRoots: ["types"],
    lib: ["esnext"],
  });
};

const buttonOptions = [
  {
    key: "point",
    name: "点位",
    click: () => {
      emits("codePoint");
    },
  },
  //   {
  //     key: "operator",
  //     name: "操作符",
  //     click: () => {
  //       modal.title = "选择操作符";
  //       modal.options = propertyCalculateRule.value.filter(
  //         (i) => i.id === "operator"
  //       )[0].children;
  //       modal.visible = true;
  //     },
  //   },
  {
    key: "control",
    name: "控制语句",
    click: () => {
      modal.title = "选择控制语句";
      modal.options = propertyCalculateRule.value.filter(
        (i) => i.id === "control"
      )[0].children;
      modal.visible = true;
      modal.type = "control";
      modal.name = "控制语句";
    },
  },
  {
    key: "function",
    name: "函数",
    click: () => {
      modal.title = "选择函数";
      modal.options = propertyCalculateRule.value.filter(
        (i) => i.id === "function"
      )[0].children;
      modal.visible = true;
      modal.type = "function";
      modal.name = "函数";
    },
  },
];

const updateCode = (data) => {
  code.value += data;
  modal.visible = false;
};

const queryOperator = async () => {
  const res = await getOperator();
  if (res.success) {
    propertyCalculateRule.value = res.result;
  }
};

const onRadioChange = (e) => {
  if (e === winActions.radioType) {
    winActions.radioType = "";
    return;
  }
  winActions.radioType = e;
};

const addOperatorValue = (val) => {
  editor.value?.insert(val);
};

const getFunList = () => {
  getFunction().then((res) => {
    if (res.success) {
      functionList.value = res.result;
    }
  });
};

const choosePoint = (i) => {
  if (i !== "add") {
    pointModal.visible = true;
    pointAssignType.value = "edit";
    assignPointData.value = i;
  } else {
    visibleCheckPoint.value = true;
    pointAssignType.value = "add";
  }
};

const addPoint = (val) => {
  const list = pointModal.options.map((item) => item.value.split(",")[0]);
  const msg = val[2];
  if (!list.includes(msg.id)) {
    const type = getValueType(msg.provider, msg.configuration);
    pointModal.list.push({
      value: `${msg.id},${type},${msg.name}`,
      name: msg.name,
      current: "",
      last: "",
      id: msg.id,
      type: type,
    });
    pointModal.options.push({
      label: msg.name,
      value: `${msg.id},${type},${msg.name}`,
    });
  }
  visibleCheckPoint.value = false;
  pointModal.visible = true;
};

const getValueType = (provider, configuration) => {
  let type = "undefined";
  if (provider === "MODBUS_TCP" || provider === "MODBUS_RTU") {
    type = configuration.codec.provider;
  } else if (provider === "OPC_UA") {
    type = configuration.type;
  } else if (provider === "snap7") {
    type = configuration.type;
  } else if (provider === "BACNetIp") {
    type = configuration.valueType;
  }
  return type;
};

const assign = (data) => {
  pointModal.list.map((i) => {
    if (i.id === data.pointID.split(",")[0]) {
      i.current = data.current;
      i.last = data.last;
      i.type =
        data.pointID.split(",")[1] === "undefined"
          ? data.dataType
          : data.pointID.split(",")[1];
    }
    return i;
  });
  pointModal.visible = false;
};

// 开始运行
const beginRun = (str) => {
  let sub
  try {
    if (code.value === "") {
      onlyMessage("请编辑规则", "error");
      return;
    }
    // 参数
    const id = currentPoint.value?.id
      ? `virtual-property-debug-${
          currentPoint.value.configuration.triggerPoints[0]?.pointId
        }-${new Date().getTime()}`
      : `virtual-property-debug-${
          props.keyPoint[2]?.id
        }-${new Date().getTime()}`;
    const topic = "/virtual-property-debug";
    const parameter = {
      virtualId: `${virtualId}-virtual-id`, // 窗口调试多次订阅
      property: "/virtual-property-debug",
      virtualRule: {},
      properties: [],
    };

    if (!winActions.radioType) {
      parameter.virtualRule = {
        type: "script",
        script: code.value,
      };
    } else {
      parameter.virtualRule = {
        type: "window",
        script: code.value,
        aggType: winActions.fun,
        windowType: winActions.radioType,
        window: {
          span: winActions.interval,
          every: winActions.interval,
        },
      };
    }
    if (pointModal.list.length > 0) {
      pointModal.list.forEach((i) => {
        parameter.properties.push({
          id: i.id, //点位ID
          current:
            i.type === "DateTime" ? new Date(i.current).getTime() : i.current, //当前值
          last:
            i.type === "DateTime"
              ? (i.last = new Date(i.last).getTime())
              : i.last, // 上一值
          type: i.type, // 数据类型
        });
      });
    }

    showRun.value = false;
    sub = wsClient.getWebSocket(id, topic, parameter)
      // ?.pipe(map((res) => res.payload))
      .subscribe({
        next: (_data) => {
          runDate.payload.push({
            time: new Date().getTime(),
            content: JSON.stringify(omit(_data.payload, ["timestamp"])),
          });
          runDate.requestId = _data.requestId;
        },
        complete: () => {
          if (!winActions.radioType) {
            showRun.value = true;
          }
          sub?.unsubscribe();
        },
      });
  } catch (error) {
    onlyMessage("请选择关键点位", "error");
  }
  if (str === "begin") {
    subRef.value = sub;
  }
};

// 停止运行
const stopRun = () => {
  showRun.value = true;
  subRef.value?.unsubscribe();
};

// 清空运行结果
const clear = () => {
  runDate.payload = [];
};

const getDetail = () => {
  const { configuration } = props.data;
  winActions.radioType = configuration?.subscribeRule.window?.type;
  winActions.fun = configuration?.subscribeRule.window?.aggregation;
  winActions.interval = configuration?.subscribeRule.window?.span;
};

const changeCode = (code) => {
  emits("update:codeValue", code);
};

const deletePoint = (index) => {
  pointModal.list.splice(index, 1);
};

defineExpose({ winActions, code });

watch(
  () => props.codeValue,
  (val) => {
    code.value = cloneDeep(val);
  },
  {
    immediate: true,
  }
);

watch(
  () => winActions,
  (val) => {
    if (!showRun.value) {
      stopRun();
    }
  },
  { deep: true }
);

onMounted(() => {
  queryOperator();
  getFunList();
  if (JSON.stringify(props.data) !== "{}") {
    getDetail();
  }
});
</script>
<style lang="less" scoped>
.editor-box {
  border: 0.0625rem solid lightgray;
  .left {
    display: flex;
    align-items: center;
    width: 60%;
    margin: 0 0.5rem;

    span {
      display: inline-block;
      height: 2.5rem;
      margin: 0 0.625rem;
      line-height: 2.5rem;
      cursor: pointer;
    }
  }
}
.point-assignment {
  .point-header {
    display: flex;
    justify-content: space-between;
    padding: 0.5rem 1rem;
    .result-text {
      font-size: 0.75rem;
      color: #828282;
    }
  }
  .point-content {
    padding: 1rem;
    border-top: 0.0625rem solid #edf0f2;
    .card {
      overflow-y: auto;
      background-color: #ffffff;
      padding: 0.25rem 2rem;
      display: flex;
      justify-content: space-between;
      border: 0.0625rem solid #edf0f2;
      margin-bottom: 0.25rem;
      position: relative;
      .card-content {
        margin-left: 0.625rem;
        text-align: center;
        cursor: pointer;
      }
      .pointDelete {
        position: absolute;
        right: 0;
        top: 0;
      }
    }
  }
}
.actions-window {
  // width: 100%;
  width: calc(100vw - 18.75rem);
  height: 3.75rem;
  line-height: 3.75rem;
  box-sizing: border-box;
  border: 0.0625rem #edf0f2 solid;
  background-color: #ffffff;

  span {
    margin: 0 0.625rem;
  }
}
.running-result {
  border-left: 0.0625rem solid #edf0f2;
  box-sizing: border-box;
  .run-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 1rem;
  }

  .run-body {
    padding: 1rem;
    border-top: 0.0625rem solid #edf0f2;
    height: 6.875rem;
    overflow-y: auto;
    background-color: #ffffff;
  }
}
</style>
