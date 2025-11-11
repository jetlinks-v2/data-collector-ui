<template>
  <div style="height: 100%;overflow-y: auto">
    <pro-search
        type="simple"
        @search="handleSearch"
        :columns="columns"
        style="margin-bottom: 0"
    />
    <div style="height: 400px">
      <j-pro-table
          ref="actionRef"
          :params="params"
          :request="query"
          :gridColumns="[2]"
          :columns="columns"
          :defaultParams="{
          sorts: [{ name: 'createTime', order: 'desc' }],
        }"
          mode="CARD"
          :rowSelection="{
              selectedRowKeys: _selectedRowKeys,
            }"
          :alertShow="false"
      >
        <template #card="slotProps">
          <CardBox
              :value="slotProps"
              v-bind="slotProps"
              :status="getState(slotProps).value"
              :statusText="getState(slotProps).text"
              :statusNames="StatusColorEnum"
              @click="handleClick(slotProps)"
              :active="_selectedRowKeys.includes(slotProps.id)"
          >
            <template #img>
              <img
                  :src="ImageMap.get(slotProps.provider) || ImageMap.get('protocol')"
                  class="card-list-img-80"
              />
            </template>
            <template #content>
              <div class="card-item-content">
                <j-ellipsis style="width: calc(100% - 100px)">
                                        <span
                                            style="
                                                font-size: 18px;
                                                font-weight: 800;
                                                line-height: 22px;
                                            "
                                        >
                                            {{ slotProps.name }}
                                        </span>
                </j-ellipsis>
                <a-row class="card-item-content-box">
                  <a-col :span="12">
                    <div class="card-item-content-text">
                      类型
                    </div>
                    <div class="card-item-content-text">
                      {{ slotProps.provider === 'virtual' ? '虚拟通道' : '设备通道' }}
                    </div>
                  </a-col>

                  <a-col :span="12">
                    <div class="card-item-content-text">
                      {{ $t('Channel.index.290640-2') }}
                    </div>
                    <j-ellipsis>
                      {{ slotProps.description || "--" }}
                    </j-ellipsis>
                  </a-col>
                </a-row>
              </div>
            </template>
          </CardBox>
        </template>
      </j-pro-table>
    </div>
  </div>
</template>

<script setup lang="ts" name="Channel">
import {query} from '@data-collector-ui/api/data-collect/channel'
import {useI18n} from "vue-i18n";
import {useCollectorProvider} from "@data-collector-ui/hooks";
import {ImageMap, StatusColorEnum} from "@data-collector-ui/views/DataCollect/Channel/data";

type Emit = {
  (e: "update:rowKey", data: string): void;
  (e: "update:detail", data: string): void;
  (e: "change", data: string): void;
};

const actionRef = ref();
const params = ref({});
const props = defineProps({
  rowKey: {
    type: String,
    default: "",
  },
  detail: {
    type: Object,
    default: () => ({}),
  },
});

const emit = defineEmits<Emit>();
const _selectedRowKeys = ref<any[]>([]);
const {t: $t} = useI18n();
const permissionKey = inject('dataCollectChannelPermissionKey', 'DataCollect/Channel')

const {providers} = useCollectorProvider(permissionKey);

const getState = (record: Partial<Record<string, any>>) => {
  if (record) {
    if (record?.state?.value === 'enabled') {
      return {...record?.runningState};
    } else {
      return {
        text: $t('Channel.index.290640-7'),
        value: 'disabled',
      };
    }
  } else {
    return {};
  }
};
const columns = [
  {
    title: $t('Channel.index.290640-3'),
    dataIndex: 'name',
    key: 'name',
    ellipsis: true,
    fixed: 'left',
    search: {
      type: 'string',
    },
  },
  {
    title: $t('Channel.index.290640-4'),
    dataIndex: 'provider',
    key: 'provider',
    ellipsis: true,
    search: {
      type: 'select',
      options: providers
    },
  },
  {
    title: $t('Channel.index.290640-5'),
    dataIndex: 'state',
    key: 'state',
    ellipsis: true,
    scopedSlots: true,
    search: {
      type: 'select',
      options: [
        {label: $t('Channel.index.290640-6'), value: 'enabled'},
        {label: $t('Channel.index.290640-7'), value: 'disabled'},
      ],
    },
  },
  {
    title: $t('Channel.index.290640-8'),
    dataIndex: 'runningState',
    key: 'runningState',
    ellipsis: true,
    scopedSlots: true,
    search: {
      type: 'select',
      options: [
        {label: $t('Channel.index.290640-9'), value: 'running'},
        {label: $t('Channel.index.290640-10'), value: 'stopped'},
      ],
    },
  },
  {
    title: $t('Channel.index.290640-2'),
    dataIndex: 'description',
    key: 'description',
    ellipsis: true,
    search: {
      type: 'string',
    },
  },
];

const handleSearch = (p: any) => {
  params.value = p;
};

const handleClick = (detail: any) => {
  _selectedRowKeys.value = detail.id ? [detail.id] : []
  emit("update:rowKey", detail.id);
  emit("update:detail", detail);
  emit("change", detail);
};

watch(() => props.rowKey, () => {
  _selectedRowKeys.value = props.rowKey ? [props.rowKey] : []
}, {
  immediate: true
})
</script>

<style scoped lang="less">

</style>
