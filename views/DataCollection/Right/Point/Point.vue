<template>
  <pro-search
      :columns="columns"
      target="search-data-collect-point"
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
                  onSelectNone: onSelectNone,
              }
            : false
        "
    >
      <template #headerLeftRender>
        <a-space v-if="type === 'collector' && data.id">
          <j-permission-button
              v-if="pointActions.add"
              type="primary"
              @click="handleAdd"
              hasPermission="DataCollection:addPoint"
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
              hasPermission="DataCollection:addPoint"
          >
            <template #icon>
              <AIcon type="PlusOutlined"/>
            </template>
            {{ $t('Point.index.400149-1') }}
          </j-permission-button>
          <j-permission-button
              type="primary"
              @click="handleImport"
              hasPermission="DataCollection:importPoint"
          >
            {{ $t('Point.index.400149-2') }}
          </j-permission-button>
          <j-permission-button
              type="primary"
              @click="handleExport"
              hasPermission="DataCollection:exportPoint"
          >
            {{ $t('Point.index.400149-3') }}
          </j-permission-button>
          <BatchDropdown
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
      <template #source="slotProps">
        {{
          propertyValue.get(
              slotProps.id,
          )?.hex || '--'
        }}
      </template>
      <template #updateTime="slotProps">
        {{
          propertyValue.get(slotProps.id)?.timestamp ? dayjs(propertyValue.get(slotProps.id)?.timestamp).format('YYYY-MM-DD HH:mm:ss') : '--'
        }}
      </template>
      <template #interval="slotProps">
        <template v-if="slotProps.accessModes?.length === 1 && (slotProps.accessModes || []).map(i => i.value).includes('write')">
          --
        </template>
        <template v-else>
          {{ (slotProps.configuration?.interval || slotProps.configuration?.interval === 0) ? slotProps.configuration?.interval + 'ms' : '--' }}
        </template>
      </template>
      <template #quantity="slotProps">
        {{ slotProps.configuration?.parameter?.quantity || '--' }}
      </template>
      <template #address="slotProps">
        <template v-if="slotProps.provider === 'MODBUS_TCP'">
          {{slotProps.pointKey || '--'}}
        </template>
        <template v-else>
          {{ slotProps.configuration?.parameter?.address || '--' }}
        </template>
      </template>
      <template #scaleFactor="slotProps">
        {{ slotProps.configuration.scaleFactor || slotProps.configuration?.codec?.configuration.scaleFactor || "--" }}
      </template>
      <template #accessModes="slotProps">
        <a-tag v-for="item in slotProps.accessModes" :key="item.value">{{ item.text }}</a-tag>
      </template>
      <template #runningState="slotProps">
        <a-tag :color="slotProps.runningState.value === 'running' ? 'success' : 'error'">
          {{ slotProps.runningState.value === 'running' ? slotProps.runningState?.text : $t('Channel.index.290640-10') }}
        </a-tag>
      </template>
      <template #description="slotProps">
        <EditInput :data="slotProps" @refresh="onRefresh"/>
      </template>
      <template #actions="slotProps">
        <a-space>
          <j-permission-button
              type="link"
              style="padding: 0"
              @click="handleEdit(slotProps)"
              hasPermission="DataCollection:updatePoint"
          >
            <AIcon type="FormOutlined"/>
          </j-permission-button>
          <j-permission-button
              type="link"
              danger
              :tooltip="{title: $t('Point.index.400149-5')}"
              hasPermission="DataCollection:deletePoint"
              :popConfirm="{
                  title: $t('Point.index.400149-6'),
                  onConfirm: () =>
                      handleDelete(slotProps),
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
      @save="onSave"
  />
  <Import
      v-if="importData.visible"
      :data="importData.current"
      @close="onClose"
  />
  <BatchUpdate
      v-if="batchUpdate.visible"
      :data="batchUpdate.current"
      :provider="data.provider"
      @close="batchUpdate.visible = false"
      @save="onBatchSave"
  />
  <Scan
    v-if="scanData.visible"
    :data="scanData.current"
    @cancel="scanData.visible = false"
    @change="onScanChange"
  />
</template>

<script setup>
import {queryPoint, batchDeletePoint, removePoint, exportPoint} from "@collector/api/data-collect/collector";
import {getProviders} from "@collector/api/data-collect/channel";
import {useI18n} from "vue-i18n";
import {imgUrl} from "@collector/views/DataCollection/data";
import {wsClient} from "@jetlinks-web/core";
import {map} from "rxjs/operators";
import {cloneDeep, omit, throttle} from "lodash-es";
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

const emits = defineEmits(['refresh'])
const {t: $t} = useI18n();
const data = inject('collector-data', ref({}))
const type = inject('collector-type', )
const jsonData = ref();

