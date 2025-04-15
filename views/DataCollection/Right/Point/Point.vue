<template>
  <pro-search
      :columns="columns"
      target="search-datacollect-point"
      @search="handleSearch"
      style="padding: 0"
  />
  <div style="flex: 1; min-height: 300px">
    <j-pro-table
        ref="tableRef"
        :columns="columns"
        mode="TABLE"
        :request="getDataSource"
        :defaultParams="defaultParams"
        :params="params"
        style="padding: 0"
        :rowSelection="
            isCheck ? {
                  selectedRowKeys: _selectedRowKeys,
                  onSelect: onSelect,
                  onSelectAll: selectAll,
                  onSelectNone: () => (_selectedRowKeys = []),
              }
            : false
        "
    >
      <template #headerLeftRender>
        <a-space v-if="type === 'collector'">
          <j-permission-button
              v-if="pointActions.add"
              type="primary"
              @click="handleAdd"
              hasPermission="DataCollect/Collector:add"
          >
            <template #icon>
              <AIcon type="PlusOutlined"/>
            </template>
            {{ $t('Point.index.400149-0') }}
          </j-permission-button>
          <j-permission-button
              v-if="pointActions.scan"
              type="primary"
              @click="handleScan"
              hasPermission="DataCollect/Collector:add"
          >
            <template #icon>
              <AIcon type="PlusOutlined"/>
            </template>
            {{ $t('Point.index.400149-1') }}
          </j-permission-button>
          <j-permission-button
              v-if="data?.id && data.id !== '*'"
              type="primary"
              @click="handleImport"
              hasPermission="DataCollect/Collector:add"
          >
            {{ $t('Point.index.400149-2') }}
          </j-permission-button>
          <j-permission-button
              v-if="data?.id && data.id !== '*'"
              type="primary"
              @click="handleExport"
              hasPermission="DataCollect/Collector:add"
          >
            {{ $t('Point.index.400149-3') }}
          </j-permission-button>
          <BatchDropdown
              v-if="data?.id && data.id !== '*'"
              ref="batchRef"
              v-model:isCheck="isCheck"
              :actions="batchActions"
              @change="onCheckChange"
          />
        </a-space>
      </template>
      <template #name="slotProps">
        <div style="display: flex; align-items: center;gap: 16px">
          <img :src="ImageMap.get(slotProps.provider)" :width="50"/>
          <j-ellipsis>{{ slotProps.name }}</j-ellipsis>
        </div>
      </template>
      <template #pointValue="slotProps">
        <ValueItem @refresh="onRefresh" :data="slotProps" :value="propertyValue.get(slotProps.id)"/>
      </template>
      <template #updateTime="slotProps">
        {{
          propertyValue.get(slotProps.id)?.timestamp ? dayjs(propertyValue.get(slotProps.id)?.timestamp).format('YYYY-MM-DD HH:mm:ss') : '--'
        }}
      </template>
      <template #interval="slotProps">
        {{ slotProps.configuration?.interval ? slotProps.configuration?.interval + 'ms' : '--' }}
      </template>
      <template #quantity="slotProps">
        {{ slotProps.configuration?.parameter?.quantity || '--' }}
      </template>
      <template #address="slotProps">
        {{ slotProps.configuration?.parameter?.address || '--' }}
      </template>
      <template #scaleFactor="slotProps">
        {{ slotProps.configuration?.codec?.configuration.scaleFactor || "--" }}
      </template>
      <template #accessModes="slotProps">
        <a-tag v-for="item in slotProps.accessModes" :key="item.value">{{ item.text }}</a-tag>
      </template>
      <template #runningState="slotProps">
        <a-tag color="green">{{ slotProps.runningState?.text }}</a-tag>
      </template>
      <template #description="slotProps">
        <EditInput :data="slotProps" @refresh="onRefresh"/>
      </template>
      <template #actions="slotProps">
        <a-space>
          <j-permission-button
              type="link"
              @click="handleEdit(slotProps)"
              hasPermission="DataCollect/Collector:update"
          >
            <AIcon type="FormOutlined"/>
          </j-permission-button>
          <j-permission-button
              type="link"
              danger
              :tooltip="{title: $t('Point.index.400149-5')}"
              hasPermission="DataCollect/Collector:delete"
              :popConfirm="{
                  title: $t('Point.index.400149-6'),
                  onConfirm: () =>
                      handleDelete(slotProps.id),
              }"
          >
            <AIcon type="DeleteOutlined"/>
          </j-permission-button>
        </a-space>
      </template>
    </j-pro-table>
  </div>
  <RenderComponents
      :key="data.id"
      v-if="data.id && data.provider !== 'COLLECTOR_GATEWAY' && jsonData"
      :value="jsonData"
  />
  <Save
      v-if="editData.visible"
      :data="editData.current"
      :collector="data"
      @close="editData.visible = false"
  />
  <Import
      v-if="importData.visible"
      :data="importData.current"
      @close="importData.visible = false"
  />
  <BatchUpdate
      v-if="batchUpdate.visible"
      :data="batchUpdate.current"
      :provider="data.provider"
      @close="batchUpdate.visible = false"
  />
  <Scan
    v-if="scanData.visible"
    :data="scanData.current"
  />
