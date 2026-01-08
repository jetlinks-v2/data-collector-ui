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
        :defaultParams="{
          sorts: [{name: 'createTime', order: 'desc'}]
        }"
        :params="params"
        style="padding: 0; margin: 0"
        @resizeColumn="onResizeColumn"
        :scroll="{ x: 'max-content' }"
        :rowSelection="
            isCheck
                ? {
                      selectedRowKeys: _selectedRowKeys,
                      onSelect: onSelectChange,
                      onSelectAll: selectAll,
                      onSelectNone: () => (_selectedRowKeys = [])
                  }
                : false
        "
    >
      <!--            <template-->
      <!--                v-for="item in _columns"-->
      <!--                :key="item.dataIndex"-->
      <!--                v-slot:[item.dataIndex]="{ record, index }"-->
      <!--            >-->
      <!--            </template>-->
      <template #headerCell="{ column }">
        <template v-if="['name', 'updateTime', 'interval'].includes(column.key)">
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
        <a-space v-if="type === 'collector' && data.id">
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
              v-if="pointActions.batchAdd"
              type="primary"
              @click="handleBatchAdd"
              :hasPermission="true"
          >
            批量添加
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
          <BatchDropdown
              ref="batchRef"
              v-model:isCheck="isCheck"
              :actions="batchActions"
              @change="onCheckChange"
          />
        </a-space>
      </template>
      <template #headerRightRender>
        <a-space>
          <j-ellipsis>已应用{{ searchCount }}个筛选</j-ellipsis>
          <a-button @click="showSearch = !showSearch">
            <AIcon type="SearchOutlined"/>
            {{ showSearch ? '隐藏搜索' : '显示搜索' }}
          </a-button>
          <a-button @click="columnsConfig.visible = true" v-if="type === 'collector'">
            <AIcon type="SettingOutlined"/>
            列配置
          </a-button>
        </a-space>
      </template>
      <template #name="slotProps">
        <div style="display: flex; align-items: center;gap: 8px; white-space: normal">
          <span style="color: #1677FF;"><AIcon type="EnvironmentFilled"/></span>
          <div class="name" @click="handleView(slotProps)">
            <j-ellipsis>{{ slotProps.name }}</j-ellipsis>
          </div>
          <div style="width: 110px">
            <j-badge-status
                :status="slotProps?.runningState?.value"
                :text="slotProps?.runningState?.text"
                :statusNames="ChannelState"
            />
          </div>
        </div>
      </template>
      <template #value="slotProps">
        <ValueItem :value="propertyValue.get(slotProps.id)" :data="slotProps"/>
      </template>
      <template #updateTime="slotProps">
        {{
          dayjs(slotProps.createTime).format('YYYY-MM-DD HH:mm:ss')
        }}
      </template>
      <template #accessModes="slotProps">
        <a-tag v-for="item in slotProps.accessModes" :key="item.value" :type="item.value">{{ item.text }}</a-tag>
      </template>
      <template #interval="slotProps">
        {{ slotProps.interval }}ms
      </template>
      <template #address="slotProps">
        {{ slotProps.metadata?.address || '--' }}
      </template>
    </j-pro-table>
  </div>
  <ColumnsConfig
      :data="columnsConfig.data"
      :collector="data"
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
      v-if="visible.viewPoint"
      :data="current"
      :collector="data"
      @close="visible.viewPoint = false"
      @refresh="onRefresh"
  />
  <BatchImport
      v-if="visible.import"
      :downloadUrlBuilder="(_type) => exportTemplate(data.provider, _type)"
      @close="visible.import = false"
      @save="onRefresh"
  />
  <BatchUpdate
      v-if="visible.batchUpdate"
      :data="_selectedRows"
      :provider="data.provider"
      @close="visible.batchUpdate = false"
      @save="onRefresh"
  />
  <RenderComponents v-if="jsonData" :value="jsonData"/>
</template>

