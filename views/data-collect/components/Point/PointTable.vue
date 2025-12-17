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
            sorts: [{ name: 'createTime', order: 'desc' }],
        }"
        :params="params"
        style="padding: 0; margin: 0"
        @resizeColumn="onResizeColumn"
        :scroll="{ x: 1000 }"
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
          <span>已应用2个筛选</span>
          <a-button @click="showSearch = !showSearch">
            <AIcon type="SearchOutlined"/>
            {{ showSearch ? '隐藏搜索' : '显示搜索' }}
          </a-button>
          <a-button @click="columnsConfig.visible = true">
            <AIcon type="SettingOutlined"/>
            列配置
          </a-button>
        </a-space>
      </template>
      <template #name="slotProps">
        <div style="display: flex; align-items: center;gap: 16px; white-space: normal">
          <img style="width: 30px" :src="ImageMap.get(slotProps.provider) || ImageMap.get('protocol')"/>
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
        <div class="header-cell-title">
          <div class="value">
            <j-ellipsis>123(int8)</j-ellipsis>
            <j-ellipsis>48390285940</j-ellipsis>
          </div>
          <div class="actions">
            <a
                v-if="getAccessModes(slotProps).includes('write')"
                @click.stop="clickEdit(slotProps)"
            >
              <AIcon type="EditOutlined"/>
            </a>
            <a
                v-if="getAccessModes(slotProps).includes('read')"
                @click.stop="clickRead(slotProps)"
            >
              <AIcon type="RedoOutlined"/>
            </a>
          </div>
        </div>
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
    </j-pro-table>
  </div>
  <ColumnsConfig
      :data="columnsConfig.data"
      v-if="columnsConfig.visible"
      @save="onSaveColumnsConfig"
      @close="columnsConfig.visible = false"
  />
  <Save
      v-if="visible.save"
      :data="current"
      :collector="data"
      @close="visible.save = false"
  />
  <Detail
      v-if="visible.viewPoint"
      :data="current"
      :collector="data"
      @close="visible.viewPoint = false"
  />
  <RenderComponents :key="data.id + (data.state?.value || data.state)"
                    v-if="data.id && data.provider !== 'COLLECTOR_GATEWAY' && jsonData" :value="jsonData"/>
</template>

<script setup>
import {useI18n} from "vue-i18n";
import {queryPoint} from "@data-collector-ui/api/data-collect/collector";
import SortsIcon from "./SortsIcon.vue";
import ColumnsConfig from "./ColumnsConfig.vue";
import {baseColumns} from "./columns";
import {randomString} from "@jetlinks-web/utils";
import {ChannelState, COLLECTOR_DATA, COLLECTOR_TYPE, pointImgUrl} from "@data-collector-ui/views/data-collect/data";
import dayjs from "dayjs";
import {cloneDeep, map} from "lodash-es";
import {wsClient} from "@jetlinks-web/core";
import {throttle} from "lodash-es";
import Save from "./Save/index.vue";
import Detail from "./Detail/index.vue";
import {devGetProtocol} from "@data-collector-ui/utils/utils";
import {getAccessModes} from "@data-collector-ui/views/data-collect/components/Point/data";
import RenderComponents from "@data-collector-ui/components/RenderComponents/RenderComponents.vue";
import {useMenuStore} from "@jetlinks-web-core/store";

const params = ref({})
const showSearch = ref(false)
const {t: $t} = useI18n();
const sortValue = reactive({
  name: 'asc',
  updateTime: 'asc',
  interval: 'asc',
})

const columnsConfig = reactive({
  visible: false,
  data: [...baseColumns],
  key: randomString()
})
const isCheck = ref(false);
const _selectedRowKeys = ref([]);
const menuStore = useMenuStore();
const data = inject(COLLECTOR_DATA, ref({}))
const type = inject(COLLECTOR_TYPE, ref('all'))

const ImageMap = new Map();
ImageMap.set('OPC_UA', pointImgUrl.opcImage);
ImageMap.set('MODBUS_TCP', pointImgUrl.modbusImage);
ImageMap.set('snap7', pointImgUrl.s7Image);
ImageMap.set('iec104', pointImgUrl.iecImage);
ImageMap.set('COLLECTOR_GATEWAY', pointImgUrl.gatewayImage);
ImageMap.set('protocol', pointImgUrl.protocolImage);

const subRef = ref();
const propertyValue = ref(new Map());

const visible = reactive({ // 判断按钮显示
  batchAdd: true,
  save: false,
  import: false,
  writePoint: false,
  viewPoint: false
});

const current = ref({})
const pointActions = reactive({
  add: false,
});
const jsonData = ref();

provide("point-actions", pointActions);

const onResizeColumn = (w, col) => {
  // 必须替换列对象才能保持响应性
  const target = columnsConfig.data.find(c => c.key === col.key)
  if (target) {
    target.width = w
  }
}

