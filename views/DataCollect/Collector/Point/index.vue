<template>
  <a-spin :spinning="spinning">
    <div style="display: flex; flex-direction: column;height: 100%">
      <pro-search
          :columns="columns"
          target="search-point"
          @search="handleSearch"
          style="padding-top: 0; margin-bottom: 0"
      />
      <div style="flex: 1; min-height: 0">
        <j-pro-table
            ref="tableRef"
            mode="CARD"
            :columns="columns"
            :gridColumn="2"
            :gridColumns="[1, 2]"
            :request="getDataSource"
            :defaultParams="defaultParams"
            :rowSelection="
                      isCheck
                          ? {
                                selectedRowKeys: _selectedRowKeys,
                                onSelectNone: () => (_selectedRowKeys = []),
                            }
                          : false
                  "
            :params="params"
        >
          <template #headerLeftRender>
            <a-space>
              <j-permission-button
                  v-if="pointActions.add"
                  type="primary"
                  @click="handleAdd"
                  hasPermission="DataCollect/Collector:add"
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
                  @click="handleScan"
                  hasPermission="DataCollect/Collector:add"
              >
                <template #icon
                >
                  <AIcon type="PlusOutlined"
                  />
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
            <div v-if="isCheck" style="margin-top: 15px">
              <a-checkbox
                  v-model:checked="checkAll"
                  @change="onCheckAllChange"
              >{{ $t('Point.index.400149-4') }}
              </a-checkbox
              >
            </div>
          </template>
          <template #card="slotProps">
            <PointCardBox
                :showStatus="true"
                :value="slotProps"
                @click="handleClick"
                :active="_selectedRowKeys.includes(slotProps.id)"
                class="card-box"
                :status="slotProps?.runningState?.value"
                :statusText="slotProps?.runningState?.text"
                :statusNames="
                              Object.fromEntries(colorMap.entries())
                          "
            >
              <template #title>
                <slot name="title">
                  <j-ellipsis style="width: calc(100% - 10px)">
                    <div class="card-box-title">
                      {{ slotProps.name }}
                    </div>
                  </j-ellipsis>
                </slot>
              </template>
              <template #action>
                <div class="card-box-action">
                  <j-permission-button
                      type="text"
                      :tooltip="{
                                          title: $t('Point.index.400149-5'),
                                      }"
                      hasPermission="DataCollect/Collector:delete"
                      :popConfirm="{
                                          title: $t('Point.index.400149-6'),
                                          onConfirm: () =>
                                              handleDelete(slotProps.id),
                                      }"
                  >
                    <a
                        style="
                                              font-size: 20px;
                                              margin-top: -10px;
                                          "
                    >
                      <AIcon type="DeleteOutlined"
                      />
                    </a>
                  </j-permission-button>

                  <j-permission-button
                      type="text"
                      @click="handleEdit(slotProps)"
                      hasPermission="DataCollect/Collector:update"
                  >
                    <a style="font-size: 20px"
                    >
                      <AIcon type="FormOutlined"
                      />
                    </a>
                  </j-permission-button>
                </div>
              </template>
              <template #img>
                <img :src="ImageMap.get(slotProps.provider)"/>
              </template>
              <template #content>
                <div class="card-box-content">
                  <div class="card-box-content-left">
                    <div class="card-box-content-left-1">
                      <div
                          class="ard-box-content-left-1-title"
                          v-if="
                                                  propertyValue.has(
                                                      slotProps.id,
                                                  )
                                              "
                      >
                        <j-ellipsis
                            style="max-width: 150px"
                        >
                          {{
                            getParseData(slotProps)
                          }}
                        </j-ellipsis>
                      </div>
                      <div
                          class="ard-box-content-left-1-title"
                          v-else
                      >
                        <j-ellipsis
                            style="max-width: 150px"
                        >
                          {{
                            getReadParseData(
                                slotProps,
                            )
                          }}
                        </j-ellipsis>
                      </div>
                      <a
                          v-if="
                                                  getAccessModes(
                                                      slotProps,
                                                  ).includes('write')
                                              "
                          @click.stop="
                                                  clickEdit(slotProps)
                                              "
                      >
                        <AIcon type="EditOutlined"
                        />
                      </a>
                      <a
                          v-if="
                                                  getAccessModes(
                                                      slotProps,
                                                  ).includes('read')
                                              "
                          @click.stop="
                                                  clickRead(slotProps)
                                              "
                      >
                        <AIcon type="RedoOutlined"
                        />
                      </a>
                    </div>
                    <div
                        v-if="
                                              propertyValue.has(slotProps.id)
                                          "
                        class="card-box-content-right-2"
                    >
                      <j-ellipsis>
                        {{
                          propertyValue.get(
                              slotProps.id,
                          )?.hex || ''
                        }}
                      </j-ellipsis>
                      <p>
                        {{
                          dayjs(
                              propertyValue.get(
                                  slotProps.id,
                              )?.timestamp,
                          ).format(
                              'YYYY-MM-DD HH:mm:ss',
                          )
                        }}
                      </p>
                    </div>
                  </div>

                  <div class="card-box-content-right">
                    <j-ellipsis
                        style="
                                              width: calc(100% - 10px);
                                              margin-bottom: 10px;
                                          "
                    >
                      <div
                          v-if="getRight1(slotProps)"
                          class="card-box-content-right-1"
                      >
                                              <span>
                                                  {{ getQuantity(slotProps) }}
                                              </span>
                        <span>
                                                  {{ getAddress(slotProps) }}
                                              </span>
                        <span>
                                                  {{
                            getScaleFactor(
                                slotProps,
                            )
                          }}
                                              </span>
                      </div>
                    </j-ellipsis>
                    <j-ellipsis
                        style="
                                              width: calc(100% - 10px);
                                              margin-bottom: 10px;
                                          "
                    >
                      <div
                          class="card-box-content-right-2"
                      >
                                              <span>{{
                                                  getText(slotProps)
                                                }}</span>
                        <span
                            v-if="
                                                      getInterval(slotProps)
                                                  "
                        >{{
                            getInterval(slotProps)
                          }}</span
                        >
                      </div>
                    </j-ellipsis>
                  </div>
                </div>
              </template>
            </PointCardBox>
          </template>
        </j-pro-table>
      </div>
    </div>
  </a-spin>
  <Save
      v-if="visible.save"
      :data="current"
      @change="saveChange"
      :collector="data"
  />
  <SaveModBus
      v-if="visible.saveModBus"
      :data="current"
      @change="saveChange"
  />
  <!--    <SaveOPCUA-->
  <!--        v-if="visible.saveOPCUA"-->
  <!--        :data="current"-->
  <!--        @change="saveChange"-->
  <!--    />-->
  <WritePoint
      v-if="visible.writePoint"
      :data="current"
      @change="saveChange"
  />
  <BatchUpdate
      v-if="visible.batchUpdate"
      :data="current"
      :provider="data.provider"
      @change="saveChange"
  />
  <!--    <SaveS7 v-if="visible.saveS7" :data="current" @change="saveChange" />-->
  <!--    <SaveIEC104-->
  <!--        v-if="visible.saveIEC104"-->
  <!--        :data="current"-->
  <!--        @change="saveChange"-->
  <!--    />-->
  <!--    <SaveBACNet-->
  <!--        v-if="visible.saveBACNet"-->
  <!--        :data="current"-->
  <!--        @change="saveChange"-->
  <!--    />-->
  <Scan v-if="visible.scan" :data="current" @change="saveChange"/>
  <ScanBacnet
      v-if="visible.scanBacnet"
      :data="current"
      @change="saveChange"
  />
  <Import
      v-if="visible.import"
      :data="current"
      @close-import="closeImport"
  />
  <RenderComponents :key="data.id" v-if="data.id && data.provider !== 'COLLECTOR_GATEWAY' && jsonData" :value="jsonData"/>
