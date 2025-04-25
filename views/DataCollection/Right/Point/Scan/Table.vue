<script setup name="ScanPointTable">
import i18n from "@/locales";
import {useScan} from "./useScan";
import { useI18n } from 'vue-i18n';
import { set, get, isArray, isNil } from 'lodash-es'
import {devGetProtocol} from "@collector/utils/utils";
import RenderComponents from "@collector/components/RenderComponents";
import RowRender from './TableRowRender.vue';
import { Tooltip, Space } from "ant-design-vue";
import { QuestionCircleOutlined } from '@ant-design/icons-vue';

const { t: $t } = useI18n();
const {dataSource, selectKeys} = useScan()
const collectionData = inject('collector-data', {})
const jsonData = ref();
const tableRef = ref();
const scanSetting = ref({
  columns: [],
  selectKeys: new Set([]),
  handleData: (v) => v
})

provide("plugin-scan-point", scanSetting);

const columns = computed(() => {
  return (scanSetting.value.columns || []).concat([
    {
      title: i18n.global.t('Collector.data.400141-37'),
      dataIndex: 'accessModes',
      key: 'accessModes',
      width: 350,
      form: {
        required: true,
        rules: {
          asyncValidator: (rule, value, cb) => {
            const _value = isArray(value) ? value : value.value
            if (!_value?.length) {
              return Promise.reject($t('Scan.Table.400147-1'));
            }
            return Promise.resolve();
          },
        }
      }
    },
    {
      title: i18n.global.t('Collector.data.400141-38'),
      key: 'configuration',
      dataIndex: 'configuration',
      width: 220,
      render: (val) => h(
        Space,
        {},
        [
          h(
            'span',
            {},
            val
          ),
          h(
            Tooltip,
            {
              title: i18n.global.t('Scan.Table.400147-12'),
            },
            [
              h(
                QuestionCircleOutlined
              )
            ]
          )
        ]
      ),
      form: {
        required: true,
        rules: [
          {
            validator: (rule, value) => {
              if (isNil(value.interval.value)) {
                return Promise.reject($t('Scan.Table.400147-0'));
              } else {
                return Promise.resolve();
              }
            }
          },
        ]
      }
    },
    {
      title: i18n.global.t('Collector.data.400141-39'),
      key: 'features',
      dataIndex: 'features',
      width: 170,
      form: {
        required: true,
      },
    },
    {
      title: i18n.global.t('Collector.data.400141-40'),
      dataIndex: 'actions',
      width: 80
    }
  ])
})

const valueChange = (index, path) => {
  if (dataSource.value.length === 1) {
    return
  }

  const current = dataSource.value[index]
  let i = index

  while (index < dataSource.value.length) { // 循环只更新连续的“同上”项，减少不必要的遍历。
    const nextIndex = i + 1
    const nextItem = dataSource.value[nextIndex]
    const currentData = get(current, path)
    const nextItemData = get(nextItem, path)
    if (nextItemData?.check) {
      set(nextItem, path+'.value', currentData.value)
      i = nextIndex
    } else {
      break
    }
  }
}

const changeCheckbox = (record, path, index, e) => {
  const checked = e.target.checked

  if (checked) {
    const lastItem = dataSource.value[index - 1]
    set(record, path, get(lastItem, path))
    valueChange(index, path.split('.value')[0])
  }
}

const removeItem = (record) => {
  selectKeys.value.delete(record.id)
  dataSource.value = dataSource.value.filter((item) => {
    return item.id !== record.id
  })
}

const getProtocol = async () => {
  jsonData.value = await devGetProtocol(collectionData.value.provider, "scan");
};

getProtocol();

defineExpose({
  handleData: async () => {
    const result = await tableRef.value.validate()
    if (result) {
      return scanSetting.value.handleData(dataSource.value)
    }
     return false
  }
})
</script>