</template>

<script setup>
import {queryPoint, getStates, batchDeletePoint, removePoint, exportPoint} from "@collector/api/data-collect/collector";
import {getProviders} from "@collector/api/data-collect/channel";
import {useI18n} from "vue-i18n";
import {imgUrl} from "@collector/views/DataCollection/data";
import {wsClient} from "@jetlinks-web/core";
import {map} from "rxjs/operators";
import {cloneDeep, throttle} from "lodash-es";
import dayjs from "dayjs";
import ValueItem from './ValueItem.vue'
import {downloadFileByUrl, onlyMessage} from "@jetlinks-web/utils";
import RenderComponents from "@collector/components/RenderComponents/RenderComponents.vue";
import {devGetProtocol} from "@collector/utils/utils";
import Save from "./Save/index.vue";
import EditInput from "./EditInput.vue";
import Import from "./Import/index.vue";
import BatchUpdate from './BatchUpdate/index.vue';
import Scan from './Scan/Scan.vue'

const {t: $t} = useI18n();
const data = inject('collector-data')
const type = inject('collector-type')
const jsonData = ref();

const columns = [
  {
    title: $t('Point.index.400149-9'),
    dataIndex: 'name',
    key: 'name',
    fixed: 'left',
    search: {
      type: 'string',
    },
    width: 180,
    scopedSlots: true,
  },
  { // todo: 仅在选中「全部」时，展示此筛选项
    title: $t('Channel.index.290640-4'),
    dataIndex: 'provider',
    key: 'provider',
    hideInTable: true,
    search: {
      type: 'select',
      options: async () => {
        const resp = await getProviders();
        if (resp.success) {
          return resp.result.map((i) => {
            return {
              label: i.name,
              value: i.id
            }
          })
        }
      },
    },
  },
  {// todo: 运行中，已停止
    title: $t('Point.index.400149-12'),
    dataIndex: 'runningState',
    key: 'runningState',
    width: 150,
    search: {
      type: 'select',
      options: async () => {
        const resp = await getStates();
        if (resp.success) {
          return resp.result.map((item) => ({
            label: item.text,
            value: item.value,
          }));
        } else {
          return [];
        }
      },
    },
    scopedSlots: true,
  },
  {
    title: '点位值',
    dataIndex: 'pointValue',
    key: 'pointValue',
    scopedSlots: true,
    width: 150
  },
  {
    title: '源数据',
    dataIndex: 'value1',
    key: 'value1',
    scopedSlots: true,
    ellipsis: true,
    width: 100
  },
  {
    title: '更新时间',
    dataIndex: 'updateTime',
    key: 'updateTime',
    width: 200,
    scopedSlots: true,
    ellipsis: true,
  },
  {
    title: $t('Point.index.400149-24'),
    dataIndex: 'quantity',
    key: 'quantity',
    scopedSlots: true,
    ellipsis: true,
    width: 100
  },
  {
    title: $t('Point.index.400149-25'),
    dataIndex: 'address',
    key: 'address',
    scopedSlots: true,
    ellipsis: true,
    width: 80
  },
  {
    title: $t('Point.index.400149-26'),
    dataIndex: 'scaleFactor',
    key: 'scaleFactor',
    scopedSlots: true,
    ellipsis: true,
    width: 100
  },
  {
    title: $t('Point.index.400149-11'),
    dataIndex: 'accessModes',
    key: 'accessModes',
    scopedSlots: true,
    width: 220,
    search: {
      type: 'select',
      options: [
        {
          label: $t('Point.index.400149-7'),
          value: 'read',
        },
        {
          label: $t('Point.index.400149-8'),
          value: 'write',
        },
        {
          label: $t('Point.index.400149-21'),
          value: 'subscribe',
        }
      ]
    },
  },
  {
    title: $t('Point.index.400149-20'),
    dataIndex: 'interval',
    key: 'interval',
    scopedSlots: true,
    width: 120,
  },
  {
    title: $t('Point.index.400149-13'),
    dataIndex: 'description',
    key: 'description',
    width: 120,
    ellipsis: true,
    search: {
      type: 'string',
    },
    scopedSlots: true,
  },
  {
    title: '操作',
    dataIndex: 'actions',
    key: 'actions',
    fixed: 'right',
    width: 150,
    scopedSlots: true,
  },
]
const params = ref({})
const subRef = ref()
const tableRef = ref()
const ImageMap = new Map();
const propertyValue = ref(new Map());
const pointActions = reactive({
  add: false,
  scan: false,
});

