<template>
  <div style="height: 100%; overflow-y: auto">
    <pro-search type="simple" :columns="columns" @search="handleSearch" class="scene-search" style="margin-bottom: 0"/>
    <div style="height: 400px">
      <j-pro-table
          :key="deviceId"
          ref="actionRef"
          :params="params"
          :request="queryPoint"
          :defaultParams="{
            sorts: [{ name: 'createTime', order: 'desc' }],
            terms: [{ column: 'collectorId', value: deviceId, termType: 'eq' }],
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
          <template v-if="modalType === 'keyPoint'">
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
                      {{ $t('Channel.index.290640-2') }}
                    </div>
                    <j-ellipsis>
                      {{ slotProps.description || "--" }}
                    </j-ellipsis>
                  </div>
                </div>
              </template>
            </CardBox>
          </template>
          <template v-else>
            <div class="my-card">
              <h4><j-ellipsis>
                {{ slotProps.name }}
              </j-ellipsis></h4>
              <slot name="item" v-bind="slotProps"></slot>
            </div>
          </template>
        </template>
      </j-pro-table>
    </div>
  </div>
</template>

<script setup lang="ts" name="Channel">
import {queryPoint} from "@data-collector-ui/api/data-collect/collector";
import {ImageMap} from "@data-collector-ui/views/DataCollect/Channel/data";
import {useI18n} from 'vue-i18n';

const {t: $t} = useI18n();

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
  deviceId: {
    type: String,
    default: "",
  },
  modalType: {
    type: String,
    default: "keyPoint",
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
    title: $t('NewResource.index.035355-3'),
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

<style scoped lang="less">
.my-card {
  border: 1px solid rgb(#000, .2);
  padding: 16px;
  border-radius: 6px;
  width: 100%;
}
</style>
