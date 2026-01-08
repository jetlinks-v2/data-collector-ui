<template>
  <j-edit-table
      ref="tableRef"
      :dataSource="_dataSource"
      :serial="false"
      :columns="_columns"
      :height="500"
  >
    <template
        v-for="item in columns"
        :key="item.dataIndex"
        v-slot:[item.dataIndex]="{ record, index }"
    >
      <j-edit-table-form-item :name="[index, item.form?.name || item.dataIndex]">
        <div class="scan-ditto-box">
          <div style="min-width: 0;flex: 1">
            <component
                v-bind="item.template?.props || {}"
                :is="item.template?.components"
                :value="getFieldValue(record, item)"
                :checked="getFieldValue(record, item)"
                :disabled="record.sames[item.dataIndex] && item.template?.check !== false"
                :style=" item.template?.components !== 'a-switch' ? { width: '100%' } : {}"
                @change="(value) => onFieldChange(value, item, record)"
            />
          </div>
          <a-checkbox
              v-if="index !== 0 && item.template?.check !== false"
              class="ditto-checkbox"
              :checked="record.sames[item.dataIndex]"
              @change="(e) => onCheckChange(e, item, record)"
          >
            同上
          </a-checkbox>
        </div>
      </j-edit-table-form-item>
    </template>
    <template #otherConfig="{ record, index }">
      <a @click="showOtherConfig(record, index)">
        <AIcon type="SettingOutlined"/>
      </a>
    </template>
    <template #actions="{ record, index }">
      <j-permission-button
          :tooltip="{
            title: $t('Scan.Table.400147-9'),
          }"
          :popConfirm="{
            title: $t('Scan.Table.400147-10'),
            onConfirm: () => removeItem(record, index),
          }"
          danger type="link"
      >
        <AIcon type="DeleteOutlined"/>
      </j-permission-button>
    </template>
  </j-edit-table>
  <OtherSetting
      v-if="otherConfig.visible"
      :data="otherConfig.data"
      @close="otherConfig.visible = false"
      @save="onSaveOtherConfig"
  />
</template>

<script setup>
import {useI18n} from "vue-i18n";
import {uniqueByKey} from "../data";
import OtherSetting from "./OtherSetting.vue";
import { cloneDeep, get, set } from 'lodash-es'

const {t: $t} = useI18n();
const props = defineProps({
  columns: {
    type: Array,
    default: () => []
  },
  dataSource: {
    type: Array,
    default: () => []
  },
  fieldPathMap: {
    type: Object,
    default: () => ({})
  },
  sameFieldKey: {
    type: String,
    default: 'sames'
  }
})
const emit = defineEmits(['update:dataSource', 'change', 'checkChange', 'fieldChange'])

const otherConfig = reactive({
  visible: false,
  data: {},
})
const _dataSource = ref(props.dataSource)
const tableRef = ref();
const _columns = computed(() => {
  // 有些有同上,有些没有
  const arr = [
    ...props.columns,
    {
      title: '其余配置',
      key: 'otherConfig',
      dataIndex: 'otherConfig',
      ellipsis: true,
      fixed: 'right',
      width: 100
    },
    {
      key: 'actions',
      title: $t('Collector.data.400141-40'),
      dataIndex: 'actions',
      fixed: 'right',
      width: 80

    }
  ]
  return uniqueByKey(arr, 'dataIndex')
})

const getFieldValue = (record, item) => {
  return get(record, item.form?.name || item.dataIndex)
}

const onSave = (arr) => {
  emit('update:dataSource', arr)
  emit('change', arr)
}

const setByPath = (obj, path, value) => {
  let cur = obj;
  set(cur, path, value);
  return cur;
}

const sameValue = (index, fieldPath, samePath, value) => {
  for (let i = index + 1; i < _dataSource.value.length; i++) {
    const row = _dataSource.value[i];
    const same = row[props.sameFieldKey][samePath];
    if (!same) break;
    _dataSource.value.splice(index + 1, 1, cloneDeep(setByPath(row, fieldPath, value)))
  }
}

// checkbox变化事件
const onCheckChange = (e, item, record) => {
  const checked = e.target.checked

  record.sames[item.dataIndex] = checked

  if (checked && record.__dataIndex !== 0) {
    const formName = item.form?.name || [item.dataIndex]
    const dataIndex = item.dataIndex
    const prevValue = get(_dataSource.value[record.__dataIndex - 1], formName)
    sameValue(record.__dataIndex - 1,  formName, dataIndex, prevValue)
  }

  onSave(_dataSource.value)
  emit('checkChange', checked, item, record)
}

// 字段值变化时，如果下一行勾选了同上，需要同步更新
const onFieldChange = (value, item, record) => {
  const _value = value.target ? value.target.value : value
  const formName = item.form?.name || [item.dataIndex]
  const dataIndex = item.dataIndex

  _dataSource.value.splice(record.__dataIndex, 1, cloneDeep(setByPath(record, formName, _value)))
  sameValue(record.__dataIndex, formName, dataIndex, _value) // 将下面的同上数据进行同步
  onSave(_dataSource.value)
  emit('fieldChange', value, item, record)
}

// actions和其他配置项
const showOtherConfig = (record, index) => {
  otherConfig.visible = true
  otherConfig.data = record || {}
}

const onSaveOtherConfig = (data) => {
  // todo: 保存其他配置
}

const removeItem = (dt, index) => {
  _dataSource.value.splice(index, 1)
  onSave(_dataSource.value)
}

watch(() => props.dataSource.length, (newVal) => {
  _dataSource.value = props.dataSource
}, {
  immediate: true,
})

defineExpose({
  onSave: async () => {
    const result = await tableRef.value.validate()
    if (result) {
      return _dataSource.value
    }
    return false
  }
})
</script>

<style lang="less" scoped>
.scan-ditto-box {
  display: flex;
  align-items: center;
  gap: 16px;

  .ditto-grow {
    flex: 1;
    min-width: 0;
  }

  .ditto-checkbox {
    width: 60px;
  }
}
</style>
