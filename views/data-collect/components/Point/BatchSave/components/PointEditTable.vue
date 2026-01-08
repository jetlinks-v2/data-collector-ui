<template>
  <j-edit-table
      ref="tableRef"
      :dataSource="_dataSource"
      :serial="false"
      :columns="_columns"
      :height="500"
      rowKey="_key"
  >
    <template
        v-for="item in columns"
        :key="item.dataIndex"
        v-slot:[item.dataIndex]="{ record, index }"
    >
      <j-edit-table-form-item :name="[index, item.form?.name || item.dataIndex]">
        <div class="scan-ditto-box">
          <component
              v-bind="item.template?.props || {}"
              :is="item.template?.components"
              :value="getFieldValue(record, item)"
              :disabled="record.sames[item.dataIndex]"
              @update:value="(value) => onFieldChange(value, item, index)"
              style="min-width: 0; flex: 1"
          />
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
import {get, set} from "lodash-es";

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
      width: 120
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

const handleData = (arr) => {
  return arr.map((item, rowIndex) => {
    if (rowIndex === 0 || item.sames) {
      return item
    }
    const newCheckStatus = {}
    item = {...item}
    props.columns.forEach(col => {
      if (col.template?.check !== false) {
        newCheckStatus[col.dataIndex] = true
      }
    })
    item.sames = newCheckStatus
    return item
  })
}

const handleName = (item) => {
  let _dt = item.form?.name || item.dataIndex || []
  if (!Array.isArray(_dt)) {
    _dt = [_dt]
  }
  return _dt
}

// checkbox变化事件
const onCheckChange = (e, item, record) => {
  const checked = e.target.checked
  debugger
  record.sames[item.dataIndex] = checked
  // 同步更新下一行的字段值
  if (checked) {
    // 同步更新所有其他的值
    let _dt = handleName(item)
    let subValue = get(record, _dt)
    set(record, _dt, subValue)
  }
  onSave(_dataSource.value)
  emit('checkChange', checked, item, record)
}

// 字段值变化时，如果下一行勾选了同上，需要同步更新
const onFieldChange = (value, item, rowIndex) => {
  let _dt = handleName(item)
  // 同步更新下一行的勾选状态
  for (let i = rowIndex; i < _dataSource.value.length; i++) {
    if (i === rowIndex || _dataSource.value[i].sames[item.dataIndex]) {
      set(_dataSource.value[i], _dt, value)
    } else {
      // 如果遇到未勾选"同上"的行,停止同步
      break;
    }
  }
  onSave(_dataSource.value)
  emit('fieldChange', value, item, rowIndex)
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

watch(() => props.dataSource, (newVal) => {
  _dataSource.value = handleData(newVal)
}, {
  immediate: true,
  deep: true
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
