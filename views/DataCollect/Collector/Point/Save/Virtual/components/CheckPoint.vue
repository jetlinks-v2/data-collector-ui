<template>
  <a-modal
      open
      title="点位选择"
      centered
      :width="1200"
      :maskClosable="false"
      @cancel="emits('close')"
  >
    <template #footer>
      <div class="footerContainer">
        <div>
          <a-button v-if="current !== 0" @click="lastStep">上一步</a-button>
        </div>
        <div>
          <a-button @click="emits('close')">取消</a-button>
          <a-button @click="nextStep" type="primary">{{
              current !== 2 ? "下一步" : "确认"
            }}
          </a-button>
        </div>
      </div>
    </template>
    <div class="body_height_60">
      <a-steps v-model:current="current">
        <a-step title="选择通道" disabled></a-step>
        <a-step title="选择设备" disabled></a-step>
        <a-step title="选择点位" disabled></a-step>
      </a-steps>
      <div class="content">
        <div v-if="current === 0">
          <Channel @change="selectChannel" :rowKey="selectedChannel?.id"/>
        </div>
        <div v-else-if="current === 1">
          <Device @change="selectDevice" :rowKey="selectedDevice?.id" :channelId="selectedChannel?.id"/>
        </div>
        <div v-else-if="current === 2">
          <Point @change="selectPoint" :modalType="modalType" :rowKey="selectedPoint?.id" :deviceId="selectedDevice?.id">
            <template #item="item">
              <a-radio-group v-model:value="recent">
                <a-space>
                  <a-radio-button :value="`$recent(&quot;${item?.id}&quot;)`"
                  >实时值
                  </a-radio-button
                  >
                  <a-radio-button
                      :value="`$lastState(&quot;${item?.id}&quot;)`"
                  >上一值
                  </a-radio-button
                  >
                </a-space>
              </a-radio-group>
            </template>
          </Point>
        </div>
      </div>
    </div>
  </a-modal>
</template>

<script setup>
import {onlyMessage} from "@jetlinks-web/utils";
import Channel from "./Channel.vue";
import Device from "./Device.vue";
import Point from "./Point.vue";

const props = defineProps({
  modalType: {
    type: String,
    default: "keyPoint",
  },
  data: {
    type: Array,
    default: [],
  },
});
const emits = defineEmits("close", "choosePoint", "getCode");
const current = ref(0);
const selectedChannel = ref();
const selectedDevice = ref();
const selectedPoint = ref();
const recent = ref();

const selectChannel = (data) => {
  selectedChannel.value = data;
};

const selectDevice = (data) => {
  selectedDevice.value = data;
};

const selectPoint = (data) => {
  selectedPoint.value = data;
};

const lastStep = () => {
  if (current.value === 1) {
    selectedDevice.value = undefined;
  } else if (current.value === 2) {
    selectedPoint.value = undefined;
  } else {
    selectedPoint.value = undefined;
  }
  current.value--;
};

const nextStep = () => {
  if (current.value === 0 && !selectedChannel.value) {
    onlyMessage("请选择通道", 'error');
    return;
  } else if (current.value === 1 && !selectedDevice.value) {
    onlyMessage("请选择设备", 'error');
    return;
  } else if (current.value === 2) {
    if (props.modalType === "commonPoint") {
      emits("getCode", recent.value);
      return;
    }
    if (selectedPoint.value) {
      const points = [
        selectedChannel.value,
        selectedDevice.value,
        selectedPoint.value,
      ];
      emits("choosePoint", points);
    } else {
      onlyMessage("请选择点位");
    }
    return;
  }
  current.value++;
};

onMounted(() => {
  if (props.modalType === "keyPoint" && props.data?.length) {
    selectedChannel.value = props.data?.[0];
    selectedDevice.value = props.data?.[1];
    selectedPoint.value = props.data?.[2];
  }
});
</script>
<style lang="less" scoped>
.content {
  margin-top: 1.5rem;

  .card {
    display: flex;
    border: 0.0625rem solid rgb(146, 146, 146);
    padding: 0.5rem 2rem;
    border-radius: 2rem;

    img {
      width: 3rem;
    }

    .card_info {
      margin-left: 1rem;
    }
  }

  .selected {
    border-color: rgb(24, 20, 20);
  }
}

:deep(.ant-modal-footer) {
  text-align: unset;
}

.footerContainer {
  display: flex;
  justify-content: space-between;
}
</style>
