<template>
  <a-modal open title="表格列配置" width="800px" @cancel="emits('close')" @ok="onSave">
    <p>请选择需要在表格中显示的数据列</p>
    <TitleComponent data="基本信息">
      <template #extra>
        <a-checkbox style="margin-left: 20px" v-model:checked="state.checkAll" :indeterminate="state.indeterminate"
                    @change="onCheckAllChange"/>
      </template>
    </TitleComponent>
    <div>
      <a-checkbox-group v-model:value="state.checkedList">
        <a-row :gutter="[24, 24]">
          <a-col :span="6" v-for="item in _baseColumns" :key="item.value">
            <a-checkbox :value="item.value" :disabled="item.disabled">{{ item.label }}</a-checkbox>
          </a-col>
        </a-row>
      </a-checkbox-group>
    </div>

    <div>
      <!-- todo: 根据外部的类型的不同去加载动态文件实现columns的配置 -->
    </div>
  </a-modal>
</template>

<script setup>
import {baseColumns} from './columns';
import {map} from "lodash-es";

const props = defineProps({
  data: {
    type: Array,
    default: () => [],
  }
})
const emits = defineEmits(['close', 'save']);

const _baseColumns = computed(() => baseColumns.map(i => ({label: i.title, value: i.key, disabled: i.key === 'name'})))

const state = reactive({
  indeterminate: true,
  checkAll: false,
  checkedList: ['name'],
});

const onCheckAllChange = (e) => {
  Object.assign(state, {
    checkedList: e.target.checked ? map(_baseColumns.value, 'value') : ['name'],
    indeterminate: true,
  });
};

const onSave = () => {
  const arr = baseColumns.filter(i => state.checkedList.includes(i.key))
  emits('save', arr);
}

watch(() => props.data, (newVal) => {
  const arr = newVal.map(i => i.key)
  state.checkedList = arr
  state.indeterminate = arr.length > 0 && arr.length < _baseColumns.value.length
  state.checkAll = arr.length === _baseColumns.value.length
}, {
  immediate: true,
})
</script>

<style lang="less" scoped>

</style>
