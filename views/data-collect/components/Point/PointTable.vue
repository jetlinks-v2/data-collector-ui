<template>
  <div style="display: flex; flex-direction: column; flex: 1; min-height: 0" :key="columnsConfig.key">
    <pro-search
        :columns="columnsConfig.data"
        target="data-collector-point"
        @search="handleSearch"
        style="margin-bottom: 0; padding: 16px 0"
        v-if="showSearch"
    />
    <j-pro-table
        ref="tableRef"
        :columns="columnsConfig.data"
        mode="TABLE"
        :request="getDataSource"
        :params="params"
        :alertShow="!isAllSelected"
        style="padding: 0; margin: 0"
        @resizeColumn="onResizeColumn"
        :scroll="{ x: 'max-content' }"
        :rowSelection="rowSelection"
    >
      <template #headerCell="{ column }">
        <template v-if="['name', 'modifyTime', 'interval'].includes(column.key)">
          <div class="header-cell-title">
            <j-ellipsis>{{ column.title }}</j-ellipsis>
            <a-popover>
              <template #content>
                <div v-for="item in column.sortsList" class="sort-item"
                     :class="{'active': item.value === sortValue[column.key]}" :key="item.value"
                     @click="handleSort(column.key, item.value)">
                  {{ item.text }}
                </div>
              </template>
              <SortsIcon :value="sortValue[column.key]"/>
            </a-popover>
          </div>
        </template>
      </template>
      <template #headerLeftRender>
        <a-space>
          <template v-if="type === 'collector' && data.id">
            <j-permission-button
                v-if="pointActions.add"
                type="primary"
                @click="handleAdd"
                :hasPermission="true"
            >
              <template #icon
              >
                <AIcon type="PlusOutlined"
                />
              </template>
              {{ $t('Point.index.400149-0') }}
            </j-permission-button>
            <j-permission-button
              v-if="pointActions.scan"
              type="primary"
              :hasPermission="true"
              @click="handleScan"
            >
              扫描点位
            </j-permission-button>
            <j-permission-button
                v-if="pointActions.batchAdd"
                type="primary"
                @click="handleBatchAdd"
                :hasPermission="true"
            >
              {{ $t('DataCollect.index.400151-12') }}
            </j-permission-button>
            <j-permission-button
                type="primary"
                @click="handleImport"
                :hasPermission="true"
            >
              {{ $t('Point.index.400149-2') }}
            </j-permission-button>
            <j-permission-button
                type="primary"
                @click="handleExport"
                :hasPermission="true"
            >
              {{ $t('Point.index.400149-3') }}
            </j-permission-button>
          </template>
          <BatchDropdown
              ref="batchRef"
              v-model:isCheck="isCheck"
              :actions="batchActions"
              @change="onCheckChange"
          >
          </BatchDropdown>
          <a-button v-if="isCheck" size="small" type="link" @click="toggleSelectAll">
            <AIcon type="PartitionOutlined"/>
            {{ isAllSelected ? $t('PointTable.index.40014110-0') : $t('PointTable.index.40014110-1') }}
          </a-button>
        </a-space>
      </template>
      <template #headerRightRender>
        <a-space>
          <j-ellipsis>{{ $t('DataCollect.index.400151-13', [searchCount]) }}</j-ellipsis>
          <a-button @click="showSearch = !showSearch">
            <AIcon type="SearchOutlined"/>
            {{ showSearch ? $t('DataCollect.index.400151-14') : $t('DataCollect.index.400151-15') }}
          </a-button>
          <a-button @click="columnsConfig.visible = true">
            <AIcon type="SettingOutlined"/>
            {{ $t('DataCollect.index.400151-16') }}
          </a-button>
        </a-space>
      </template>
      <template #name="slotProps">
        <div style="display: flex; align-items: center;gap: 8px; white-space: normal">
          <span style="color: #1677FF;"><AIcon type="EnvironmentFilled"/></span>
          <div class="name" @click="handleView(slotProps)">
            <j-ellipsis>{{ slotProps.name }}</j-ellipsis>
          </div>
          <div style="width: 60px">
            <j-badge-status
                :status="slotProps?.state?.value === 'disabled' ? slotProps?.state?.value : slotProps?.runningState?.value"
                :text="slotProps?.state?.value === 'disabled' ? slotProps?.state?.text : slotProps?.runningState?.text"
                :statusNames="ChannelState"
            />
          </div>
        </div>
      </template>
      <template #value="slotProps">
        <ValueItem :value="propertyValue.get(slotProps.id)" :data="slotProps"/>
      </template>
      <template #modifyTime="slotProps">
        {{
          dayjs(slotProps.modifyTime).format('YYYY-MM-DD HH:mm:ss')
        }}
      </template>
      <template #accessModes="slotProps">
        <a-tag v-for="item in slotProps.accessModes" :key="item.value" :type="item.value">{{ item.text }}</a-tag>
      </template>
      <template #interval="slotProps">
        {{ slotProps.interval }}ms
      </template>
      <template #address="slotProps">
        {{ slotProps?.address || '--' }}
      </template>
      <template #description="slotProps">
        <j-ellipsis style="max-width: 200px;white-space: normal;">{{ slotProps.description || '--' }}</j-ellipsis>
      </template>
    </j-pro-table>
  </div>
  <ColumnsConfig
      :data="columnsConfig.data"
      :collectorData="data"
      v-if="columnsConfig.visible"
      @save="onSaveColumnsConfig"
      @close="columnsConfig.visible = false"
  />
  <Save
      v-if="visible.save"
      :data="current"
      :collector="data"
      @save="onRefresh"
      @close="visible.save = false"
  />
  <Detail
      v-if="_visible.point"
      :data="current"
      :collector="data"
      @close="_visible.point = false"
      @refresh="onDetailRefresh"
  />
  <Import
      v-if="visible.import"
      :downloadUrlBuilder="(_type) => exportTemplate(data.provider, _type)"
      :request="() => pointImport(data.id, data.provider)"
      @close="visible.import = false"
      @save="onRefresh"
  />
  <BatchUpdate
      v-if="visible.batchUpdate"
      :data="_selectedRows"
      :provider="data.provider"
      :isAllSelected="isAllSelected"
      :getBatchParams="getBatchParams"
      @close="visible.batchUpdate = false"
      @save="onRefresh"
  />
  <RenderComponents v-if="jsonData" :value="jsonData"/>
