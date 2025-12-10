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
                                onSelectNone: () => (_selectedRowKeys = []),
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
        <a-space>
          <!-- 新增点位 -->
          <a-button type="primary">
            <AIcon type="PlusOutlined"/>
            新增点位
          </a-button>
          <!-- 扫描点位 -->
          <a-button type="primary">扫描点位</a-button>
          <!-- 批量导入 -->
          <a-button>批量导入</a-button>
          <!-- 数据导出 -->
          <a-button>数据导出</a-button>
          <!-- 批量操作 -->
          <BatchDropdown
              v-model:isCheck="isCheck"
              :actions="batchActions"
              @change="onCheckChange"
          />
          <div v-if="isCheck">
            <a-checkbox
                v-model:checked="checkAll"
                @change="onCheckAllChange"
            >{{ $t('Point.index.400149-4') }}
            </a-checkbox>
          </div>
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
        <div style="display: flex; align-items: center;gap: 16px">
          <img style="width: 30px" :src="ImageMap.get(slotProps.provider) || ImageMap.get('protocol')"/>
          <j-ellipsis>{{ slotProps.name }}</j-ellipsis>
          <j-badge-status
              :status="slotProps?.runningState?.value"
              :text="slotProps?.runningState?.text"
              :statusNames="ChannelState"
          />
        </div>
      </template>
      <template #value="slotProps">
        <div class="header-cell-title">
          <div>
            <div>123(int8)</div>
            <div>48390285940</div>
          </div>
          <a-space>
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
          </a-space>
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
  <Save />
</template>

<script setup>
import {useI18n} from "vue-i18n";
import {queryPoint} from "@data-collector-ui/api/data-collect/collector";
import SortsIcon from "./SortsIcon.vue";
import ColumnsConfig from "./ColumnsConfig.vue";
import {baseColumns} from "./columns";
import {randomString} from "@jetlinks-web/utils";
import {ChannelState, COLLECTOR_DATA, pointImgUrl} from "@data-collector-ui/views/data-collect/data";
import dayjs from "dayjs";
import BatchDropdown from "@/components/BatchDropdown/index.vue";
import {map} from "lodash-es";
import {wsClient} from "@jetlinks-web/core";
import {throttle} from "lodash-es";
import Save from "./Save/index.vue";

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
const checkAll = ref(false);
const _selectedRowKeys = ref([]);

const data = inject(COLLECTOR_DATA, ref({}))

const ImageMap = new Map();
ImageMap.set('OPC_UA', pointImgUrl.opcImage);
ImageMap.set('MODBUS_TCP', pointImgUrl.modbusImage);
ImageMap.set('snap7', pointImgUrl.s7Image);
ImageMap.set('iec104', pointImgUrl.iecImage);
ImageMap.set('COLLECTOR_GATEWAY', pointImgUrl.gatewayImage);
ImageMap.set('protocol', pointImgUrl.protocolImage);

const subRef = ref();
const propertyValue = ref(new Map());
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
    // checkAll.value = false;
    return resp
  })
}

const getAccessModes = (item) => {
  return item?.accessModes?.map((i) => i?.value);
};

const clickEdit = (item) => {

}

const clickRead = (item) => {

}

const onCheckChange = () => {
  _selectedRowKeys.value = [];
  checkAll.value = false;
};

const onCheckAllChange = () => {

}

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

  console.log(columnsConfig.data)
}

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
