<template>
  <div class="header-cell-title">
    <div class="value">
      <j-ellipsis>{{ formattedValue }}</j-ellipsis>
      <j-ellipsis v-if="type !== 'detail'">
        {{
          value?.timestamp != null ? dayjs(value.timestamp).format('YYYY-MM-DD HH:mm:ss') : $t('comm.table.empty-2')
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

<script setup lang="ts">
import { computed, ref } from 'vue';
import type { PropType } from 'vue';
import {getAccessModes} from "@data-collector-ui/views/data-collect/components/Point/data";
import {readPoint} from "@data-collector-ui/api/data-collect/collector";
import {onlyMessage} from "@jetlinks-web/utils";
import { formatPointData, type PointValueData } from '@data-collector-ui/utils/pointValue';
import dayjs from "dayjs";
import WritePoint from './WritePoint.vue'
import { useI18n } from "vue-i18n";

const { t: $t } = useI18n();

const props = defineProps({
  value: { type: Object as PropType<PointValueData> },
  data: {
    type: Object as PropType<Record<string, unknown> & { collectorId?: string; id?: string }>,
    default: () => ({}),
  },
  type: { type: String },
})

const emits = defineEmits(['refresh'])

const visible = ref(false)
const historyData = ref<PointValueData>()
const formattedValue = computed(() => formatPointData(
  props.value?.dataType ? props.value : historyData.value,
  $t('comm.table.empty-2'),
))
const clickEdit = async () => {
  visible.value = true;
};

// ReadIdMap
const clickRead = async () => {
  const { collectorId, id } = props.data;
  if (!collectorId || !id) return;
  const res = await readPoint(collectorId, [id]);
  if (res.success) {
    historyData.value = res.result?.[0] || {};
    emits('refresh')
    onlyMessage($t('DataCollect.index.400155-24'));
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
