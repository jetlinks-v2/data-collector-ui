<template>
  <a-space>
    <j-ellipsis>{{ _value }}</j-ellipsis>
    <template v-if="isWrite">
      <a-popover v-model:visible="visible" trigger="click" :title="$t('WritePoint.index.769007-0')" :destroyTooltipOnHide="true">
        <template #content>
          <WritePoint :data="data" @close="visible = false" @save="onSave"/>
        </template>
        <a>
          <AIcon type="EditOutlined"/>
        </a>
      </a-popover>
    </template>
    <a
        v-if="isRead"
        @click.stop="clickRead()"
    >
      <AIcon type="RedoOutlined"/>
    </a>
  </a-space>
</template>

<script setup>
import {isBoolean, isNumber, map} from "lodash-es";
import {onlyMessage} from "@jetlinks-web/utils";
import {readPoint} from "@collector/api/data-collect/collector";
import {useI18n} from "vue-i18n";
import WritePoint from './WritePoint/index.vue';

const props = defineProps({
  data: {
    type: Object,
    default: () => ({})
  },
  value: {
    type: Object
  }
})
const emits = defineEmits(['refresh'])
const {t: $t} = useI18n();

const readData = ref({})
const visible = ref(false)

const _value = computed(() => {
  if (props.value) {
    const {parseData, dataType} = props.value;
    const data = isNumber(parseData) ? parseData || 0 : parseData;
    return `${data}(${dataType})`
  } else {
    const parseData = readData.value.parseData
    const dataType = readData.value.dataType
    if (parseData || parseData === false) {
      if (isBoolean(parseData)) {
        return `${parseData}(${dataType || '-'}) `;
      } else {
        return `${parseData}(${dataType || '-'})`;
      }
    }
    return '--'
  }
})

const isWrite = computed(() => {
  return map(props.data?.accessModes || [], 'value').includes('write')
})

const isRead = computed(() => {
  return map(props.data?.accessModes || [], 'value').includes('read')
})

const clickRead = async () => {
  const res = await readPoint(props.data?.collectorId, [props.data?.id]);
  if (res.success) {
    readData.value = res.result[0];
    onlyMessage($t('Point.index.400149-14'), 'success');
  }
};

const onSave = () => {
  emits('refresh')
  visible.value = false
}
</script>

<style lang="less" scoped>

</style>
