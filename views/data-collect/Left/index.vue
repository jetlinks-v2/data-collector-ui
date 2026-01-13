<template>
  <div class="channel-collector" :style="{width: treeWidth, padding: foldTree ? '16px 0' : '0px'}">
    <div class="channel-collector-content">
      <a-flex style="width: 100%; padding: 0 8px 8px;" justify="space-between"
              :style="{borderBottom: viewType !== 'compact' ? '1px solid #e8e8e8' : 'none'}">
        <j-permission-button style="padding: 0" :hasPermission="true" :tooltip="{title: $t('DataCollect.index.400150-0')}" type="text"
                             @click="foldTree = !foldTree">
          <AIcon style="font-size: 18px" type="InboxOutlined"></AIcon>
        </j-permission-button>
        <a-space>
          <a-button type="text" style="padding: 0">
            <AIcon style="font-size: 18px" type="FilterOutlined" :class="{'filter-active': filterIconActive}"
                   @click="filterModalVisible = true"></AIcon>
          </a-button>
          <a-radio-group v-model:value="viewType" size="small">
            <a-radio-button value="compact">{{ $t('DataCollect.index.400150-1') }}</a-radio-button>
            <a-radio-button value="separate">{{ $t('DataCollect.index.400150-2') }}</a-radio-button>
          </a-radio-group>
        </a-space>
      </a-flex>
      <ActionButtons
          v-if="viewType === 'compact'"
          v-model="searchValue"
          :channelList="channelList"
          @add="handleAdd"
      />
      <div v-show="viewType === 'compact'" class="channel-collector-tree">
        <a-spin :spinning="loading">
          <div class="all-node"
               :class="{'active': selectedKeys.includes('all')}"
               @click="() => treeSelect(['all'], {node: {dataRef: {id: 'all'}}})"
          >
            <a-space>
              <AIcon type="AppstoreFilled"></AIcon>
              <span>{{ $t('DataCollect.index.400150-3') }}</span>
            </a-space>
          </div>
          <j-empty v-if="!filterTreeData.length"></j-empty>
          <a-tree
              :tree-data="filterTreeData"
              :selected-keys="selectedKeys"
              :fieldNames="{ key: 'id' }"
              blockNode
              @select="treeSelect"
          >
            <template #title="node">
              <div v-if="!node.channelId">
                <NodeItem :node="node" :actions="() => getChannelActions(node, onChannelAction)"/>
              </div>
              <div v-else>
                <NodeItem :node="node" :actions="() => getCollectorActions(node, onCollectorAction)"/>
              </div>
            </template>
            <template #switcherIcon="{ switcherCls }">
              <AIcon type="DownOutlined" :class="switcherCls"></AIcon>
            </template>
          </a-tree>
        </a-spin>
      </div>
      <div v-show="viewType === 'separate'" class="channel-collector-separate">
        <div class="channel-box">
          <ActionButtons
              v-if="viewType === 'separate'"
              v-model="searchValue"
              @add="handleAdd"
          />
          <div class="all-node" :class="{'active': selectedKeys.includes('all')}"
               @click="() => treeSelect(['all'], {node: {dataRef: {id: 'all'}}})">
            <a-space>
              <AIcon type="AppstoreOutlined"></AIcon>
              <span>{{ $t('DataCollect.index.400150-3') }}</span>
            </a-space>
          </div>
          <j-empty v-if="!filterTreeData.length"></j-empty>
          <VirtualScroll :data="filterTreeData" :itemHeight="36">
            <template #renderItem="node">
              <div class="tree-node-item" :class="{active: selectedKeys.includes(node.id)}"
                   @click="treeSelect([node.id], {node: {...node, dataRef: node}})">
                <NodeItem :node="node" :actions="() => getChannelActions(node, onChannelAction)"/>
              </div>
            </template>
          </VirtualScroll>
        </div>
        <a-divider style="height: 100%;" type="vertical"></a-divider>
        <div class="collector-box">
          <div style="display: flex; align-items: center">
            <div style="height: 32px;line-height: 32px;margin-bottom: 8px;">
              {{ $t('DataCollect.index.400150-4', [filteredCollectors.length]) }}
            </div>
            <div style="flex: 1; min-width: 0">
              <SearchInput v-model="collectorSearchValue"/>
            </div>
          </div>
          <div v-if="!filteredCollectors.length" style="margin-top: 100px">
            <j-empty></j-empty>
          </div>
          <VirtualScroll :data="filteredCollectors" :itemHeight="68">
            <template #renderItem="node">
              <div class="node-item" :class="{active: selectedKeys.includes(node.id)}"
                   @click="treeSelect([node.id], {node: {...node, dataRef: node}})">
                <NodeItem :node="node" :actions="() => getCollectorActions(node, onCollectorAction)"/>
              </div>
            </template>
          </VirtualScroll>
        </div>
      </div>
    </div>
    <div class="channel-collector-path">
      <a-space>
        <span class="switch-node" @click="switchNode('all')">{{ $t('DataCollect.index.400150-3') }}</span>
        <span v-if="(selectedNode?.id !== 'all' && selectedNode?.isChannel) || selectedNode?.channelId">
          <a-space>
            <span>></span>
            <span class="switch-node" @click="switchNode(selectedNode?.channelId || selectedNode?.id)">{{
                selectedNode?.channelName || selectedNode?.name
              }}</span>
          </a-space>
        </span>
        <span v-if="selectedNode?.id !== 'all' && selectedNode?.isLeaf && selectedNode?.channelId">
          <a-space>
            <span>></span>
            <span class="switch-node">{{ selectedNode?.name }}</span>
          </a-space>
        </span>
      </a-space>
    </div>
  </div>
  <SaveChannel
      v-if="saveChannelVisible"
      :data="currentChannel"
      @close="saveChannelVisible = false"
      @saveSuccess="onSaveChannelSuccess"
  />
  <SaveCollector
      v-if="saveCollectorVisible"
      :channel="currentChannel"
      :data="currentCollector"
      @close="saveCollectorVisible = false"
      @save="onSaveCollector"
  />
  <FilterModal
      v-if="filterModalVisible"
      @close="filterModalVisible = false"
      @save="onFilterSave"
  />