</template>

<script setup>
import {useI18n} from "vue-i18n";
import {
  batchDeletePoint,
  deletePoints,
  disablePoints,
  exportPoint,
  exportTemplate,
  queryChannelNoPaging,
  queryPoint, savePointBatch,
  pointImport,
  enablePoints,
  queryCodecProvider
} from "@data-collector-ui/api/data-collect/collector";
import SortsIcon from "./SortsIcon.vue";
import ColumnsConfig from "./ColumnsConfig/index.vue";
import {baseColumns} from "./columns";
import {downloadFileByUrl, onlyMessage, randomString} from "@jetlinks-web/utils";
import {
  ChannelState,
  COLLECTOR_DATA,
  COLLECTOR_TYPE,
  REFRESH_HANDLER,
} from "@data-collector-ui/views/data-collect/data";
import dayjs from "dayjs";
import {cloneDeep, map} from "lodash-es";
import {wsClient} from "@jetlinks-web/core";
import {throttle} from "lodash-es";
import Save from "./Save/index.vue";
import Detail from "./Detail/index.vue";
import {devGetProtocol} from "@data-collector-ui/utils/utils";
import ValueItem from './components/ValueItem.vue'
import RenderComponents from "@data-collector-ui/components/RenderComponents/RenderComponents.vue";
import {useMenuStore} from "@jetlinks-web-core/store";
import BatchUpdate from "./components/BatchUpdate.vue";
import Import from "@data-collector-ui/views/data-collect/components/Import/index.vue"

const {t: $t} = useI18n();
const sortValue = reactive({
  name: undefined,
  modifyTime: undefined,
  interval: undefined,
})
const params = ref({})
const showSearch = ref(false)
const tableRef = ref()
let pointTypeRefresh = false