<script setup>
import {useI18n} from "vue-i18n";
import {
  batchDeletePoint,
  exportPoint,
  exportTemplate,
  queryPoint, savePointBatch
} from "@data-collector-ui/api/data-collect/collector";
import SortsIcon from "./SortsIcon.vue";
import ColumnsConfig from "./ColumnsConfig.vue";
import {baseColumns} from "./columns";
import {downloadFileByUrl, onlyMessage, randomString} from "@jetlinks-web/utils";
import {ChannelState, COLLECTOR_DATA, COLLECTOR_TYPE} from "@data-collector-ui/views/data-collect/data";
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

const {t: $t} = useI18n();
const sortValue = reactive({
  name: 'asc',
  updateTime: 'asc',
  interval: 'asc',
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
const _selectedRowKeys = ref([]);
const _selectedRows = ref([]);
const menuStore = useMenuStore();
const data = inject(COLLECTOR_DATA, ref({}))
const type = inject(COLLECTOR_TYPE, ref('all'))
const pointType = inject('point-type', ref())
const filterValue = inject('filter-value', reactive({
  channel: false,
  collector: false,
  point: false
}))

const subRef = ref();
const propertyValue = ref(new Map());

const visible = reactive({ // 判断按钮显示
  batchAdd: true,
  save: false,
  import: false,
  viewPoint: false,
  batchUpdate: false,
});

const current = ref({})
const pointActions = reactive({
  add: false,
});
const jsonData = ref();

provide("point-actions", pointActions);

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

const onRefreshData = () => {
  isCheck.value = false
  _selectedRowKeys.value = []
  tableRef.value?.reload();
}

const batchActions = [
  {
    key: 'enabled',
    text: '批量启用点位',
    ghost: true,
    type: 'primary',
    icon: 'CheckCircleOutlined',
    selected: {
      popConfirm: {
        title: '确认启用?',
        onConfirm: async () => {
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
            onRefreshData()
            onlyMessage($t('Point.index.400149-14'), 'success');
          }
        },
      },
    }
  },
  {
    key: 'update',
    text: '批量修改点位',
    ghost: true,
    type: 'primary',
    icon: 'EditOutlined',
    selected: {
      onClick: () => {
        visible.batchUpdate = true
      }
    }
  },
  {
    key: 'disable',
    text: '批量禁用点位',
    danger: true,
    icon: 'StopOutlined',
    selected: {
      popConfirm: {
        title: '确认禁用?',
        onConfirm: async () => {
          const arr = _selectedRows.value.map(i => {
            return {
              ...i,
              state: 'disabled'
            }
          })
          const response = await savePointBatch(arr)
          if (response.success) {
            onRefreshData()
            onlyMessage($t('Point.index.400149-14'), 'success');
          }
        },
      },
    },
  },
  {
    key: 'delete',
    text: '批量删除点位',
    danger: true,
    icon: 'DeleteOutlined',
    selected: {
      popConfirm: {
        title: $t('Point.index.400149-6'),
        onConfirm: async () => {
          if (!_selectedRowKeys.value.length) {
            onlyMessage($t('Point.index.400149-15'), 'error');
            return
          }
          const response = await batchDeletePoint(_selectedRowKeys.value)
          if (response.success) {
            onRefreshData()
            onlyMessage($t('Point.index.400149-14'), 'success');
          }
        },
      },
    },
  },
]

const handleSubscribeValue = throttle((payload) => {
  propertyValue.value.set(payload.pointId, payload);
});

const onRefresh = () => {
  tableRef.value?.reload()
  visible.viewPoint = false
  visible.import = false
  visible.save = false
}

const subscribeProperty = (value) => {
  const list = map(value, 'id');
  const channel = data?.value?.channelId || '*'
  const collector = data?.value?.id || '*'
  const id = `collector-${channel}-${collector}-data-${list.join('-')}`;
  const topic = `/collector/${channel}/${collector}/data`;
  subRef.value = wsClient.getWebSocket(id, topic, {
    pointId: list.join(','),
  }).subscribe((res) => {
    //防止刷新过快
    handleSubscribeValue(res.payload);
  });
};

const getDataSource = (p) => {
  const _params = {...p}
  const terms = []
  // 根据左边的搜索来查询数据
  if (type.value === 'all') {
    if (filterValue.point) {
      terms.push({
        column: 'runningState',
        termType: 'not',
        type: 'and',
        value: 'running'
      })
    }
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
        termType: 'termType data-collector',
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
      column: 'runningState',
      termType: pointType.value === 'running' ? 'eq' : 'not',
      type: 'and',
      value: 'running'
    })
  }
  if (!_params.terms?.length) {
    _params.terms = []
  }
  if (terms.length > 0) {
    _params.terms = [..._params.terms, ...terms]
  }
  const sorts = Object.keys(sortValue).map(key => ({
    name: key,
    order: sortValue[key]
  }))
  _params.sorts.push(...sorts)
  return queryPoint(_params).then(resp => {
    subRef.value?.unsubscribe();
    if (resp.success && resp.result.data.length) {
      setTimeout(() => {
        const _array = resp.result.data
        subscribeProperty(_array);
        // _array.forEach((item) => {
        //   item.accessModes?.forEach((i) => {
        //     if (i?.value === 'read') {
        //       console.log(item.id, item, '123');
        //     }
        //   });
        // })
      }, 100)
    }
    return resp
  })
}