provide("point-actions", pointActions);

const editData = reactive({
  current: {},
  visible: false
})
const importData = reactive({
  current: {},
  visible: false
})
const batchUpdate = reactive({
  current: {},
  visible: false
})
const scanData = reactive({
  current: {},
  visible: false
})
const batchActions = ref([]);

ImageMap.set('OPC_UA', imgUrl.opcImage);
ImageMap.set('MODBUS_TCP', imgUrl.modbusImage);
ImageMap.set('snap7', imgUrl.s7Image);
ImageMap.set('iec104', imgUrl.iecImage);
ImageMap.set('COLLECTOR_GATEWAY', imgUrl.gatewayImage);

const isCheck = ref(false);
const _selectedRowKeys = ref([])

const defaultParams = ref({
  sorts: [{name: 'id', order: 'desc'}],
  terms: [],
})

const getDataSource = (p) => {
  return queryPoint(p).then(resp => {
    subRef.value?.unsubscribe();
    const _array = resp.result?.data || []
    if (resp.success && _array.length) {
      setTimeout(() => {
        subscribeProperty(_array);
      }, 100)
    }
    return resp
  })
}

const handleSubscribeValue = throttle((payload) => {
  propertyValue.value.set(payload.pointId, payload);
});

const subscribeProperty = (value) => {
  const list = value.map((item) => item.id);
  const id = `collector-point-data-${list.join('-')}`;
  const topic = `/collector/*/*/data`;
  subRef.value = wsClient.getWebSocket(id, topic, {
    pointId: list.join(','),
  })?.pipe(map((res) => res.payload)).subscribe((payload) => {
    // 防止刷新过快
    handleSubscribeValue(payload);
  });
};

const getPointAction = async () => {
  if (data.value?.provider) {
    jsonData.value = await devGetProtocol(data.value?.provider, "pointActions");
  } else {
    jsonData.value = undefined
  }
};

const onSelect = (item, state) => {
  const arr = new Set(_selectedRowKeys.value);
  if (state) {
    arr.add(item.id);
  } else {
    arr.delete(item.id);
  }
  _selectedRowKeys.value = [...arr.values()];
};

const selectAll = (selected, selectedRows, changeRows) => {
  if (selected) {
    changeRows.map((i) => {
      if (!_selectedRowKeys.value.includes(i.id)) {
        _selectedRowKeys.value.push(i.id);
      }
    });
  } else {
    const arr = changeRows.map((item) => item.id);
    const _ids = [];
    _selectedRowKeys.value.map((i) => {
      if (!arr.includes(i)) {
        _ids.push(i);
      }
    });
    _selectedRowKeys.value = _ids;
  }
};
const handleDelete = (id) => {
  // spinning.value = true;
  const response = !id ? batchDeletePoint(_selectedRowKeys.value) : removePoint(id)
  response.then((res) => {
    if (res.success) {
      _selectedRowKeys.value = [];
      tableRef.value?.reload();
      onlyMessage($t('Point.index.400149-14'), 'success');
    }
    // spinning.value = false;
  });
  return response;
};