const columnsConfig = reactive({
  visible: false,
  data: [...baseColumns],
  key: randomString()
})
const isCheck = ref(false);
const isAllSelected = ref(false);
const _selectedRowKeys = ref([]);
const _selectedRows = ref([]);
const currentPageRows = ref([]);
const menuStore = useMenuStore();
const data = inject(COLLECTOR_DATA, ref({}))
const type = inject(COLLECTOR_TYPE, ref('all'))
const pointType = inject('point-type', ref())
const batchRef = ref()
const filterValue = inject('filter-value', reactive({
  channel: false,
  collector: false,
  point: false
}))
const refreshHandler = inject(REFRESH_HANDLER)
const subRef = ref();
const propertyValue = ref(new Map());

const visible = reactive({ // 判断按钮显示
  batchAdd: false,
  save: false,
  import: false,
  batchUpdate: false,
});
const _visible = inject('detail-visible')

const current = ref({})
const pointActions = reactive({
  add: false,
  scan: false,
  batchAdd: false,
});
const jsonData = ref();
const scanSetting = ref({
  columns: [],
  selectedData: [],
  handleData: undefined,
})

const codecList = ref([])

provide("point-actions", pointActions);
provide('plugin-scan-point', scanSetting);
provide('collector-data', data);
provide('codec-list', codecList)

const searchCount = computed(() => {
  // 统计filterValue
  const _filterValue = Object.keys(filterValue).filter(i => filterValue[i])
  let count = _filterValue.length || 0;
  if (pointType.value !== 'total') {
    count++
  }
  const _terms = params.value.terms || [];
  _terms.map(i => {
    const __terms = i.terms || [];
    count += __terms.length
  })
  return count
})

const onResizeColumn = (w, col) => {
  // 必须替换列对象才能保持响应性
  const target = columnsConfig.data.find(c => c.key === col.key)
  if (target) {
    target.width = w
  }
}

const rowSelection = computed(() => {
  if (!isCheck.value) {
    return false
  }
  return {
    selectedRowKeys: _selectedRowKeys.value,
    onSelect: onSelectChange,
    onSelectAll: selectAll,
    onSelectNone: onSelectNone,
    getCheckboxProps: () => ({
      disabled: isAllSelected.value,
    }),
    getTitleCheckboxProps: () => ({
      disabled: isAllSelected.value,
    }),
  }
})

const syncSelectAllPageSelection = () => {
  if (!isAllSelected.value) {
    return
  }
  _selectedRowKeys.value = currentPageRows.value.map(item => item.id)
  _selectedRows.value = [...currentPageRows.value]
}

const clearSelectionState = () => {
  isAllSelected.value = false
  _selectedRowKeys.value = []
  _selectedRows.value = []
}

const toggleSelectAll = () => {
  isAllSelected.value = !isAllSelected.value
  if (isAllSelected.value) {
    syncSelectAllPageSelection()
  } else {
    _selectedRowKeys.value = []
    _selectedRows.value = []
  }
}

const handleBatchActionWithSelectAll = async (actionKey, handler) => {
  if (isAllSelected.value) {
    // TODO: 全选所有场景下需要调用单独的批量接口，按当前筛选条件处理全部点位。
    switch(actionKey) {
      case 'enable':
        enablePointsBatch();
        break;
      case 'disable':
        disablePointsBatch();
        break;
      case 'delete':
        deletePointsBatch();
        break;
    }
    return
  }
  return handler()
}

const getBatchParams = () => {
  const terms = params.value?.terms || []
  return type.value === 'collector' && data.value.id ? {
    ...params.value,
    terms: [
      ...terms,
      {
        column: 'collectorId',
        value: data.value?.id
      }
    ]
  } : params.value
}

const enablePointsBatch = async () => {
  const res = await enablePoints(getBatchParams())
  if(res.success) {
    onlyMessage($t('Point.index.400149-14'));
    onRefresh(true);
  }
}

const disablePointsBatch = async () => {
  const res = await disablePoints(getBatchParams())
  if(res.success) {
    onlyMessage($t('Point.index.400149-14'));
    onRefresh(true);
  }
}

const deletePointsBatch = async () => {
  const res = await deletePoints(getBatchParams())
  if(res.success) {
    onlyMessage($t('Point.index.400149-14'));
    onRefresh(true);
  }
}

