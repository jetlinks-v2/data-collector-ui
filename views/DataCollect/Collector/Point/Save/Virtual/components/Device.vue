<template>
  <div style="height: 100%; overflow-y: auto">
    <pro-search type="simple" :columns="columns" @search="handleSearch" class="scene-search" style="margin-bottom: 0"/>
    <div style="height: 400px">
      <j-pro-table
          :key="channelId"
          ref="actionRef"
          :params="params"
          :request="queryCollectorDevice"
          :defaultParams="{
            sorts: [{ name: 'createTime', order: 'desc' }],
            terms: [{ column: 'channelId', value: channelId, termType: 'eq' }],
          }"
          :gridColumns="[2]"
          :columns="columns"
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
              :showStatus="false"
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
                <div class="card-item-content-box">
                  <div class="card-item-content-text">
                    类型
                  </div>
                  <div class="card-item-content-text">
                    {{ slotProps.provider === 'virtual' ? '虚拟通道' : '设备通道' }}
                  </div>
                </div>
              </div>
            </template>
          </CardBox>
        </template>
      </j-pro-table>
    </div>
  </div>
</template>

<script setup lang="ts" name="Channel">
import {queryCollectorDevice} from "@data-collector-ui/api/data-collect/collector";
import {ImageMap} from "@data-collector-ui/views/DataCollect/Channel/data";

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
  channelId: {
    type: String,
    default: "",
  },
});

const emit = defineEmits<Emit>();
const _selectedRowKeys = ref<any[]>([]);
const getImage = (record) => record?.photoUrl
const handleSearch = (p: any) => {
  params.value = p;
};

const columns = [
  {
    title: '名称',
    dataIndex: 'name',
    key: 'name',
    ellipsis: true,
    fixed: 'left',
    search: {
      type: 'string',
    },
  }
]

const handleClick = (detail: any) => {
  _selectedRowKeys.value = detail.id ? [detail.id] : [];
  emit("update:rowKey", detail.id);
  emit("update:detail", detail);
  emit("change", detail);
};

watch(
    () => props.rowKey,
    () => {
      _selectedRowKeys.value = props.rowKey ? [props.rowKey] : [];
    },
    {
      immediate: true,
    }
);
</script>

<style scoped lang="less"></style>