const batchActions = [
  {
    key: 'enabled',
    text: '批量启用点位',
    ghost: true,
    type: 'primary',
    permission: 'device/Instance:action',
    icon: 'CheckCircleOutlined',
    // popConfirm: {
    //   title: $t('Instance.index.133466-33'),
    //   onConfirm: activeAllDevice,
    // },
  },
  {
    key: 'update',
    text: '批量修改点位',
    ghost: true,
    type: 'primary',
    permission: 'device/Instance:action',
    icon: 'EditOutlined',
    // popConfirm: {
    //   title: $t('Instance.index.133466-33'),
    //   onConfirm: activeAllDevice,
    // },
  },
  {
    key: 'disable',
    text: '批量禁用点位',
    danger: true,
    icon: 'StopOutlined',
    permission: 'device/Instance:action',
    selected: {
      popConfirm: {
        // title: $t('Instance.index.133466-38'),
        // onConfirm: disabledSelectedDevice,
      },
    },
  },
  {
    key: 'delete',
    text: '批量删除点位',
    danger: true,
    permission: 'device/Instance:delete',
    icon: 'DeleteOutlined',
    selected: {
      popConfirm: {
        // title: $t('Instance.index.133466-36'),
        // onConfirm: delSelectedDevice,
      },
    },
  },
]

const handleSubscribeValue = throttle((payload) => {
  propertyValue.value.set(payload.pointId, payload);
});
const subscribeProperty = (value) => {
  const list = map(value, 'id');
  const channel = data?.value?.channelId || '*'
  const collector = data?.value?.id || '*'
  const id = `collector-${channel}-${collector}-data-${list.join('-')}`;
  const topic = `/collector/${channel}/${collector}/data`;
  subRef.value = wsClient.getWebSocket(id, topic, {
    pointId: list.join(','),
  })?.pipe(map((res) => res.payload)).subscribe((payload) => {
    //防止刷新过快
    handleSubscribeValue(payload);
  });
};

const getDataSource = (p) => {
  return queryPoint(p).then(resp => {
    subRef.value?.unsubscribe();
    if (resp.success && resp.result.data.length) {
      setTimeout(() => {
        const _array = resp.result.data
        subscribeProperty(_array);
        // _array.forEach((item) => {
        //   item.accessModes?.forEach((i) => {
        //     if (i?.value === 'read') {
        //       ReadIdMap.set(item.id, item);
        //     }
        //   });
        // })
      }, 100)
    }
    // cancelSelect();
    return resp
  })
}

const getPointAction = async () => {
  jsonData.value = ''
  jsonData.value = await devGetProtocol('MODBUS_TCP', "pointActions");
};

const onCheckChange = () => {
  _selectedRowKeys.value = [];
};

const onSelectChange = (item, state) => {
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

const handleSort = (key, value) => {
  sortValue[key] = value
  const sorts = Object.keys(sortValue).map(key => ({
    name: key,
    order: sortValue[key]
  }))
  console.log(sorts, 'sortValue')
}

const handleSearch = (params) => {
  console.log(params)
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
  // const params =
  //     data.value?.provider === 'COLLECTOR_GATEWAY'
  //         ? data.value?.configuration?.collectorProvider
  //         :data.value?.provider;
  // const res: any = await exportPoint(data.value.collectorId, params);
  // if (res) {
  //   const blob = new Blob([res], {type: 'xlsx'});
  //   const url = URL.createObjectURL(blob);
  //   downloadFileByUrl(url, $t('Point.index.400149-16', [data.value?.channelName]), 'xlsx');
  // }
};

const handleView = (data) => {
  visible.viewPoint = true;
  current.value = cloneDeep(data);
};
const clickEdit = async (data) => {
  visible.writePoint = true;
  current.value = cloneDeep(data);
};

// ReadIdMap
const clickRead = async (data) => {
  // const res: any = await readPoint(data?.collectorId, [data?.id]);
  // if (res.status === 200) {
  //   const readData: any = res.result[0];
  //   const _data = ReadIdMap.get(data?.id);
  //   ReadIdMap.set(data?.id, {..._data, ...readData});
  //   cancelSelect();
  //   tableRef.value?.reload();
  //   onlyMessage($t('Point.index.400149-14'), 'success');
  // }
};

watch(
    () => data.value,
    (value) => {
      if (value.id && !!value.provider) {
        // COLLECTOR_GATEWAY写死
        if (value.provider === 'COLLECTOR_GATEWAY') {
          pointActions.add = true
          pointActions.batchAdd = false
        } else {
          pointActions.add = false
          pointActions.batchAdd = true
          getPointAction()
        }
      }
    },
    {immediate: true, deep: true},
);

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

  .actions {
    display: none;
  }

  &:hover {
    .actions {
      display: flex;
      cursor: pointer;
      gap: 8px;
      width: 40px;
    }
  }
}

.name {
  cursor: pointer;

  &:hover {
    color: @primary-color;
  }
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
