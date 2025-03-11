<template>
  <div class="tree-container">
    <a-input-search
        v-model:value="searchValue"
        :placeholder="$t('Tree.index.4001410-0')"
        @search="handleSearch"
        allowClear
    />
    <div>
      <j-permission-button
          block
          type="primary"
          @click="handleAdd()"
          hasPermission="DataCollect/Collector:add"
      >
        <template #icon>
          <AIcon type="PlusOutlined"/>
        </template>
        {{ $t('Tree.index.4001410-1') }}
      </j-permission-button>
    </div>
    <div class="collector-list">
      <a-spin :spinning="spinning">
        <a-tree
            :tree-data="defualtDataSource"
            :selected-keys="selectedKeys"
            :fieldNames="{ key: 'id' }"
            v-if="
                !(
                    defualtDataSource.length === 0 ||
                    defualtDataSource?.[0]?.children?.length === 0
                )
            "
            @select="treeSelect"
            defaultExpandAll
            :showLine="{ showLeafIcon: false }"
            :show-icon="true"
        >
          <template #title="{ name, data }">
            <j-ellipsis class="tree-left-title">
              {{ name }}
            </j-ellipsis>
            <a-tag
                class="tree-left-tag"
                v-if="data.id !== '*'"
                :color="colorMap.get(data?.uniformState?.value)"
            >{{ data?.uniformState?.text }}
            </a-tag
            >
            <a-tag
                class="tree-left-tag2"
                v-if="data.id !== '*'"
                :color="
                            data?.state?.value === 'disabled'
                                ? colorMap.get(data?.runningState?.value)
                                : colorMap.get(data?.state?.value)
                        "
            >
              {{
                data?.state?.value === 'disabled'
                    ? data?.state?.text
                    : data?.runningState?.text
              }}
            </a-tag>
            <a-space
                v-if="data.id !== '*'"
                @click="(e) => e.stopPropagation()"
            >
              <j-permission-button
                  type="link"
                  :tooltip="{
                                title: $t('Tree.index.4001410-2'),
                            }"
                  @click="handleEdit(data)"
                  hasPermission="DataCollect/Collector:update"
                  size="small"
              >
                <AIcon type="EditOutlined"/>
              </j-permission-button>
              <j-permission-button
                  type="link"
                  :tooltip="{
                                title:
                                    data?.state?.value === 'disabled'
                                        ? $t('Tree.index.4001410-3')
                                        : $t('Tree.index.4001410-4'),
                            }"
                  :disabled="
                                data?.runningState?.value === 'stopped' &&
                                data?.state?.value !== 'disabled'
                            "
                  hasPermission="DataCollect/Collector:action"
                  :popConfirm="{
                                title:
                                    data?.state?.value === 'disabled'
                                        ? $t('Tree.index.4001410-5')
                                        : $t('Tree.index.4001410-6'),
                                onConfirm: () => handleUpdate(data),
                            }"
                  size="small"
              >
                <AIcon
                    :type="
                                    data?.state?.value === 'disabled'
                                        ? 'CheckCircleOutlined'
                                        : 'StopOutlined'
                                "
                />
              </j-permission-button>
              <j-permission-button
                  type="link"
                  :disabled="data?.state?.value !== 'disabled'"
                  :tooltip="{
                                title:
                                    data?.state?.value !== 'disabled'
                                        ? $t('Tree.index.4001410-7')
                                        : $t('Tree.index.4001410-8'),
                            }"
                  :danger="data?.state?.value === 'disabled'"
                  hasPermission="DataCollect/Collector:delete"
                  :popConfirm="{
                                title: $t('Tree.index.4001410-9'),
                                onConfirm: () => handleDelete(data.id),
                            }"
                  size="small"
              >
                <AIcon type="DeleteOutlined"/>
              </j-permission-button>
            </a-space>
          </template>
        </a-tree>
        <a-empty v-else :description="$t('Tree.index.4001410-10')"/>
      </a-spin>
    </div>
  </div>
  <Save
      :channelListAll="channelListAll"
      v-if="visible"
      :data="current"
      @change="saveChange"
  />
</template>

<script setup lang="ts" name="TreePage">
import {
  queryCollectorTree,
  queryChannelNoPaging,
  update,
  remove,
} from '../../../../api/data-collect/collector';
import Save from './Save/index.vue';
import {onlyMessage} from '@jetlinks-web/utils'
import {cloneDeep, isArray} from 'lodash-es';
import {colorMap} from '../data';
import {useI18n} from 'vue-i18n';

const {t: $t} = useI18n();
const props = defineProps({
  data: {
    type: Object,
    default: () => ({}),
  },
});
const emits = defineEmits(['change']);

const route = useRoute();
const channelId = route.query?.channelId;
const spinning = ref(false);
const selectedKeys: any = ref([]);
const searchValue = ref();
const visible = ref(false);
const current = ref({});
const collectorAll = ref();
const channelListAll = ref<any[]>([]);

const root = [
  {
    id: '*',
    name: $t('Tree.index.4001410-11'),
    children: [],
  },
];