const batchActions = computed(() => {
  const arr = []
  const flag = type.value === 'collector' && !!data.value.id;
  if (flag) {
    arr.push({
      key: 'update',
      text: $t('DataCollect.index.400151-19'),
      ghost: true,
      type: 'primary',
      icon: 'EditOutlined',
      selected: {
        onClick: () => {
          visible.batchUpdate = true
        }
      }
    },)
  }
  return [
    ...arr,
    {
      key: 'enabled',
      text: $t('DataCollect.index.400151-17'),
      ghost: true,
      type: 'primary',
      icon: 'CheckCircleOutlined',
      selected: {
        popConfirm: {
          title: $t('DataCollect.index.400151-18'),
          onConfirm: async () => handleBatchActionWithSelectAll('enable', async () => {
            if (!_selectedRowKeys.value.length) {
              onlyMessage($t('Point.index.400149-15'), 'error');
              return
            }
            const arr = _selectedRows.value.map(i => {
              return {
                ...i,
                state: 'enabled'
              }
            })
            const response = await savePointBatch(arr)
            if (response.success) {
              onRefresh(true)
              onlyMessage($t('Point.index.400149-14'), 'success');
            }
          }),
        },
      }
    },
    {
      key: 'disable',
      text: $t('DataCollect.index.400151-20'),
      danger: true,
      icon: 'StopOutlined',
      selected: {
        popConfirm: {
          title: $t('DataCollect.index.400151-21'),
          onConfirm: async () => handleBatchActionWithSelectAll('disable', async () => {
            if (!_selectedRowKeys.value.length) {
              onlyMessage($t('Point.index.400149-15'), 'error');
              return
            }
            const arr = _selectedRows.value.map(i => {
              return {
                ...i,
                state: 'disabled'
              }
            })
            const response = await savePointBatch(arr)
            if (response.success) {
              onRefresh(true)
              onlyMessage($t('Point.index.400149-14'), 'success');
            }
          }),
        },
      },
    },
    {
      key: 'delete',
      text: $t('DataCollect.index.400151-22'),
      danger: true,
      icon: 'DeleteOutlined',
      selected: {
        popConfirm: {
          title: $t('Point.index.400149-6'),
          onConfirm: async () => handleBatchActionWithSelectAll('delete', async () => {
            if (!_selectedRowKeys.value.length) {
              onlyMessage($t('Point.index.400149-15'), 'error');
              return
            }
            const response = await batchDeletePoint(_selectedRowKeys.value)
            if (response.success) {
              onRefresh(true)
              onlyMessage($t('Point.index.400149-14'), 'success');
            }
          }),
        },
      },
    },
  ]
})

const handleSubscribeValue = throttle((payload) => {
  propertyValue.value.set(payload.pointId, payload);
});

const onRefresh = (flag = false) => {
  _visible.point = false
  visible.import = false
  visible.save = false
  visible.batchUpdate = false
  if (flag) {
    batchRef.value?.reload?.()
    clearSelectionState()
  }
  refreshHandler?.refreshAll?.()
}

const onDetailRefresh = () => {
  refreshHandler?.refreshAll?.()
}

const subscribeProperty = (value) => {
  const list = map(value, 'id');
  const channel = type.value === 'all' ? ' * ' : (type.value === 'channel' ? data?.value?.id : data?.value?.channelId)
  const collector = type.value === 'all' ? '*' : (type.value === 'collector' ? data?.value?.id : '*')
  const id = `collector-${channel || '*'}-${collector || '*'}-data-${list.join('-')}`;
  const topic = `/collector/${channel || '*'}/${collector || '*'}/data`;
  subRef.value = wsClient.getWebSocket(id, topic, {
    pointId: list.join(','),
  }).subscribe((res) => {
    //防止刷新过快
    handleSubscribeValue(res.payload);
  });
};

const buildAllChannelTerms = async () => {
  const channelResp = await queryChannelNoPaging();
  const channelIds = channelResp?.result?.map((item) => item.id).filter(Boolean) || [];

  if (!channelIds.length) {
    return null;
  }

  return {
    column: 'channelId',
    termType: 'in',
    type: 'and',
    value: channelIds,
  };
};