</template>
<script lang="ts" setup name="PointPage">
import {
  queryPoint,
  batchDeletePoint,
  removePoint,
  readPoint,
  getProviders,
  getStates,
  exportPoint,
} from '@collector/api/data-collect/collector';
import {onlyMessage, downloadFileByUrl} from '@jetlinks-web/utils'
import PointCardBox from './components/PointCardBox/index.vue';
import WritePoint from './components/WritePoint/index.vue';
import BatchUpdate from './components/BatchUpdate/index.vue';
import Save from './Save/index.vue';
import SaveModBus from './Save/SaveModBus.vue';
import Scan from './Scan/index.vue';
import ScanBacnet from './ScanBacnet/index.vue';
import {colorMap, imgUrl} from '../data';
import {cloneDeep, isBoolean, isNumber, throttle} from 'lodash-es';
import { wsClient } from '@jetlinks-web/core';
import {map} from 'rxjs/operators';
import dayjs from 'dayjs';
import Import from './components/Import/index.vue';
import BatchDropdown from '@/components/BatchDropdown/index.vue';
import {useI18n} from 'vue-i18n';
import {devGetProtocol} from "@collector/utils/utils";
import RenderComponents from "@collector/components/RenderComponents";

const {t: $t} = useI18n();
const props = defineProps({
  data: {
    type: Object,
    default: () => ({}),
  },
});

