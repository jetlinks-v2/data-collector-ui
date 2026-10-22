import { computed, onBeforeUnmount, reactive, ref, shallowRef, watch } from 'vue'
import type { Component } from 'vue'
import { useI18n } from 'vue-i18n'
import { debounce, get, set } from 'lodash-es'
import type { PropertyPath } from 'lodash-es'
import { uniqueByKey } from '../data'

export interface PointBatchRow {
  id?: string
  __dataIndex: number
  sames: Record<string, boolean>
  managedConfiguration?: Record<string, unknown>
  features?: string[]
  [key: string]: unknown
}

export interface PointBatchColumn {
  title?: string
  key?: string
  dataIndex: string
  width?: number
  fixed?: string
  ellipsis?: boolean
  form?: { name?: PropertyPath; required?: boolean; [key: string]: unknown }
  template?: {
    components?: string | Component
    props?: Record<string, unknown>
    check?: boolean
    getValue?: (value: unknown) => unknown
    getOptions?: (record: PointBatchRow, previous?: PointBatchRow) => void
    handleChange?: (value: unknown, index: number) => unknown
    handleOptions?: (record: PointBatchRow) => void
  }
}

export interface PointEditTableInstance {
  validate: () => Promise<boolean>
  getTableWrapperRef: () => HTMLElement
}

interface PointEditTableProps {
  columns: PointBatchColumn[]
  dataSource: PointBatchRow[]
  sameFieldKey: string
}

type TableEmit = {
  (event: 'update:dataSource' | 'change', rows: PointBatchRow[]): void
  (event: 'checkChange' | 'fieldChange', value: unknown, column: PointBatchColumn, row: PointBatchRow): void
}

/** 保留协议字段编辑、向后“同上”传播、删除和高级配置的表格契约。 */
export function usePointEditTable(props: PointEditTableProps, emit: TableEmit) {
  const { t } = useI18n()
  const dataSource = shallowRef(props.dataSource)
  const tableRef = ref<PointEditTableInstance>()
  const otherConfig = reactive<{ visible: boolean; data: Partial<PointBatchRow> }>({ visible: false, data: {} })
  const columns = computed(() => uniqueByKey<PointBatchColumn>([
    ...props.columns,
    { title: t('DataCollect.index.400153-1'), key: 'otherConfig', dataIndex: 'otherConfig', ellipsis: true, fixed: 'right', width: 100 },
    { title: t('Collector.data.400141-40'), key: 'actions', dataIndex: 'actions', fixed: 'right', width: 80 },
  ], 'dataIndex'))

  const getFieldValue = (record: PointBatchRow, column: PointBatchColumn) => {
    const value = get(record, column.form?.name || [column.dataIndex])
    return column.template?.getValue ? column.template.getValue(value) : value
  }
  const updateRows = () => {
    emit('update:dataSource', dataSource.value)
    emit('change', dataSource.value)
  }

  // 只更新连续勾选“同上”的后续行，遇到独立配置即停止。
  const sameValue = (index: number, fieldPath: PropertyPath, samePath: string, value: unknown) => {
    for (let i = index + 1; i < dataSource.value.length; i++) {
      const row = dataSource.value[i]
      if (!get(row, [props.sameFieldKey, samePath])) break
      set(row, fieldPath, value)
    }
  }
  const onCheckChange = (event: { target: { checked: boolean } }, column: PointBatchColumn, record: PointBatchRow) => {
    const checked = event.target.checked
    record.sames[column.dataIndex] = checked
    if (checked && record.__dataIndex !== 0) {
      const formName = column.form?.name || [column.dataIndex]
      const previous = get(dataSource.value[record.__dataIndex - 1], formName)
      sameValue(record.__dataIndex - 1, formName, column.dataIndex, previous)
    } else if (!checked) {
      column.template?.getOptions?.(record, dataSource.value[record.__dataIndex - 1])
    }
    updateRows()
    emit('checkChange', checked, column, record)
  }
  const updateOptions = debounce((column: PointBatchColumn, record: PointBatchRow) => {
    if (column.template?.handleOptions && get(record, [props.sameFieldKey, column.dataIndex])) {
      column.template.handleOptions(record)
    }
  }, 1500)
  const onFieldChange = (value: unknown, column: PointBatchColumn, record: PointBatchRow) => {
    const input = value as { target?: { value?: unknown } } | null
    let fieldValue = input?.target ? input.target.value : value
    if (column.template?.handleChange) fieldValue = column.template.handleChange(value, record.__dataIndex)
    const formName = column.form?.name || [column.dataIndex]
    set(dataSource.value[record.__dataIndex], formName, fieldValue)
    sameValue(record.__dataIndex, formName, column.dataIndex, fieldValue)
    updateRows()
    emit('fieldChange', value, column, record)
    updateOptions(column, dataSource.value[record.__dataIndex])
  }
  const showOtherConfig = (record: PointBatchRow) => {
    otherConfig.visible = true
    otherConfig.data = record
  }
  const onSaveOtherConfig = (config: Pick<PointBatchRow, 'managedConfiguration' | 'features'>) => {
    otherConfig.data.managedConfiguration = config.managedConfiguration
    otherConfig.data.features = config.features || []
    otherConfig.visible = false
  }
  // 删除独立配置行时，先让其后连续“同上”的行继承上一行，再移除该行。
  const removeItem = (record: PointBatchRow, index: number) => {
    if (index !== 0) {
      const previous = dataSource.value[index - 1]
      Object.keys(record.sames).forEach(key => {
        if (!record.sames[key]) {
          const column = columns.value.find(item => item.dataIndex === key)
          const formName = column?.form?.name || key
          sameValue(record.__dataIndex, formName, key, get(previous, formName))
        }
      })
    }
    dataSource.value.splice(index, 1)
    updateRows()
  }
  const onSave = async () => await tableRef.value?.validate() ? dataSource.value : false

  watch(() => props.dataSource, value => { dataSource.value = value }, { immediate: true })
  onBeforeUnmount(() => updateOptions.cancel())
  return {
    dataSource, columns, tableRef, otherConfig, getFieldValue, onCheckChange,
    onFieldChange, showOtherConfig, onSaveOtherConfig, removeItem, onSave,
  }
}
