<template>
  <div class="header-cell-title">
    <div class="value">
      <j-ellipsis>{{ formattedValue }}</j-ellipsis>
      <j-ellipsis v-if="type !== 'detail'">
        {{
          liveValue?.timestamp != null ? dayjs(liveValue.timestamp).format('YYYY-MM-DD HH:mm:ss') : $t('comm.table.empty-2')
        }}
      </j-ellipsis>
    </div>
    <div :class="{'actions': type !== 'detail'}">
      <a-space>
        <a
            v-if="canWrite && accessModes.includes('write')"
            @click.stop="clickEdit"
        >
          <AIcon type="EditOutlined"/>
        </a>
        <a
            v-if="canRead && accessModes.includes('read')"
            @click.stop="clickRead"
        >
          <AIcon type="RedoOutlined"/>
        </a>
      </a-space>
    </div>
  </div>
  <WritePoint v-if="visible && canWrite && accessModes.includes('write')" :data="data" @close="visible = false" @save="onSave"/>
</template>

<script setup lang="ts">
import { computed, onScopeDispose, ref, watch } from 'vue';
import type { PropType } from 'vue';
import { getAccessModes, isPointStopped } from "../data";
import type { CollectRecord } from "../../../hook/context";
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
    type: Object as PropType<CollectRecord>,
    default: () => ({}),
  },
  type: { type: String },
  // 首页传入菜单授权；详情等已有调用方保留原有读写策略。
  canRead: { type: Boolean, default: true },
  canWrite: { type: Boolean, default: true },
})

const emits = defineEmits(['refresh'])

const visible = ref(false)
const historyData = ref<PointValueData>()
const stopped = computed(() => isPointStopped(props.data))
const accessModes = computed(() => stopped.value ? [] : getAccessModes(props.data))
const liveValue = computed(() => stopped.value ? undefined : props.value)
let readRevision = 0
watch([() => props.data.id, () => props.data.collectorId, stopped], () => {
  readRevision++
  historyData.value = undefined
  visible.value = false
}, { flush: 'sync' })
onScopeDispose(() => { readRevision++ })
// 撤销授权后丢弃在途读取结果，并关闭已打开的写入入口。
watch(() => props.canRead, () => {
  readRevision++
  historyData.value = undefined
}, { flush: 'sync' })
watch(() => props.canWrite, () => { visible.value = false }, { flush: 'sync' })

const formattedValue = computed(() => formatPointData(
  stopped.value ? undefined : liveValue.value?.dataType ? liveValue.value : historyData.value,
  $t('comm.table.empty-2'),
))
const clickEdit = () => {
  if (props.canWrite && accessModes.value.includes('write')) visible.value = true
}

const clickRead = async () => {
  const { collectorId, id } = props.data;
  if (!props.canRead || !collectorId || !id || !accessModes.value.includes('read')) return;
  const revision = ++readRevision
  const res = await readPoint(collectorId, [id]);
  if (res.success && revision === readRevision && props.canRead && accessModes.value.includes('read')) {
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