const getDataSource = async (p) => {
  const _params = {...p}
  const terms = []
  if (filterValue.point) {
    terms.push({
      column: 'runningState',
      termType: 'not',
      type: 'and',
      value: 'running'
    })
  }
  // 根据左边的搜索来查询数据
  if (type.value === 'all') {
    // 点击全部时先限定已有通道范围，避免无通道时继续查询点位转换接口。
    const channelTerm = await buildAllChannelTerms();
    if (!channelTerm) {
      currentPageRows.value = [];
      subRef.value?.unsubscribe();
      syncSelectAllPageSelection();
      return {
        success: true,
        result: {
          data: [],
          total: 0,
        },
      };
    }
    terms.push(channelTerm);
    if (filterValue.channel) {
      terms.push({
        column: 'channelId',
        termType: 'data-collector-channel',
        type: 'and',
        value: [
          {
            "column": "runningState",
            "value": 'stopped'
          },
          {
            "column": "state",
            "value": 'disabled'
          }
        ]
      })
    }
    if (filterValue.collector) {
      terms.push({
        column: 'collectorId',
        termType: 'data-collector',
        type: 'and',
        value: [
          {
            "column": "state",
            termType: 'in',
            "value": [
              "disabled",
              "stopped"
            ]
          }
        ]
      })
    }
  } else {
    terms.push({
      column: type.value === 'channel' ? 'channelId' : 'collectorId',
      type: 'and',
      termType: 'eq',
      value: data.value.id
    })
  }
  if (['running', 'stopped'].includes(pointType.value)) {
    terms.push({
      // column: 'runningState',
      // termType: pointType.value === 'running' ? 'eq' : 'not',
      // type: 'and',
      // value: 'running'
      column: 'state',
      termType: pointType.value === 'running' ? 'eq' : 'not',
      type: 'and',
      value: 'enabled'
    })
  }
  if (!_params.terms?.length) {
    _params.terms = []
  }
  if (terms.length > 0) {
    _params.terms = [..._params.terms, ...terms]
  }
  const sorts = Object.keys(sortValue).filter(i => sortValue[i]).map(key => ({
    name: key,
    order: sortValue[key]
  }))
  if (sorts.length) {
    _params.sorts = sorts
  } else {
    _params.sorts = [{name: 'createTime', order: 'desc'}]
  }
  return queryPoint(_params).then(resp => {
    subRef.value?.unsubscribe();
    currentPageRows.value = resp?.result?.data || []
    syncSelectAllPageSelection()
    if (resp.success && resp.result.data.length) {
      setTimeout(() => {
        const _array = resp.result.data
        subscribeProperty(_array);
      }, 100)
    }
    return resp
  })
}

const getPointAction = async () => {
  jsonData.value = ''
  jsonData.value = await devGetProtocol(data.value.provider, "pointActions");
};

const onCheckChange = (checked) => {
  if (!checked) {
    clearSelectionState()
    return
  }
  _selectedRowKeys.value = [];
  _selectedRows.value = [];
};

const onSelectChange = (item, state) => {
  if (isAllSelected.value) {
    return
  }
  const arr = new Set(_selectedRowKeys.value);
  if (state) {
    arr.add(item.id);
    _selectedRows.value.push(item);
  } else {
    arr.delete(item.id);
  }
  _selectedRowKeys.value = [...arr.values()];
  _selectedRows.value = _selectedRows.value.filter(i => _selectedRowKeys.value.includes(i.id))
};

const onSelectNone = () => {
  clearSelectionState()
}