const tableRef = ref<Record<string, any>>({});
const params = ref<Record<string, any>>({});
const ImageMap = new Map();

ImageMap.set('OPC_UA', imgUrl.opcImage);
ImageMap.set('MODBUS_TCP', imgUrl.modbusImage);
ImageMap.set('snap7', imgUrl.s7Image);
ImageMap.set('iec104', imgUrl.iecImage);
ImageMap.set('COLLECTOR_GATEWAY', imgUrl.gatewayImage);

const visible = reactive({
  writePoint: false,
  batchUpdate: false,
  scan: false,
  save: false,
  import: false,
  scanBacnet: false,
  saveModBus: false,
});

const current: any = ref({});
const accessModesOption = ref();
const _selectedRowKeys = ref<string[]>([]);
const checkAll = ref(false);
const spinning = ref(false);
const ReadIdMap = new Map();
const isCheck = ref(false);
const batchRef = ref();
const pointActions = reactive({
  add: false,
  scan: false,
});
const jsonData = ref();

provide("point-actions", pointActions);

const defaultParams = ref({
  sorts: [{name: 'id', order: 'desc'}],
  terms: [
    {
      terms: [
        {
          column: 'collectorId',
          termType: 'eq',
          value: !props.data?.id
              ? 'undefined'
              : props.data.id === '*'
                  ? undefined
                  : props.data.id,
        },
      ],
    },
  ],
});

const accessModesMODBUS_TCP = [
  {
    label: $t('Point.index.400149-7'),
    value: 'read',
  },
  {
    label: $t('Point.index.400149-8'),
    value: 'write',
  },
];

const columns = reactive([
  {
    title: $t('Point.index.400149-9'),
    dataIndex: 'name',
    key: 'name',
    search: {
      type: 'string',
    },
  },
  {
    title: $t('Point.index.400149-10'),
    dataIndex: 'provider',
    key: 'provider',
    search: {
      type: 'select',
      options: async () => {
        const resp: any = await getProviders();
        if (resp.success) {
          return resp.result.map((item: any) => ({
            label: item.name,
            value: item.id,
          }));
        } else {
          return [];
        }
      },
    },
  },
  {
    title: $t('Point.index.400149-11'),
    dataIndex: 'accessModes$in$any',
    key: 'accessModes$in$any',
    search: {
      type: 'select',
      options: computed(() => accessModesOption.value)
    },
  },
  {
    title: $t('Point.index.400149-12'),
    dataIndex: 'runningState',
    key: 'runningState',
    search: {
      type: 'select',
      options: async () => {
        const resq: any = await getStates();
        if (resq.status === 200) {
          return resq.result.map((item: any) => ({
            label: item.text,
            value: item.value,
          }));
        } else {
          return [];
        }
      },
    },
  },
  {
    title: $t('Point.index.400149-13'),
    dataIndex: 'description',
    key: 'description',
    search: {
      type: 'string',
    },
  },
])