const getPointAction = async () => {
  jsonData.value = ''
  jsonData.value = await devGetProtocol(data.value.provider, "pointActions");
};

const onCheckChange = () => {
  _selectedRowKeys.value = [];
};

const onSelectChange = (item, state) => {
  const arr = new Set(_selectedRowKeys.value);
  if (state) {
    arr.add(item.id);
    _selectedRows.value.push(item);
  } else {
    arr.delete(item.id);
    _selectedRows.value = _selectedRows.value.filter(i => i.id !== item.id);
  }
  _selectedRowKeys.value = [...arr.values()];
};

const selectAll = (selected, selectedRows, changeRows) => {
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
    _selectedRows.value = _selectedRows.value.filter(i => !_ids.includes(i.id));
  }
};

const handleSort = (key, value) => {
  sortValue[key] = value
  columnsConfig.key = randomString()
  console.log('排序变化')
}

const handleSearch = (_params) => {
  params.value = _params
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
  const res = await exportPoint(data.value.collectorId, params);
  if (res) {
    const blob = new Blob([res], {type: 'xlsx'});
    const url = URL.createObjectURL(blob);
    downloadFileByUrl(url, $t('Point.index.400149-16', [data.value?.channelName]), 'xlsx');
  }
};

const handleView = (data) => {
  visible.viewPoint = true;
  current.value = cloneDeep(data);
};

watch(
    () => data.value.id,
    (value) => {
      if (value && !!data.value.provider) {
        if (data.value.provider === 'COLLECTOR_GATEWAY') {
          pointActions.add = true
          pointActions.batchAdd = false
        } else {
          pointActions.add = false
          pointActions.batchAdd = true
          getPointAction()
        }
      }
      // 刷新页面, 清空查询参数
      params.value = {}
      // 清空高级搜索
      columnsConfig.key = randomString()
      console.log('data.value.id变化')
    },
    {immediate: true},
);

watch(
    () => pointType.value,
    () => {
      if (!pointTypeRefresh) { // 保证第一次只刷新上面的id变化
        pointTypeRefresh = true
      } else {
        columnsConfig.key = randomString()
        console.log('pointType变化')
      }
    },
    {immediate: true},
)

watch(
    () => filterValue,
    () => {
      columnsConfig.key = randomString()
      console.log('filterValue变化')
    },
    {immediate: true, deep: true},
)

onUnmounted(() => {
  subRef.value?.unsubscribe();
});
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