const selectAll = (selected, selectedRows, changeRows) => {
  if (isAllSelected.value) {
    return
  }
  if (selected) {
    changeRows.map((i) => {
      if (!_selectedRowKeys.value.includes(i.id)) {
        _selectedRowKeys.value.push(i.id);
        _selectedRows.value.push(i);
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
  _selectedRows.value = _selectedRows.value.filter(i => _selectedRowKeys.value.includes(i.id))
};

const handleSort = (key, value) => {
  Object.keys(sortValue).map(i => {
    if (i === key && sortValue[i] !== value) {
      sortValue[i] = value
    } else {
      sortValue[i] = undefined
    }
  })
  columnsConfig.key = randomString()
  // Sort change
}

const isEmptyTerms = (terms) => {
  if (!Array.isArray(terms) || !terms.length) {
    return true
  }

  return terms.every(item => {
    if (!item || typeof item !== 'object') {
      return true
    }

    if (Array.isArray(item.terms)) {
      return isEmptyTerms(item.terms)
    }

    return !item.column && !item.termType && !item.type && item.value === undefined
  })
}

const handleSearch = (_params) => {
  params.value = isEmptyTerms(_params?.terms) ? {} : _params
}

const onSaveColumnsConfig = (dt) => {
  columnsConfig.data = dt
  columnsConfig.key = randomString()
  columnsConfig.visible = false
}

const handleAdd = () => {
  if (data.value?.provider === 'COLLECTOR_GATEWAY') {
    current.value = {
      collectorId: data.value?.id,
      provider: data.value?.provider || 'COLLECTOR_GATEWAY',
    };
    visible.saveModBus = true;
  } else {
    if (data.value?.provider === 'snap7') {
      current.value = {
        collectorId: data.value?.id,
        provider: data.value?.provider,
        deviceType: data.value?.configuration.type,
      };
    } else if (data.value?.provider === 'iec104') {
      current.value = {
        collectorId: data.value?.id,
        provider: data.value?.provider,
      };
    } else {
      current.value = {
        collectorId: data.value?.id,
        provider: data.value?.provider || 'MODBUS_TCP',
      };
    }
    visible.save = true;
  }
};

const handleScan = () => {
  menuStore.jumpPage('data-collect/Scan', {params: {id: data.value?.id}});
};

const handleBatchAdd = () => {
  menuStore.jumpPage('data-collect/BatchAdd', {params: {id: data.value?.id}});
};
const handleImport = () => {
  visible.import = true;
  current.value = cloneDeep(data.value);
};
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

const handleView = (data) => {
  _visible.point = true;
  _visible.channel = false;
  _visible.collector = false;
  current.value = cloneDeep(data);
};

const refresh = () => {
  columnsConfig.key = randomString()
  clearSelectionState();
  batchRef.value?.reload?.()
}

const queryCodecList = async () => {
  const res = await queryCodecProvider()
  if(res.success) {
    codecList.value = res.result.map(item => {
      return {
        label: item.name,
        value: item.id,
        ...item
      }
    })
  }
}

watch(
    () => data.value.id,
    (value) => {
      if (value && !!data.value.provider) {
        if (data.value.provider === 'COLLECTOR_GATEWAY') {
          pointActions.add = true
          pointActions.scan = false
          pointActions.batchAdd = false
        } else {
          pointActions.add = false
          pointActions.scan = false
          pointActions.batchAdd = false
          getPointAction()
        }
      }
      // 刷新页面, 清空查询参数
      params.value = {}
      // 清空高级搜索
      refresh()
      console.log('data.value.id changed')
    },
    {immediate: true},
);

watch(
    () => pointType.value,
    () => {
      if (!pointTypeRefresh) { // 保证第一次只刷新上面的id变化
        pointTypeRefresh = true
      } else {
        refresh()
        console.log('pointType changed')
      }
    },
    {immediate: true},
)

watch(
    () => filterValue,
    () => {
      columnsConfig.key = randomString()
      console.log('filterValue changed')
    },
    {immediate: true, deep: true},
)

onMounted(() => {
  queryCodecList()
})

onUnmounted(() => {
  subRef.value?.unsubscribe();
});

defineExpose({
  loadData: () => {
    tableRef.value?.reload()
  }
})
</script>

<style lang="less" scoped>
.header-cell-title {
  display: flex;
  align-items: center;
  gap: 4px;
  justify-content: space-between;
  white-space: normal;

  .value {
    flex: 1;
    min-width: 0;
  }
}

.name {
  cursor: pointer;
  flex: 1;
  min-width: 0;
  //&:hover {
  color: @primary-color;
  //}
}

.sort-item {
  cursor: pointer;

  &:hover {
    color: @primary-color;
  }

  &.active {
    color: @primary-color;
  }
}
</style>