const handleEdit = (dt) => {
  editData.visible = true
  editData.current = dt
}

const handleAdd = () => {
  editData.visible = true
  editData.current = {}
}

const handleScan = () => {
  scanData.visible = true
  scanData.current = cloneDeep(data.value)
}

const handleImport = () => {
  importData.visible = true
  importData.current = cloneDeep(data.value)
}

const handleExport = async () => {
  const params =
      data.value?.provider === 'COLLECTOR_GATEWAY'
          ? data.value?.configuration?.collectorProvider
          : data.value?.provider;
  const res = await exportPoint(data.value.id, params);
  if (res) {
    const blob = new Blob([res], {type: 'xlsx'});
    const url = URL.createObjectURL(blob);
    downloadFileByUrl(url, $t('Point.index.400149-16', [data.value?.channelName]), 'xlsx');
  }
};
const onCheckChange = () => {
  _selectedRowKeys.value = [];
}

const handleBatchUpdate = () => {
  if (!_selectedRowKeys.value.length) {
    onlyMessage($t('Point.index.400149-15'), 'error');
    return
  }
  const dataSet = new Set(_selectedRowKeys.value);
  const dataMap = new Map();
  tableRef?.value?.dataSource.forEach((i) => {
    dataSet.has(i.id) && dataMap.set(i.id, i);
  });
  batchUpdate.current = [...dataMap.values()];
  batchUpdate.visible = true;
}
const handleBatchDelete = () => {
  if (!_selectedRowKeys.value.length) {
    onlyMessage($t('Point.index.400149-15'), 'error');
    return
  }
  handleDelete();
}
const updateBatchActions = () => {
  const {provider} = data.value
  const defaultActions = [
    {
      key: 'update',
      text: $t('Point.index.400149-22'),
      permission: 'DataCollect/Collector:update',
      icon: 'FormOutlined',
      selected: {
        onClick: handleBatchUpdate,
      },
    },
    {
      key: 'delete',
      text: $t('Point.index.400149-23'),
      danger: true,
      permission: 'DataCollect/Collector:delete',
      icon: 'DeleteOutlined',
      selected: {
        popConfirm: {
          title: $t('Point.index.400149-6'),
          onConfirm: handleBatchDelete,
        },
      },
    },
  ]

  batchActions.value = ['OPC_UA', 'BACNetIp'].includes(provider) ? defaultActions : [defaultActions[1]]
}

const updateDefaultParams = () => {
  let obj = {};
  if (type.value === 'channel') {
    obj = {
      column: 'channelId',
      termType: 'eq',
      value: data.value?.id
    }
  } else if (type.value === 'collector') {
    obj = {
      column: 'collectorId',
      termType: 'eq',
      value: data.value?.id
    }
  }
  defaultParams.value.terms[0] = obj
}

watch(
    () => data.value,
    (value) => {
      if (!!value) {
        updateDefaultParams()
        tableRef.value?.reload?.();
        if (value.provider === 'COLLECTOR_GATEWAY') {// COLLECTOR_GATEWAY写死
          pointActions.add = true
          pointActions.scan = false
        }
        if (type.value === 'collector') {
          pointActions.add = false
          pointActions.scan = false
          getPointAction()
          updateBatchActions()
        }
      }
    },
    {immediate: true, deep: true},
);

onUnmounted(() => {
  subRef.value?.unsubscribe();
});

const handleTerms = (arr) => {
  return arr.map(i => {
    const obj = {...i};
    if (i.column === 'accessModes') {
      if (i.termType === 'eq') {
        obj.column = 'accessModes$eq'
      }
      if (i.termType === 'not') {
        obj.column = 'accessModes$neq'
        obj.termType = 'neq'
      }
      if (i.termType === 'in') {
        obj.column = 'accessModes$in$any'
      }
      if (i.termType === 'nin') {
        obj.column = 'accessModes$nin$any'
      }
    }
    if (i?.terms?.length) {
      obj.terms = handleTerms(i.terms || [])
    }
    return obj
  })
}


const handleSearch = (e) => {
  params.value = {
    ...e,
    terms: handleTerms(e.terms)
  }
};

const onRefresh = () => {
  tableRef.value?.reload();
}
</script>

<style lang="less" scoped>

</style>