const subRef = ref();
const propertyValue = ref(new Map());
const batchActions = ref<any>([]);

const handleAdd = () => {
  if (props.data?.provider === 'COLLECTOR_GATEWAY') {
    current.value = {
      collectorId: props.data?.id,
      provider: props.data?.provider || 'COLLECTOR_GATEWAY',
    };
    visible.saveModBus = true;
  } else {
    if (props.data?.provider === 'snap7') {
      current.value = {
        collectorId: props.data?.id,
        provider: props.data?.provider,
        deviceType: props.data?.configuration.type,
      };
    } else if (props.data?.provider === 'iec104') {
      current.value = {
        collectorId: props.data?.id,
        provider: props.data?.provider,
      };
    } else {
      current.value = {
        collectorId: props.data?.id,
        provider: props.data?.provider || 'MODBUS_TCP',
      };
    }
    visible.save = true;
  }
};
const handleEdit = (data: any) => {
  current.value = cloneDeep({
    ...data,
    deviceType:
        props.data?.configuration?.type ||
        props.data?.configuration?.valueType,
  });
  if (data?.provider === 'COLLECTOR_GATEWAY') {
    visible.saveModBus = true;
  } else {
    visible.save = true;
  }
};

const handleDelete = (id: string | undefined = undefined) => {
  spinning.value = true;
  const response = !id
      ? batchDeletePoint(_selectedRowKeys.value).catch(() => {
      })
      : removePoint(id as string).catch(() => {
      });
  response.then((res) => {
    if (res?.status === 200) {
      cancelSelect();
      tableRef.value?.reload();
      onlyMessage($t('Point.index.400149-14'), 'success');
    }
    spinning.value = false;
  });
  return response;
};

const onCheckChange = () => {
  _selectedRowKeys.value = [];
  checkAll.value = false;
};

const handleBatchDelete = () => {
  if (!_selectedRowKeys.value.length) {
    onlyMessage($t('Point.index.400149-15'), 'error');
    return
  }
  handleDelete();
};

const handleBatchUpdate = () => {
  if (!_selectedRowKeys.value.length) {
    onlyMessage($t('Point.index.400149-15'), 'error');
    return
  }
  const dataSet = new Set(_selectedRowKeys.value);
  const dataMap = new Map();
  tableRef?.value?.dataSource.forEach((i: any) => {
    dataSet.has(i.id) && dataMap.set(i.id, i);
  });
  current.value = [...dataMap.values()];
  visible.batchUpdate = true;
};

const handleScan = () => {
  if (props.data?.provider === 'OPC_UA') {
    visible.scan = true;
  } else if (props.data?.provider === 'BACNetIp') {
    visible.scanBacnet = true;
  }
  current.value = cloneDeep(props.data);
};
const handleImport = () => {
  visible.import = true;
  current.value = cloneDeep(props.data);
};
const handleExport = async () => {
  const params =
      props?.data?.provider === 'COLLECTOR_GATEWAY'
          ? props?.data?.configuration?.collectorProvider
          : props?.data?.provider;
  const res: any = await exportPoint(props.data.collectorId, params);
  if (res) {
    const blob = new Blob([res], {type: 'xlsx'});
    const url = URL.createObjectURL(blob);
    downloadFileByUrl(url, $t('Point.index.400149-16', [props?.data?.channelName]), 'xlsx');
  }
};
const clickEdit = async (data: object) => {
  visible.writePoint = true;
  current.value = cloneDeep(data);
};

// ReadIdMap
const clickRead = async (data: any) => {
  const res: any = await readPoint(data?.collectorId, [data?.id]);
  if (res.status === 200) {
    const readData: any = res.result[0];
    const _data = ReadIdMap.get(data?.id);
    ReadIdMap.set(data?.id, {..._data, ...readData});
    cancelSelect();
    tableRef.value?.reload();
    onlyMessage($t('Point.index.400149-14'), 'success');
  }
};

