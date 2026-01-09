<template>
  <a-modal open title="表格列配置" width="800px" @cancel="emits('close')" @ok="onSave">
    <p>请选择需要在表格中显示的数据列</p>
    <TitleComponent data="基本信息">
      <template #extra>
        <a-checkbox style="margin-left: 20px" v-model:checked="state.checkAll" :indeterminate="state.indeterminate"
                    @change="onCheckAllChange"/>
      </template>
    </TitleComponent>
    <div style="margin-bottom: 16px">
      <a-checkbox-group v-model:value="state.checkedList">
        <a-row :gutter="[24, 24]">
          <a-col :span="6" v-for="item in _baseColumns" :key="item.value">
            <a-checkbox :value="item.value" :disabled="item.disabled">{{ item.label }}</a-checkbox>
          </a-col>
        </a-row>
      </a-checkbox-group>
    </div>
    <template v-if="!!extraPointColumns.length">
      <TitleComponent :data="collector.provider">
        <template #extra>
          <a-checkbox style="margin-left: 20px" v-model:checked="_state.checkAll" :indeterminate="_state.indeterminate"
                      @change="onExtraAllChange"/>
        </template>
      </TitleComponent>
      <div>
        <a-checkbox-group v-model:value="_state.checkedList">
          <a-row :gutter="[24, 24]">
            <a-col :span="_span" v-for="item in extraPointColumns" :key="item.dataIndex">
              <a-checkbox :value="item.dataIndex">{{ item.title }}</a-checkbox>
            </a-col>
          </a-row>
        </a-checkbox-group>
      </div>
    </template>
  </a-modal>
  <RenderComponents v-if="jsonData" :value="jsonData"/>
</template>

<script setup>
import {baseColumns} from './columns';
import {map} from "lodash-es";
import RenderComponents from "@data-collector-ui/components/RenderComponents/RenderComponents.vue";
import {devGetProtocol} from "@data-collector-ui/utils/utils";

const props = defineProps({
  data: {
    type: Array,
    default: () => [],
  },
  collector: {
    type: Object,
    default: () => {
    },
  }
})
const emits = defineEmits(['close', 'save']);

const jsonData = ref();

const extraPointColumns = ref([])
provide('point-extra-columns', extraPointColumns)

const _baseColumns = computed(() => baseColumns.map(i => ({
  label: i.name || i.title,
  value: i.key,
  disabled: i.key === 'name'
})))

const _span = computed(() => {
  const count = 24 / (extraPointColumns.value.length || 1)
  if (count < 6) {
    return 6
  }
  return count
})

const state = reactive({
  indeterminate: false,
  checkAll: false,
  checkedList: [],
});

const _state = reactive({
  indeterminate: false,
  checkAll: false,
  checkedList: [],
});

const getPointColumns = async (provider) => {
  extraPointColumns.value = []
  jsonData.value = await devGetProtocol(provider, "pointColumns");
};


const onCheckAllChange = (e) => {
  Object.assign(state, {
    checkedList: e.target.checked ? map(_baseColumns.value, 'value') : ['name'],
    indeterminate: !e.target.checked,
  });
};

const onExtraAllChange = (e) => {
  Object.assign(_state, {
    checkedList: e.target.checked ? map(extraPointColumns.value, 'dataIndex') : [],
    indeterminate: false,
  });
};

watch(
    () => state.checkedList,
    val => {
      state.indeterminate = !!val.length && val.length < _baseColumns.value.length;
      state.checkAll = !!val.length && val.length === _baseColumns.value.length;
    },
);
watch(
    () => _state.checkedList,
    (val) => {
      _state.indeterminate = !!val.length && val.length < extraPointColumns.value.length;
      _state.checkAll = !!val.length && val.length === extraPointColumns.value.length;
    },
);

const onSave = () => {
  const arr = baseColumns.filter(i => state.checkedList.includes(i.key))
  const extraArr = extraPointColumns.value.filter(i => _state.checkedList.includes(i.dataIndex))
  emits('save', [...arr, ...extraArr]);
}

const getData = (baseArr, arr) => {
  const a = !!arr.length && !!baseArr.length &&  baseArr.every(i => arr.includes(i))
  const b = !!baseArr.length && baseArr.some(i => arr.includes(i))
  return {
    indeterminate: !a && b,
    checkAll: a,
    checkedList: baseArr.filter(i => arr.includes(i))
  }
}

// 初始化基本信息的选中状态
const initBaseColumns = () => {
  if (!props.data?.length) return
  const arr = props.data.map(i => i.key || i.dataIndex)
  const obj = getData(map(_baseColumns.value, 'value'), arr)
  Object.assign(state, obj)
}

// 初始化额外字段的选中状态
const initExtraColumns = () => {
  if (!props.data?.length || !extraPointColumns.value?.length) return
  const arr = props.data.map(i => i.key || i.dataIndex)
  const _obj = getData(map(extraPointColumns.value, 'dataIndex'), arr)
  Object.assign(_state, _obj)
}

watch(() => props.data, () => {
  initBaseColumns()
  initExtraColumns()
}, {
  immediate: true,
})

// 当 extraPointColumns 变化时，重新初始化额外字段的选中状态
watch(() => extraPointColumns.value, () => {
  initExtraColumns()
})

watch(() => props.collector?.provider, (newVal) => {
  if (newVal) {
    getPointColumns(newVal)
  }
}, {
  immediate: true,
})

</script>

<style lang="less" scoped>

</style>
