<template>
  <div class="header-cell-title">
    <div class="value">
      <j-ellipsis v-if="value?.dataType">{{ getParseData() }}</j-ellipsis>
      <j-ellipsis v-else>{{ getReadParseData() }}</j-ellipsis>
      <j-ellipsis v-if="type !== 'detail'">
        {{
          value?.timestamp ? dayjs(value.timestamp).format('YYYY-MM-DD HH:mm:ss') : '--'
        }}
      </j-ellipsis>
    </div>
    <div :class="{'actions': type !== 'detail'}">
      <a-space>
        <a
            v-if="getAccessModes(data).includes('write')"
            @click.stop="clickEdit"
        >
          <AIcon type="EditOutlined"/>
        </a>
        <a
            v-if="getAccessModes(data).includes('read')"
            @click.stop="clickRead"
        >
          <AIcon type="RedoOutlined"/>
        </a>
      </a-space>
    </div>
  </div>
  <WritePoint v-if="visible" :data="data" @close="visible = false" @save="onSave"/>
</template>

<script setup>
import {getAccessModes} from "@data-collector-ui/views/data-collect/components/Point/data";
import {readPoint} from "@data-collector-ui/api/data-collect/collector";
import {onlyMessage} from "@jetlinks-web/utils";
import {isBoolean, isNumber} from "lodash-es";
import dayjs from "dayjs";
import WritePoint from './WritePoint.vue'

const props = defineProps({
  value: {
    type: Object,
  },
  data: {
    type: Object,
    default: () => ({})
  },
  type: {
    type: String,
  }
})

const emits = defineEmits(['refresh'])

const visible = ref(false)
const historyData = ref({})

const getParseData = () => {
  const {parseData, dataType} = props.value;
  const data = isNumber(parseData) ? parseData || 0 : parseData;
  return `${data}(${dataType}) `;
};

const getReadParseData = () => {
  let _data = '--';
  if (!!historyData.value.dataType) {
    const {parseData, dataType} = historyData.value;
    if (isBoolean(parseData)) {
      _data = `${parseData}(${dataType || '-'}) `;
    } else {
      _data = !!parseData ? `${parseData}(${dataType || '-'}) ` : '--';
    }
  }
  return _data;
};
const clickEdit = async () => {
  visible.value = true;
};

// ReadIdMap
const clickRead = async () => {
  const res = await readPoint(props.data?.collectorId, [props.data?.id]);
  if (res.success) {
    historyData.value = res.result?.[0] || {};
    emits('refresh')
    onlyMessage('操作成功!');
  }
};

const onSave = () => {
  visible.value = false;
  emits('refresh')
}
</script>

<style lang="less" scoped>
.header-cell-title {
  display: flex;
  align-items: center;
  white-space: normal;
  gap: 12px;

  .actions {
    display: none;
  }

  &:hover {
    .actions {
      display: flex;
      cursor: pointer;
      gap: 8px;
      width: 40px;
    }
  }
}
</style>