</template>
<script setup lang="ts">
import {
  queryNoPaging,
} from "@data-collector-ui/api/data-collect/channel";
import {
  queryCollectorTree,
} from "@data-collector-ui/api/data-collect/collector";
import SaveChannel from "./SaveChannel/index.vue";
import SaveCollector from "./SaveCollector/index.vue";
import FilterModal from "./components/FilterModal.vue";
import NodeItem from "./components/NodeItem.vue";
import ActionButtons from "./components/ActionButtons.vue";
import SearchInput from "./components/SearchInput.vue";
import {useI18n} from "vue-i18n";
import type {ChannelEntity, CollectorEntity} from "./type";
import {FOLD_TREE, COLLECTOR_TYPE, COLLECTOR_DATA} from '../data'
import {getChannelActions, getCollectorActions} from "@data-collector-ui/views/data-collect/utils";

const {t: $t} = useI18n();
const props = defineProps({
  isCollapse: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["change"]);
const treeData = computed(() => {
  const channels = channelList.value.map((item: ChannelEntity) => {
    return {
      ...item,
      isChannel: true,
      isLeaf: false,
      children: [], // 初始化子节点数组
    };
  });
  const collectors = collectorList.value;
  // 为每个通道添加对应的采集器
  channels.forEach((channel: any) => {
    const channelCollectors = collectors
        .filter((collector: any) => collector.channelId === channel.id)
        .map((collector: any) => ({
          ...collector,
          isChannel: false,
          isLeaf: true,
          channelId: channel.id,
          channelName: channel.name,
        }));

    channel.children = channelCollectors;

    // 如果通道没有采集器，设置为叶子节点
    if (channelCollectors.length === 0) {
      channel.isLeaf = true;
    }
  });
  return channels;
});
const loading = ref(false)
const channelList = ref<any[]>([]);
const collectorList = ref<any[]>([]);
const selectedKeys = ref<string[]>([]);
const saveChannelVisible = ref(false);
const saveCollectorVisible = ref(false);
const filterModalVisible = ref(false);
const importModalVisible = ref(false);
const currentChannel = ref<ChannelEntity>({});
const currentCollector = ref<CollectorEntity>({});
const searchValue = ref('');
const collectorSearchValue = ref(''); // 采集器搜索值
const foldTree = inject(FOLD_TREE, false);
const nodeType = inject(COLLECTOR_TYPE);
const currentNode = inject(COLLECTOR_DATA);
const importType = ref<'channel' | 'collector'>('channel');

const filterValue = ref({})

const _filterValue = inject('filter-value', reactive({
  channel: false,
  collector: false,
  point: false
}))

const viewType = ref('compact'); //视图类型
const treeWidth = computed(() => {
  if (!foldTree.value) {
    return viewType.value === 'compact' ? '312px' : '624px';
  } else {
    return '0'
  }
});

const selectedNode = ref<any>({});

const filterIconActive = computed(() => {
  return Object.keys(filterValue.value).some(item => filterValue.value?.[item]?.length);
})

// 分离视图中的采集器数据
const separateViewCollectors = ref<any[]>([]);

// 过滤后的采集器列表（用于搜索）
const filteredCollectors = computed(() => {
  const arr: any[] = []
  filterTreeData.value.forEach(item => {
    if(nodeType.value === 'all') {
      arr.push(...item.children)
    } else if(currentNode.value?.id === item.id || (nodeType.value === 'collector' && currentNode.value?.channelId === item.id)) {
      arr.push(...item.children)
    }
  })
  if (!collectorSearchValue.value.trim()) {
    return arr
  }
  return arr.filter(collector => {
    return collector.name.toLowerCase().includes(collectorSearchValue.value.toLowerCase());
  });
});

const filterTreeData = computed(() => {
  //根据过滤条件和搜索数据筛选树
  return treeData.value.filter((item) => {
    if (item.name.includes(searchValue.value)
        && (filterValue.value?.provider?.includes(item.provider) || !filterValue.value?.provider?.length)
        && (filterValue.value?.state?.includes(item.state?.value) || !filterValue.value?.state?.length)
        && (filterValue.value?.runningState?.includes(item.runningState?.value) || !filterValue.value?.runningState?.length)
    ) {
      const arr: any[] = separateViewCollectors.value.filter((collector: any) => collector.channelId === item.id)
      // 如果有子节点（采集器），也需要过滤
      if (arr.length) {
        item.children = arr.filter((child: any) => {
          console.log(filterValue.collectorState)
          console.log(child.runningState?.value)
          console.log(child.state?.value)
          return child.name.includes(searchValue.value) &&
              (filterValue.value?.collectorState?.includes(child.runningState?.value) ||
                  filterValue.value?.collectorState?.includes(child.state?.value) ||
                  !filterValue.value?.collectorState?.length)
        });
      }
      return true;
    }
  });
})

const onFilterSave = () => {
  filterModalVisible.value = false
  selectedKeys.value = ["all"];
  selectedNode.value = {
    id: 'all',
    name: $t('DataCollect.index.400150-3'),
  };
}

//通道节点按钮
const onChannelAction = (key, data) => {
  if (key === 'add-collector') {
    saveCollectorVisible.value = true;
    currentChannel.value = data;
    currentCollector.value = {};
  } else if (key === 'update') {
    saveChannelVisible.value = true;
    currentChannel.value = data;
  } else {
    loadChannels();
  }
}

const onCollectorAction = (key, data) => {
  if (key === 'update') {
    saveCollectorVisible.value = true;
    currentCollector.value = data;
    currentChannel.value = {};
  } else {
    loadCollectors();
  }
}

//加载所有数据
const loadAllData = async () => {
  try {
    // 1. 获取所有通道
    await loadChannels();
    await loadCollectors();
    // 设置默认选中全部
    selectedKeys.value = ["all"];
    selectedNode.value = {
      id: 'all',
      name: $t('DataCollect.index.400150-3'),
    };
  } catch (error) {
    console.error($t('DataCollect.index.400150-5'), error);
  }
};

//获取通道列表
const loadChannels = async () => {
  loading.value = true;
  const res = await queryNoPaging({
    sorts: [
      {
        name: "createTime",
        order: "desc",
      },
    ],
  }).finally(() => {
    loading.value = false;
  });
  if (res.success) {
    channelList.value = res.result;
  }
};

//获取采集器列表
const loadCollectors = async () => {
  loading.value = true;
  const res = await queryCollectorTree({
    sorts: [
      {
        name: "createTime",
        order: "desc",
      },
    ],
  }).finally(() => {
    loading.value = false;
  });
  if (res.success) {
    collectorList.value = res.result;
    // 更新分离视图的采集器数据（显示所有采集器）
    separateViewCollectors.value = collectorList.value.map((collector: any) => ({
      ...collector,
      isLeaf: true,
    }));
  }
}

// 页面加载时获取所有数据
loadAllData();


const switchNode = (id: string) => {
  selectedNode.value = treeData.value.find((item: any) => item.id === id);
  selectedKeys.value = [id];
  if (id === 'all') {
    selectedNode.value = {
      id: 'all',
      name: $t('DataCollect.index.400150-3'),
    };
    nodeType.value = 'all';
  } else {
    nodeType.value = 'channel';
  }
  currentNode.value = selectedNode.value
}

//选中节点
const treeSelect = async (keys: any[], e: any) => {
  // visibleMenu.value = false;
  const keyArray = Array.isArray(keys) ? keys.map(k => String(k)) : [String(keys)];
  const nodeData = e.node.dataRef || e.node;

  handleChangeNode(keyArray, nodeData)
  nodeType.value = nodeData.id === 'all' ? 'all' : nodeData.isChannel ? 'channel' : 'collector';
  currentNode.value = nodeData;

  // 处理分离视图的采集器列表显示
  if (viewType.value === 'separate') {
    if (nodeData.id === 'all') {
      // 点击全部，显示所有采集器
      separateViewCollectors.value = []
      treeData.value.forEach((item: any) => {
        separateViewCollectors.value.push(...item.children);
      })
    } else if (nodeData.isChannel && nodeData.children) {
      // 点击通道，显示该通道下的采集器
      separateViewCollectors.value = nodeData.children.map((collector: any) => ({
        ...collector,
        isLeaf: true,
      }));
    }
  }
};


//传递选中节点信息
const handleChangeNode = (keys: string[], node: any) => {
  selectedNode.value = node;
  selectedKeys.value = keys;
  emit(
      "change",
      keys[0] === "all" ? "all" : node?.isChannel ? "channel" : "collector",
      node
  );
};

//修改节点信息
const updateNode = (id: string, _data: any) => {
  const find = (data: any[]) => {
    for (let i = 0; i < data.length; i++) {
      if (data[i].id === id) {
        data[i] = {
          ..._data,
          isLeaf: data[i].isChannel ? data[i].collectorNumber === 0 : true,
          isChannel: data[i].isChannel,
          children: data[i].children,
        };
        return;
      }
      if (data[i].children) {
        find(data[i].children);
      }
    }
  };
  find(treeData.value);
};

//删除节点
const deleteNode = (id: string) => {
  const find = (data: any[]) => {
    for (let i = 0; i < data.length; i++) {
      if (data[i].id === id) {
        data.splice(i, 1);
        return;
      }
      if (data[i].children) {
        find(data[i].children);
      }
    }
  };
  find(treeData.value);
};

//通道新增或编辑成功后执行
const onSaveChannelSuccess = async (val: Record<string, any>) => {
  saveChannelVisible.value = false;
  loadAllData();
};

//编辑通道后重新请求通道接口更新通道节点
const refreshChannel = async (data: ChannelEntity) => {
  const res = await queryNoPaging({
    terms: [
      {
        column: "id",
        value: data?.id,
      },
    ],
  });
  const resp = await queryCollectorTree({
    sorts: [
      {
        name: "createTime",
        order: "desc",
      },
    ],
    terms: [
      {
        column: "channelId",
        value: data?.id,
      },
    ],
  });

  const node = treeData.value.find(item => item.id === data.id);
  if (node) {
    node.children = resp.result.map((item: any) => ({
      ...item,
      isLeaf: true,
      isChannel: false,
      channelId: data.id,
      channelName: data.name,
    }));
  }

  if (data.id === selectedKeys.value?.[0]) {
    emit('change', 'channel', res.result?.[0]);
  }
  updateNode(data.id!, res.result?.[0]);
}

//编辑采集器后重新请求采集器接口更新采集器节点
const refreshCollector = async (data: CollectorEntity) => {
  const res = await queryCollectorTree({
    terms: [
      {
        column: "id",
        value: data?.id,
      },
    ],
  });
  if (data.id === selectedKeys.value?.[0]) {
    emit('change', 'collector', res.result?.[0]);
  }
  // 直接更新树形结构中的采集器节点
  updateNode(data.id!, res.result?.[0]);
}

//在树中点击删除
const handleDelete = (data: ChannelEntity | CollectorEntity) => {
  if (data.id === selectedKeys.value?.[0]) {
    handleChangeNode(['all'], {})
  }
  deleteNode(data.id!);
}

//采集器更新后更新树节点
const onSaveCollector = () => {
  saveCollectorVisible.value = false;
  loadCollectors();
};

//新增通道
const handleAdd = () => {
  saveChannelVisible.value = true;
  currentChannel.value = {};
};

watch(() => _filterValue, () => {
  if (_filterValue.channel || _filterValue.collector) {
    filterValue.value = {
      ...filterValue.value,
      runningState: _filterValue.channel ? ['stopped'] : filterValue.value.runningState,
      state: _filterValue.channel ? ['disabled'] : filterValue.value.state,
      collectorState: _filterValue.collector ? [
        "disabled",
        "stopped"
      ] : filterValue.value.collectorState
    }
    handleChangeNode(['all'], {})
  }
}, {
  immediate: true,
  deep: true
})

defineExpose({
  refreshChannel: (data) => refreshChannel(data),
  refreshCollector: (data) => refreshCollector(data),
  deleteNode: (id: string) => handleDelete({id: id}),
  loadAllData: () => loadAllData(),
})
</script>

<style scoped lang="less">
.channel-collector {
  height: 100%;
  transition: all 0.3s;
  box-sizing: border-box;
  overflow: hidden;
  position: relative;

  .channel-collector-content {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    height: calc(100% - 40px);
    padding: 16px;
  }

  .filter-active {
    color: @primary-color;
  }

  .channel-collector-path {
    height: 40px;
    width: 100%;
    display: flex;
    align-items: center;
    border-top: 1px solid #e8e8e8;
    position: absolute;
    bottom: 0;
    padding-left: 10px;

    .switch-node {
      cursor: pointer;
    }
  }

  .channel-collector-tree {
    width: 100%;
    min-height: 0;
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow-y: auto;

    :deep(.ant-tree-treenode) {
      margin: 4px 0;

      &:has(.channel-node) {
        border-radius: 4px;
        background-color: #F5F5F5;
        height: 32px;
        padding-top: 4px;
        padding-left: 4px;
      }

      &:has(.ant-tree-node-selected) {
        background-color: #e6f4ff;
      }

      &:has(.device-node) {
        height: 64px;
        border-radius: 4px;
        border: 1px solid #F5F5F5;
        padding-top: 4px;
      }

      &:hover {
        background-color: #e6f4ff;
      }

      .ant-tree-node-content-wrapper:hover {
        background-color: transparent;
      }

      .ant-tree-indent-unit {
        width: 0;
      }
    }
  }

  .all-node {
    padding: 8px 12px;
    cursor: pointer;
    border-radius: 4px;
    margin-bottom: 4px;
    background-color: #f5f5f5;

    &:hover {
      background-color: #e6f4ff;
    }

    &.active {
      background-color: #e6f4ff;
    }
  }

  .search-input-wrapper {
    position: relative;
    width: 32px;
    overflow: hidden;
    transition: width 0.3s ease-in-out;

    &.expanded {
      width: 200px;
    }

    .search-input {
      width: 100%;
      animation: expandWidth 0.3s ease-in-out forwards;
    }
  }

  .channel-collector-separate {
    display: flex;
    height: 100%;
    width: 100%;

    .channel-box {
      width: 49%;
      padding: 10px 0;
    }

    .collector-box {
      width: 49%;
      padding: 10px 0;
    }

    .tree-node-item {
      background-color: #F5F5F5;
      height: 32px;
      padding: 6px 12px 0 12px;
      border-radius: 4px;
      cursor: pointer;

      &:hover {
        background-color: #e6f4ff;
      }

      &.active {
        background-color: #e6f4ff;
      }
    }

    .node-item {
      cursor: pointer;
      padding: 8px 16px;
      border: 1px solid #F5F5F5;
      border-radius: 4px;

      &:hover {
        background-color: #f5f5f5;
      }

      &.active {
        background-color: #e6f4ff;
      }
    }
  }

  @keyframes expandWidth {
    from {
      width: 0;
      opacity: 0;
    }
    to {
      width: 100%;
      opacity: 1;
    }
  }
}
</style>