const getQuantity = (item: Partial<Record<string, any>>) => {
  const {quantity} = item.configuration?.parameter || '';
  return !!quantity ? quantity + `(${$t('Point.index.400149-24')})` : '';
};
const getAddress = (item: Partial<Record<string, any>>) => {
  const {address} = item.configuration?.parameter || '';
  return !!address || address === 0 ? address + `(${$t('Point.index.400149-25')})` : '';
};
const getScaleFactor = (item: Partial<Record<string, any>>) => {
  const {scaleFactor} = item.configuration?.codec?.configuration || '';
  return !!scaleFactor ? scaleFactor + `(${$t('Point.index.400149-26')})` : '';
};
const getRight1 = (item: Partial<Record<string, any>>) => {
  return !!getQuantity(item) || getAddress(item) || getScaleFactor(item);
};
const getText = (item: Partial<Record<string, any>>) => {
  return (item?.accessModes || []).map((i: any) => i?.text).join(',');
};
const getInterval = (item: Partial<Record<string, any>>) => {
  const {interval} = item.configuration || '';
  return !!interval ? $t('Point.index.400149-20') + interval + 'ms' : '';
};

const getAccessModes = (item: Partial<Record<string, any>>) => {
  return item?.accessModes?.map((i: any) => i?.value);
};

const getParseData = (item: any) => {
  const {parseData, dataType} = propertyValue.value.get(item.id);
  const data = isNumber(parseData) ? parseData || 0 : parseData;
  const _data = `${data}(${dataType}) `;
  return _data;
};
const getReadParseData = (item: any) => {
  let _data = '--';
  if (ReadIdMap.has(item.id)) {
    const {parseData, dataType} = ReadIdMap.get(item.id);
    if (isBoolean(parseData)) {
      _data = `${parseData}(${dataType || '-'}) `;
    } else {
      _data = !!parseData ? `${parseData}(${dataType || '-'}) ` : '--';
    }
  }
  return _data;
};

const saveChange = (value: object) => {
  for (let key in visible) {
    visible[key] = false;
  }
  current.value = {};
  if (value) {
    tableRef.value?.reload();
    onlyMessage($t('Point.index.400149-14'), 'success');
  }
};

const cancelSelect = () => {
  _selectedRowKeys.value = [];
};

const handleClick = (dt: any) => {
  if (!isCheck.value) {
    return;
  }
  if (_selectedRowKeys.value.includes(dt.id)) {
    const _index = _selectedRowKeys.value.findIndex((i) => i === dt.id);
    _selectedRowKeys.value.splice(_index, 1);
    checkAll.value = false;
  } else {
    _selectedRowKeys.value = [..._selectedRowKeys.value, dt.id];
    if (
        _selectedRowKeys.value.length === tableRef.value?.dataSource.length
    ) {
      checkAll.value = true;
    }
  }
};

const handleSubscribeValue = throttle((payload: any) => {
  propertyValue.value.set(payload.pointId, payload);
});

const subscribeProperty = (value: any) => {
  const list = value.map((item: any) => item.id);
  const id = `collector-${props.data?.channelId || 'channel'}-${
      props.data?.id || (props.data && props.data.id === '*')
          ? 'point'
          : props.data?.id
  }-data-${list.join('-')}`;
  const topic = `/collector/${props.data?.channelId || '*'}/${
      props.data?.id || (props.data && props.data.id === '*')
          ? '*'
          : props.data?.id
  }/data`;
  subRef.value = wsClient.getWebSocket(id, topic, {
    pointId: list.join(','),
  })
      ?.pipe(map((res: any) => res.payload))
      .subscribe((payload: any) => {
        //防止刷新过快
        handleSubscribeValue(payload);
      });
};

const onCheckAllChange = (e: any) => {
  if (e.target.checked) {
    _selectedRowKeys.value = [
      ...tableRef.value?.dataSource.map((i: any) => i.id),
    ];
  } else {
    cancelSelect();
    checkAll.value = false;
  }
};

const closeImport = () => {
  visible.import = false;
  tableRef.value.reload();
};

const getPointAction = async () => {
  jsonData.value = await devGetProtocol(props.data.provider, "pointActions");
};