const initColumns = [
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
  {
    title: $t('Point.index.400149-12'),
    dataIndex: 'runningState',
    key: 'runningState',
    width: 150,
    search: {
      type: 'select',
      options: [
        {
          label: $t('Channel.index.290640-9'),
          value: 'running',
        },
        {
          label: $t('Channel.index.290640-10'),
          value: 'stopped',
        }
      ],
    },
    scopedSlots: true,
  },
  {
    title: $t('Save.DeathArea.4001417-5'),
    dataIndex: 'pointValue',
    key: 'pointValue',
    scopedSlots: true,
    width: 160
  },
  {
    title: $t('DataCollection.Right.Point.Table.476751-1'),
    dataIndex: 'source',
    key: 'source',
    scopedSlots: true,
    ellipsis: true,
    width: 100
  },
  {
    title: $t('DataCollection.Right.Point.Table.476751-2'),
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
    ellipsis: true,
    width: 120,
  },
  {
    title: $t('Point.index.400149-13'),
    dataIndex: 'description',
    key: 'description',
    width: 120,
    search: {
      type: 'string',
    },
    scopedSlots: true,
  },
  {
    title: $t('Channel.index.290640-11'),
    dataIndex: 'actions',
    key: 'actions',
    fixed: 'right',
    width: 120,
    scopedSlots: true,
  },
]
const columns = computed(() => {
  const arr = cloneDeep(initColumns)
  if(!data.value.id || data.value.id === '*') {
    return [...arr, {
      title: $t('Channel.index.290640-4'),
      dataIndex: 'provider',
      key: 'provider',
      hideInTable: true,
      search: {
        type: 'select',
        options: async () => {
          const resp = await getProviders();
          if (resp.success) {
            return resp.result.filter(i => ['BACNetIp', 'snap7', 'MODBUS_TCP', 'OPC_UA'].includes(i.id)).map((i) => {
              return {
                label: i.name,
                value: i.id
              }
            })
          }
        },
      },
    }]
  }
  return arr
})
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
const dataMap = new Map()

const defaultParams = ref({
  sorts: [{name: 'id', order: 'desc'}],
  terms: [],
})

const onRefresh = () => {
  tableRef.value?.reload();
}

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
  dataMap.set(item.id, item)
  _selectedRowKeys.value = [...arr.values()];
};

const onSelectNone = () => {
  _selectedRowKeys.value = [];
  dataMap.clear();
}

const selectAll = (selected, _, changeRows) => {
  if (selected) {
    changeRows.map((i) => {
      if (!_selectedRowKeys.value.includes(i.id)) {
        _selectedRowKeys.value.push(i.id);
      }
      dataMap.set(i.id, i)
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
const handleDelete = (dt) => {
  const response = !dt?.id ? batchDeletePoint(_selectedRowKeys.value) : removePoint(dt.id)
  response.then((res) => {
    if (res.success) {
      _selectedRowKeys.value = [];
      onRefresh()
      onlyMessage($t('Point.index.400149-14'), 'success');
      if(dt?.collectorId){
        emits('refresh', dt.collectorId, 'update')
      } else {
        emits('refresh', data.value?.id, 'update')
      }
    }
  });
  return response;
};

const handleEdit = (dt) => {
  editData.visible = true
  editData.current = omit(dt, 'column')
}

const handleAdd = () => {
  editData.visible = true
  editData.current = {
    collectorId: data.value?.id,
    provider: data.value?.provider,
  };
  editData.visible = true;
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
    downloadFileByUrl(url, $t('Point.index.400149-16', [data.value?.name]), 'xlsx');
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
  const _arr = [...dataSet.values()].map((i) => {
    return dataMap.get(i)
  });
  batchUpdate.current = [..._arr];
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
      permission: 'DataCollection:updatePoint',
      icon: 'FormOutlined',
      selected: {
        onClick: handleBatchUpdate,
      },
    },
    {
      key: 'delete',
      text: $t('Point.index.400149-23'),
      danger: true,
      permission: 'DataCollection:deletePoint',
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
      column: 'collectorId$in-channel-collector',
      value: data.value?.id,
    }
  } else if (type.value === 'collector') {
    obj = {
      column: 'collectorId',
      termType: 'eq',
      value: data.value?.id,
    }
  }
  defaultParams.value.terms[0] = obj
}

const onScanChange = () => {
  scanData.visible = false
  tableRef.value?.reload()
  emits('refresh', data.value?.id, 'update')
}

watch(
    () => data.value,
    (value) => {
      if (!!value) {
        updateDefaultParams()
        onRefresh()
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

const onSave = () => {
  editData.visible = false
  onRefresh()
  if(!editData.current?.id){
    emits('refresh', data.value?.id, 'update')
  }
}

const onBatchSave = () => {
  batchUpdate.visible = false
  onRefresh()
  _selectedRowKeys.value = []
}

const handleSearch = (e) => {
  params.value = {
    ...e,
    terms: handleTerms(e.terms)
  }
}

const onClose = (flag) => {
  importData.visible = false
  if(flag){
    onRefresh()
    emits('refresh', data.value?.id, 'update')
  }
}
</script>

<style lang="less" scoped>

</style>
