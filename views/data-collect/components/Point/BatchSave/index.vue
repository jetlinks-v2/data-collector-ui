<template>
  <j-page-container :showBack="true">
    <template #title>
      <div style="display: flex; align-items: center; gap: 16px">
        <j-ellipsis>
          {{ collector.name }}
        </j-ellipsis>
        <a-tag>{{ collector.provider }}</a-tag>
        <a-tag>{{ collector.id }}</a-tag>
      </div>
    </template>
    <full-page>
      <div class="batch-add-box">
        <div>
          <a-space>
            <a-button type="link" @click="addOne">新增一条</a-button>
            <a-button type="link" @click="visible = true">新增多条</a-button>
          </a-space>
        </div>
        <div>
          <j-edit-table
              ref="tableRef"
              :dataSource="dataSource"
              :serial="false"
              :columns="columns"
              :height="500"
          >
            <template #name="{ record, index }">
              <j-edit-table-form-item :name="[index, 'name']">
                <div class="scan-ditto-box">
                  <a-input
                      v-model:value="record.name"
                      :placeholder="$t('Scan.Table.400147-0')"
                      allowClear
                      class="ditto-grow"
                      @change="valueChange(index, 'name')"
                  />
                </div>
              </j-edit-table-form-item>
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
      </div>
    </full-page>
  </j-page-container>
  <PatchItems v-if="visible" :provider="collector.provider" @close="visible = false" @save="onSave"/>
</template>

<script setup>
// 查询采集器
import {detail} from "@data-collector-ui/api/data-collect/collector";
import {useI18n} from "vue-i18n";
import i18n from "@jetlinks-web-core/locales";
import {isArray, isNil} from "lodash-es";
import {Space, Tooltip} from "ant-design-vue";
import {QuestionCircleOutlined} from "@ant-design/icons-vue";
import PatchItems from './BatchItems.vue'

const {t: $t} = useI18n();
const route = useRoute();
const collector = ref({})
const dataSource = ref([])
const visible = ref(false)

const columns = computed(() => {
  return [
    {
      title: i18n.global.t('Collector.data.400141-36'),
      dataIndex: 'name',
      template: {
        components: 'a-input',
        props: {
          allowClear: true
        }
      },
      ellipsis: true,
    },
    {
      title: i18n.global.t('Collector.data.400141-37'),
      dataIndex: 'accessModes',
      key: 'accessModes',
      width: 350,
      form: {
        required: true,
        rules: [
          {
            asyncValidator: (rule, value, cb) => {
              const _value = isArray(value) ? value : value.value
              if (!_value?.length) {
                return Promise.reject($t('Scan.Table.400147-1'));
              }
              return Promise.resolve();
            },
          }
        ]
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
              if (value && isNil(value.interval.value)) {
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
  ]
})

const getDetail = async (id) => {
  const res = await detail(id);
  if (res.success) {
    collector.value = res.result;
  }
}

const addOne = () => {
  dataSource.value.push({
    name: undefined,
    provider: collector.value.provider || 'OPC_UA',
    collectorId: collector.value.id,
    collectorName: collector.value.name,
    pointKey: undefined,
    configuration: {
      interval: undefined,
      type: undefined,
    },
    features: [],
    accessModes: []
  })
}

const onSave = (arr) => {
  dataSource.value.push(...arr)
}

const removeItem = (dt) => {

}

const valueChange = () => {

}

const changeCheckbox = () => {

}

// 通用字段+ 协议特定字段 + 其余配置/操作列

watch(() => route.params.id, (val) => {
  if (val) {
    getDetail(val)
  }
}, {immediate: true})
</script>

<style lang="less" scoped>
.batch-add-box {
  padding: 24px;
}

.scan-ditto-box {
  display: flex;
  align-items: center;
  gap: 16px;

  .ditto-grow {
    flex: 1;
    min-width: 0;
  }

  .ditto-checkbox {

  }
}
</style>