const getDataSource = (p: any) => {
  return queryPoint(p).then(resp => {
    subRef.value?.unsubscribe();
    if (resp.success && resp.result.data.length) {
      setTimeout(() => {
        const _array = resp.result.data
        subscribeProperty(resp.result.data);
        _array.forEach((item: any) => {
          item.accessModes?.forEach((i: any) => {
            if (i?.value === 'read') {
              ReadIdMap.set(item.id, item);
            }
          });
        })
      }, 100)
    }
    cancelSelect();
    checkAll.value = false;
    return resp
  })
}

const changeAccessModelOptions = () => {

  accessModesOption.value = props.data.provider === 'MODBUS_TCP' ? accessModesMODBUS_TCP : [
    ...accessModesMODBUS_TCP,
    {
      label: $t('Point.index.400149-21'),
      value: 'subscribe',
    }
  ]
}

const updateDefaultParams = () => {
  const {id} = props.data
  let value = 'undefined'

  if (id) {
    value = id === '*' ? undefined : id
  }

  defaultParams.value.terms[0].terms[0].value = value
}

const updateBatchActions = () => {
  const {provider} = props.data
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

watch(
    () => _selectedRowKeys.value,
    (value) => {
      if (value.length === 0) {
        checkAll.value = false;
      }
    },
);

watch(
    () => props.data,
    (value) => {
      if (!!value) {

        changeAccessModelOptions();
        updateDefaultParams();

        tableRef.value?.reload?.();
        // cancelSelect();
        checkAll.value = false;
        batchRef.value?.reload();
        updateBatchActions()
        // COLLECTOR_GATEWAY写死
        if (value.provider === 'COLLECTOR_GATEWAY') {
          pointActions.add = true
          pointActions.scan = false
        } else if (value.id && value.id !== '*') {
          pointActions.add = false
          pointActions.scan = false
          getPointAction()
        }
      }
    },
    {immediate: true, deep: true},
);

onUnmounted(() => {
  subRef.value?.unsubscribe();
});

const handleTerms = (arr: any[]) => {
  return arr.map(i => {
    const obj = {...i};
    if(i.column === 'accessModes$in$any'){
      if(i.termType === 'eq'){
        obj.column = 'accessModes$eq'
      }
      if(i.termType === 'not'){
        obj.column = 'accessModes$neq'
        obj.termType = 'neq'
      }
      if(i.termType === 'in'){
        obj.column = 'accessModes$in$any'
      }
      if(i.termType === 'nin'){
        obj.column = 'accessModes$nin$any'
      }
    }
    if(i?.terms?.length){
      obj.terms = handleTerms(i.terms || [])
    }
    return obj
  })
}


const handleSearch = (e: any) => {
  params.value = {
    ...e,
    terms: handleTerms(e.terms)
  }
};
</script>
<style lang="less" scoped>
.card-box {
  // min-width: 480px;
  a {
    color: #474747;
    z-index: 1;
  }

  a:hover {
    color: #315efb;
    z-index: 1;
  }

  .card-box-title {
    font-size: 18px;
    color: #474747;
  }

  .card-box-action {
    width: 90px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: -10px;
  }

  .card-box-content {
    margin-top: 20px;
    display: flex;

    .card-box-content-left {
      max-width: 220px;
      border-right: 1px solid #e0e4e8;
      height: 68px;
      padding-right: 10px;

      .card-box-content-left-1 {
        display: flex;
        justify-content: flex-start;

        .card-box-content-left-1-title {
          color: #000;
          font-size: 20px;
          opacity: 0.85;
        }
      }

      a {
        margin-left: 10px;
      }
    }

    .card-box-content-right {
      flex: 0.8;
      margin-left: 20px;

      .card-box-content-right-1 {
        span {
          margin: 0 5px 0 0;
        }
      }

      .card-box-content-right-2 {
        span {
          margin: 0 5px 0 0;
          padding: 3px 12px;
          background: #f3f3f3;
          color: #616161;
        }
      }
    }
  }
}
</style>
