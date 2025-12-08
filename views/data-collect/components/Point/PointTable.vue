<template>
  <div style="display: flex; flex-direction: column; flex: 1; min-height: 0">
    <pro-search
        :columns="columns"
        target="data-collector-point"
        @search="handleSearch"
        style="margin-bottom: 0; padding: 16px 0"
        v-if="showSearch"
    />
    <j-pro-table
        ref="tableRef"
        :columns="columns"
        mode="TABLE"
        :request="query"
        :defaultParams="{
            sorts: [{ name: 'createTime', order: 'desc' }],
        }"
        :params="params"
        style="padding: 0; margin: 0"
        @resizeColumn="onResizeColumn"
    >
      <template #headerCell="{ column }">
        <template v-if="['name', 'updateTime', 'collectFrequency'].includes(column.key)">
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
        123
      </template>
      <template #headerRightRender>
        <a-space>
          <a-button @click="showSearch = !showSearch">
            <AIcon type="SearchOutlined"/>
            {{ showSearch ? '隐藏搜索' : '显示搜索' }}
          </a-button>
          <a-button>
            <AIcon type="SettingOutlined"/>
            列配置
          </a-button>
        </a-space>
      </template>
      <template #name="slotProps">
        <div>
          <j-ellipsis>{{ slotProps.name }}</j-ellipsis>
          <j-badge-status/>
        </div>
      </template>
    </j-pro-table>
  </div>
</template>

<script setup>
import {useI18n} from "vue-i18n";
import {query} from "@data-collector-ui/api/data-collect/channel";
import SortsIcon from "./SortsIcon.vue";

const params = ref({})
const showSearch = ref(false)
const {t: $t} = useI18n();
const sortValue = reactive({
  name: 'asc',
  updateTime: 'asc',
  collectFrequency: 'asc',
})

const columns = ref([
  {
    title: $t('Save.SaveBACNet.4001416-2'),
    dataIndex: 'name',
    key: 'name',
    ellipsis: true,
    fixed: 'left',
    scopedSlots: true,
    width: 120,
    search: {
      type: 'string'
    },
    sortsList: [
      {
        text: '点位名称(升序)',
        value: 'asc',
      },
      {
        text: '点位名称(降序)',
        value: 'desc',
      },
    ]
  },
  {
    title: '点位值',
    dataIndex: 'value',
    key: 'value',
    ellipsis: true,
    scopedSlots: true,
    resizable: true,
    width: 100,
    minWidth: 100,
    maxWidth: 200,
  },
  {
    title: '更新时间',
    dataIndex: 'updateTime',
    key: 'updateTime',
    scopedSlots: true,
    width: 200,
    ellipsis: true,
    sortsList: [
      {
        text: '按更新时间倒序',
        value: 'desc',
      },
      {
        text: '按更新时间正序',
        value: 'asc',
      },
    ]
  },
  {
    title: '地址',
    dataIndex: 'address',
    key: 'address',
    scopedSlots: true,
    ellipsis: true,
  },
  {
    title: '访问类型',
    dataIndex: 'accessType',
    key: 'accessType',
    scopedSlots: true,
    width: 200,
    ellipsis: true,
  },
  {
    title: '采集频率',
    dataIndex: 'collectFrequency',
    key: 'collectFrequency',
    scopedSlots: true,
    ellipsis: true,
    sortsList: [
      {
        text: '由高到低',
        value: 'desc',
      },
      {
        text: '由低到高',
        value: 'asc',
      },
    ]
  },
  {
    title: $t('Channel.index.290640-2'),
    dataIndex: 'description',
    key: 'description',
    ellipsis: true,
  }
]);

const onResizeColumn = (w, col) => {
  // 必须替换列对象才能保持响应性
  const target = columns.value.find(c => c.key === col.key)
  if (target) {
    target.width = w
  }
}

const handleSort = (key, value) => {
  console.log(key, value)
  sortValue[key] = value
}

const handleSearch = (params) => {
  console.log(params)
}
</script>

<style lang="less" scoped>
.header-cell-title {
  display: flex;
  align-items: center;
  gap: 4px;
  justify-content: space-between;
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