const defualtDataSource: any = ref(cloneDeep(root));

const defualtParams = {
  paging: false,
  sorts: [{name: 'createTime', order: 'desc'}],
  terms: !!channelId
      ? [
        {
          terms: [
            {
              column: 'channelId',
              value: channelId,
            },
          ],
          type: 'and',
        },
      ]
      : [],
};
const params = ref();

const handleAdd = () => {
  current.value = {};
  visible.value = true;
};

const handleEdit = (data: object) => {
  current.value = cloneDeep(data);
  visible.value = true;
};

const handleUpdate = (data: any) => {
  const state = data?.state?.value;
  const response = update(data?.id, {
    state: state !== 'disabled' ? 'disabled' : 'enabled',
    runningState: state !== 'disabled' ? 'stopped' : 'running',
  });
  response.then((resp) => {
    if (resp.status === 200) {
      handleSearch(params.value);
      const _item = collectorAll.value.find(
          (i: any) => i?.id === selectedKeys.value?.[0],
      );
      emits('change', _item);
      onlyMessage($t('Tree.index.4001410-12'), 'success');
    }
  });
  return response
};
const handleDelete = (id: string) => {
  const response = remove(id);
  response.then((resp) => {
    if (resp.status === 200) {
      selectedKeys.value = [];
      handleSearch(params.value);
      onlyMessage($t('Tree.index.4001410-12'), 'success');
    }
  });
  return response
};

const saveChange = (value: object) => {
  visible.value = false;
  current.value = {};
  if (value) {
    handleSearch(params.value);
    onlyMessage($t('Tree.index.4001410-12'), 'success');
  }
};

const handleSearch = async (value: any) => {
  let clickSearch = !!channelId; // 通道跳转进来或者搜索时，树根节点无全部

  if (!searchValue.value && !value) {
    params.value = cloneDeep(defualtParams);
  } else if (!!searchValue.value) {
    clickSearch = true;
    params.value = {...cloneDeep(defualtParams)};
    // params.value.terms[1] = {
    //     terms: [
    //         {
    //             column: 'name',
    //             value: `%${searchValue.value}%`,
    //             termType: 'like',
    //         },
    //     ],
    // };
    params.value.terms = [
      ...(params.value?.terms || []),
      {
        terms: [
          {
            column: 'name',
            value: `%${searchValue.value}%`,
            termType: 'like',
          },
        ],
      },
    ];
  } else {
    !!value && (params.value = value);
  }
  spinning.value = true;
  const res: any = await queryCollectorTree(params.value);
  if (res.status === 200) {
    if (clickSearch) {
      defualtDataSource.value = res.result;
      if (res.result.length !== 0) {
        selectedKeys.value.length === 0 &&
        (selectedKeys.value = [res.result[0].id]); // 通道跳转进来或者搜索时，默认选中第一个
      }
    } else {
      defualtDataSource.value = cloneDeep(root);
      defualtDataSource.value[0].children = res.result;
    }
    collectorAll.value = res.result;

    if (selectedKeys.value.length === 0) {
      selectedKeys.value = res.result.length ? ['*'] : [];
    }

    //激活change事件
    setTimeout(() => {
      const _selectedKeys = cloneDeep(selectedKeys.value);
      selectedKeys.value = [];
      selectedKeys.value = _selectedKeys;
    }, 0);
  }
  spinning.value = false;
};
const getChannelNoPaging = async () => {
  const res: any = await queryChannelNoPaging();
  channelListAll.value = res.result;
};

const treeSelect = (keys: string, e: any) => {
  selectedKeys.value = [e.node?.id];
};

onMounted(() => {
  handleSearch(cloneDeep(defualtParams));
  getChannelNoPaging();
});

watch(
    () => selectedKeys.value[0],
    (n, p) => {
      const key = isArray(selectedKeys.value)
          ? selectedKeys.value[0]
          : selectedKeys.value;
      if (key) {
        if (key !== '*') {
          const row = collectorAll.value.find((i: any) => i.id === key);
          emits('change', row);
        } else {
          emits('change', {
            id: '*',
          });
        }
      }
    },
);

watch(
    () => searchValue.value,
    (value) => {
      if (!value) {
        setTimeout(() => {
          handleSearch(value);
        }, 0);
      }
    },
);
</script>

<style lang="less" scoped>
.tree-container {
  padding-right: 24px;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;

  .collector-list {
    flex: 1;
    min-height: 0;
    overflow-y: auto;

    :deep(.ant-tree-treenode) {
      width: 100%;

      .ant-tree-node-content-wrapper {
        flex: 1 1 auto;
        min-width: 0;
        padding: 0;

        .ant-tree-title {
          display: flex;
          justify-content: space-between;
          align-items: center;

          .tree-left-title {
            flex: 1 1 auto;
            min-width: 0;
          }

          .tree-left-tag {
            width: 70px;
            display: flex;
            justify-content: center;
          }

          .tree-left-tag2 {
            width: 50px;
            display: flex;
            justify-content: center;
          }
        }
      }
    }
  }
}
</style>
