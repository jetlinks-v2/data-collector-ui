<template>
  <div v-if="_baseColumns.length">
    <TitleComponent :data="title">
      <template #extra>
        <a-checkbox
            style="margin-left: 20px"
            :checked="checkAll"
            :indeterminate="indeterminate"
            @change="onCheckAllChange"
        />
      </template>
    </TitleComponent>
    <div style="margin-bottom: 16px">
      <a-checkbox-group v-model:value="checkedList">
        <div class="row">
          <div class="item" v-for="item in _baseColumns" :key="item.value">
            <a-checkbox :value="item.value" :disabled="item.disabled">{{ item.label }}</a-checkbox>
          </div>
        </div>
      </a-checkbox-group>
    </div>
  </div>
  <RenderComponents v-if="jsonData" :value="jsonData"/>
</template>

<script setup>

import {devGetProtocol} from "@data-collector-ui/utils/utils";
import RenderComponents from "@data-collector-ui/components/RenderComponents/RenderComponents.vue";
import {baseColumns} from "../columns";
import {map} from "lodash-es";

const props = defineProps({
  title: {
    type: String,
    default: undefined
  },
  provider: {
    type: String,
    default: undefined
  },
  value: {
    type: Array,
    default: []
  }
})

const jsonData = ref();

const extraPointColumns = ref([])
const checkedList = ref([])

provide('point-extra-columns', extraPointColumns)

const _baseColumns = computed(() => {
  const arr = props.provider === 'base' ? baseColumns : extraPointColumns.value;
  return arr.map(i => ({
    label: i.name || i.title,
    value: i.key,
    disabled: i.key === 'name'
  }))
})

const checkAll = computed(() => {
  const arr = map(_baseColumns.value, 'value')
  return !!checkedList.value.length && arr.every(i => checkedList.value.includes(i))
})

const indeterminate = computed(() => {
  const arr = map(_baseColumns.value, 'value')
  return !!checkedList.value.length && arr.some(i => checkedList.value.includes(i)) && !arr.every(i => checkedList.value.includes(i))
})

const getPointColumns = async (_provider) => {
  extraPointColumns.value = []
  jsonData.value = await devGetProtocol(_provider, "pointColumns");
};

const onCheckAllChange = (e) => {
  const _checked = e.target.checked
  checkedList.value = _checked ? map(_baseColumns.value, 'value') : (props.provider === 'base' ? ['name'] : [])
};

watch(() => [props.value, _baseColumns.value], () => {
  const arr = map(_baseColumns.value, 'value')
  const _arr = arr.filter(i => props.value.includes(i))
  checkedList.value = _arr.length ? _arr : (props.provider === 'base' ? ['name'] : [])
}, {
  immediate: true,
  deep: true
})

watch(() => props.provider, (newVal) => {
  if (newVal && newVal !== 'base') {
    getPointColumns(newVal)
  }
}, {
  immediate: true,
})

const onSave = () => {
  const arr = props.provider === 'base' ? baseColumns : extraPointColumns.value
  return arr.filter(i => checkedList.value.includes(i.key))
}

defineExpose({
  onSave
})
</script>

<style lang="less" scoped>
.row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

:deep(.ant-checkbox-group) {
  width: 100%;
  display: inline-block;
}
</style>