<template>
  <div class="scan-table">
    <RenderComponents v-if="jsonData" :value="jsonData" :object="scanSetting" />
    <j-edit-table
      ref="tableRef"
      :dataSource="dataSource"
      :columns="columns"
      :height="500"
    >
      <template v-for="item in columns.filter(item => item.template)" #[item.dataIndex]="{ record, index }">
        <RowRender
          :props="item.template.props"
          :name="item.template.components"
          :value="get(record, item.path || item.dataIndex)"
          :provider="collectionData.provider"
          @change="(v) => { set(record, item.path || item.dataIndex, v)}"
        />
      </template>
      <template #accessModes="{ record, index }">
        <j-edit-table-form-item :name="[index, 'accessModes', 'value']">
          <div class="scan-ditto-box">
            <a-select
              class="ditto-grow"
              v-model:value="record.accessModes.value"
              mode="multiple"
              allowClear
              :placeholder="$t('Scan.Table.400147-1')"
              :options="[
                 { label: $t('Scan.Table.400147-2'), value: 'read' },
                 { label: $t('Scan.Table.400147-3'), value: 'write' },
                 { label: $t('Scan.Table.400147-4'), value: 'subscribe' },
              ]"
              :disabled="index !== 0 && record.accessModes.check"
              optionFilterProp="label"
              @change="valueChange(index, 'accessModes')"
            />
            <a-checkbox
              v-if="index !== 0"
              class="ditto-checkbox"
              v-model:checked="record.accessModes.check"
              @change="e => changeCheckbox(record, 'accessModes.value', index, e)"
            >
              {{ $t('Scan.Table.400147-5') }}
            </a-checkbox>
          </div>
        </j-edit-table-form-item>
      </template>
      <template #configuration="{ record, index }">
        <j-edit-table-form-item :name="[index, 'configuration', 'interval', 'value']">
          <div class="scan-ditto-box">
          <a-input-number
            v-model:value="record.configuration.interval.value"
            :placeholder="$t('Scan.Table.400147-0')"
            allowClear
            addon-after="ms"
            :max="2147483647"
            :min="0"
            :precision="0"
            :disabled="index !== 0 && record.configuration.interval.check"
            class="ditto-grow"
            @change="valueChange(index, 'configuration.interval')"
          />
          <a-checkbox
            v-if="index !== 0"
            class="ditto-checkbox"
            v-model:checked="record.configuration.interval.check"
            @change="e => changeCheckbox(record, 'configuration.interval.value', index, e)"
          >
            {{ $t('Scan.Table.400147-5') }}
          </a-checkbox>
        </div>
        </j-edit-table-form-item>
      </template>
      <template #features="{ record, index }">
        <div class="scan-ditto-box">
          <a-select
            class="ditto-grow"
            v-model:value="record.features.value"
            :placeholder="$t('Scan.Table.400147-1')"
            :options="[
                 {
                     label: $t('Scan.Table.400147-7'),
                     value: true,
                 },
                 {
                     label: $t('Scan.Table.400147-8'),
                     value: false,
                 },
              ]"
            :disabled="index !== 0 && record.features.check"
            @change="valueChange(index, 'features')"
          />
          <a-checkbox
            v-if="index !== 0"
            class="ditto-checkbox"
            v-model:checked="record.features.check"
            @change="e => changeCheckbox(record, 'features.value', index, e)"
          >
            {{ $t('Scan.Table.400147-5') }}
          </a-checkbox>
        </div>
      </template>
      <template #actions="{ record }">
        <j-permission-button
          :tooltip="{
            title: $t('Scan.Table.400147-9'),
          }"
          :popConfirm="{
            title: $t('Scan.Table.400147-10'),
            onConfirm: () => removeItem(record),
          }"
          danger type="link"
        >
          <AIcon type="DeleteOutlined"/>
        </j-permission-button>
      </template>
    </j-edit-table>
  </div>
</template>

<style scoped lang="less">
.scan-table {
  width: calc(100% - 316px);

  .scan-ditto-box {
    display: flex;
    gap: 8px;
    align-items: center;

    .ditto-grow {
      width: calc(100% - 68px);
    }

  }
}
</style>
