<template>
  <div class="channel-collector" :style="{width: treeWidth, padding: foldTree ? '10px 0' : '0px'}">
    <div class="channel-collector-content">
      <a-flex style="width: 100%; padding: 0 8px 8px;" justify="space-between" :style="{borderBottom: viewType !== 'compact' ? '1px solid #e8e8e8' : 'none'}">
        <j-permission-button :hasPermission="true" :tooltip="{title: '收起'}" type="text" @click="foldTree = !foldTree">
          <AIcon style="font-size: 20px" type="InboxOutlined"></AIcon>
        </j-permission-button>
        <a-space>
          <a-button type="text">
            <AIcon style="font-size: 20px" type="FilterOutlined" :class="{'filter-active': filterIconActive}" @click="filterModalVisible = true"></AIcon>
          </a-button>
          <a-radio-group v-model:value="viewType" size="small">
            <a-radio-button value="compact">紧凑视图</a-radio-button>
            <a-radio-button value="separate">分离视图</a-radio-button>
          </a-radio-group>
        </a-space>
      </a-flex>
      <ActionButtons
        v-show="viewType === 'compact'"
        v-model="searchValue"
        @add="handleAdd"
      />
      <div v-show="viewType === 'compact'" class="channel-collector-tree">
        <a-spin :spinning="loading">
          <div class="all-node" :class="{'active': selectedKeys.includes('all')}" @click="() => treeSelect(['all'], {node: {dataRef: {id: 'all'}}})">
            <a-space>
              <AIcon type="AppstoreOutlined"></AIcon>
              <span>全部</span>
            </a-space>
          </div>
          <a-tree
            :tree-data="filterTreeData"
            :selected-keys="selectedKeys"
            :fieldNames="{ key: 'id' }"
            blockNode
            @select="treeSelect"
          >
            <template #title="node">
              <div v-if="!node.channelId">
                <NodeItem :node="node" :actions="() => channelActions(node)"/>
              </div>
              <div v-else>
                <NodeItem :node="node" :actions="() => collectorActions(node)"/>
              </div>
            </template>
            <template #switcherIcon="{ switcherCls }">
              <AIcon type="DownOutlined" :class="switcherCls"></AIcon>
            </template>
          </a-tree>
          <j-empty v-if="!filterTreeData.length"></j-empty>
        </a-spin>
      </div>
      <div v-show="viewType === 'separate'" class="channel-collector-separate">
        <div class="channel-box">
          <ActionButtons
            v-show="viewType === 'separate'"
            v-model="searchValue"
            @add="handleAdd"
          />
          <div class="all-node" :class="{'active': selectedKeys.includes('all')}" @click="() => treeSelect(['all'], {node: {dataRef: {id: 'all'}}})">
            <a-space>
              <AIcon type="AppstoreOutlined"></AIcon>
              <span>全部</span>
            </a-space>
          </div>
          <VirtualScroll :data="filterTreeData" :itemHeight="36">
            <template #renderItem="node">
              <div class="node-item" :class="{active: selectedKeys.includes(node.id)}" @click="treeSelect([node.id], {node: {...node, dataRef: node}})">
                <NodeItem :node="node" :actions="() => channelActions(node)"/>
              </div>
            </template>
          </VirtualScroll>
        </div>
        <a-divider style="height: 100%;" type="vertical"></a-divider>
        <div class="collector-box">
          <SearchInput v-model="collectorSearchValue" />
          <div style="height: 32px;line-height: 32px;margin-bottom: 8px;">
            共{{ filteredCollectors.length }}个采集器
          </div>
          <VirtualScroll :data="filteredCollectors" :itemHeight="60">
            <template #renderItem="node">
              <div class="node-item" :class="{active: selectedKeys.includes(node.id)}" @click="treeSelect([node.id], {node: {...node, dataRef: node}})">
                <NodeItem :node="node" :actions="() => collectorActions(node)"/>
              </div>
            </template>
          </VirtualScroll>
        </div>
      </div>
    </div>
    <div class="channel-collector-path">
      <a-space>
        <span class="switch-node" @click="switchNode('all')">全部</span>
        <span v-if="(selectedNode?.id !== 'all' && selectedNode?.isChannel) || selectedNode?.channelId">
          <a-space>
            <span>></span>
            <span class="switch-node" @click="switchNode(selectedNode?.channelId || selectedNode?.id)">{{ selectedNode?.channelName || selectedNode?.name }}</span>
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
    v-model:value="filterValue"
    @close="filterModalVisible = false"
  />
</template>
<script setup lang="ts">
import {
  queryNoPaging,
  remove as removeChannel,
  update as updateChannel,
} from "@data-collector-ui/api/data-collect/channel";
import {
  queryCollectorTree,
  update as updateCollector,
  remove as removeCollector,
 } from "@data-collector-ui/api/data-collect/collector";
import { protocolIcon, colorMap, updateStatus } from "./type";
import SaveChannel from "./SaveChannel/index.vue";
import SaveCollector from "./SaveCollector/index.vue";
import FilterModal from "./components/FilterModal.vue";
import NodeItem from "./components/NodeItem.vue";
import ActionButtons from "./components/ActionButtons.vue";
import SearchInput from "./components/SearchInput.vue";
import { useI18n } from "vue-i18n";
import { onlyMessage } from "@jetlinks-web/utils";
import type { ChannelEntity, CollectorEntity } from "./type";
import { FOLD_TREE, COLLECTOR_TYPE, COLLECTOR_DATA } from '../data'

const { t: $t } = useI18n();
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
const filterValue = ref<any>({})
const foldTree = inject(FOLD_TREE, false);
const nodeType = inject(COLLECTOR_TYPE);
const currentNode = inject(COLLECTOR_DATA);
const importType = ref<'channel' | 'collector'>('channel');

const viewType = ref('compact'); //视图类型
const treeWidth = computed(() => {
  if(!foldTree.value) {
    return viewType.value === 'compact' ? '300px' : '600px';
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
  if (!collectorSearchValue.value.trim()) {
    return separateViewCollectors.value;
  }
  return separateViewCollectors.value.filter(collector => {
    return collector.name.toLowerCase().includes(collectorSearchValue.value.toLowerCase());
  });
});
const filterTreeData = computed(() => {
  //根据过滤条件和搜索数据筛选树
  return treeData.value.filter((item) => {
    if(item.name.includes(searchValue.value)
      && (filterValue.value?.provider?.includes(item.provider) || !filterValue.value?.provider?.length)
      && (filterValue.value?.state?.includes(item.state?.value) || !filterValue.value?.state?.length)
      && (filterValue.value?.runningState?.includes(item.runningState?.value) || !filterValue.value?.runningState?.length)
    ) {
      // 如果有子节点（采集器），也需要过滤
      if (item.children && item.children.length > 0) {
        item.children = item.children.filter((child: any) => {
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

//通道节点按钮
const channelActions = (data: any) => {
  const state = data.state?.value;
  const stateText =
    state === "enabled"
      ? "禁用"
      : "启用";
  return [
    {
      text: "新增采集器",
      icon: "PlusCircleOutlined",
      key: "add",
      disabled: state === "disabled",
      tooltip: {
        title:
          state === "disabled"
          ? "请先启用通道，再新增采集器"
            : "新增采集器",
      },
      onClick: () => {
        // emit('change', 'add-collector', data);
        saveCollectorVisible.value = true;
        currentChannel.value = data;
        currentCollector.value = {};
      },
    },
    {
      text: "编辑",
      icon: "EditOutlined",
      key: "update",
      tooltip: {
        title: "编辑",
      },
      onClick: () => {
        saveChannelVisible.value = true;
        currentChannel.value = data;
      },
    },
    {
      text: stateText,
      icon: state === "disabled" ? "PlayCircleOutlined" : "StopOutlined",
      key: "action",
      tooltip: {
        title: stateText,
      },
      popConfirm: {
        title: `确认${stateText}`,
        onConfirm: async () => {
          const res = await updateChannel(data.id, updateStatus[state]);
          if (res.success) {
            onlyMessage("操作成功", "success");
            loadChannels();
          }
        },
      },
    },
    {
      text: "删除",
      icon: "DeleteOutlined",
      key: "delete",
      tooltip: {
        title:
          state === "enabled"
            ? "请先禁用该通道，再删除。"
            : "删除",
      },
      disabled: data?.state?.value !== "disabled",
      popConfirm: {
        placement: "topRight",
        title: "该操作将会删除下属采集器与点位，确定删除?",
        onConfirm: async () => {
          const response = await removeChannel(data.id);
          if (response.success) {
            onlyMessage("操作成功", "success");
            loadChannels();
          }
        },
      },
    },
  ];
};

//采集器节点按钮
const collectorActions = (data: any) => {
  const state = data.state?.value;
  const runningState = data.runningState?.value;
  const stateText =
    state === "enabled"
      ? "禁用"
      : "启用";
  return [
    {
      text: "编辑",
      icon: "EditOutlined",
      key: "update",
      onClick: () => {
        saveCollectorVisible.value = true;
        currentCollector.value = data;
        currentChannel.value = {};
      },
    },
    {
      text: state === "disabled" ? stateText : stateText,
      icon:
        state === "disabled"
          ? "PlayCircleOutlined"
          : "StopOutlined",
      key: "action",
      disabled: runningState === 'stopped' &&
      state !== 'disabled',
      tooltip: {
        title: stateText
      },
      popConfirm: {
        title: `确认${stateText}`,
        onConfirm: async () => {
          const res = await updateCollector(data.id, {
            state: state !== 'disabled' ? 'disabled' : 'enabled',
            runningState: state !== 'disabled' ? 'stopped' : 'running',
          });
          if (res.success) {
            onlyMessage("操作成功", "success");
            loadCollectors();
          }
        },
      },
    },
    {
      text: "删除",
      icon: "DeleteOutlined",
      key: "delete",
      tooltip: {
        title:
          state === "enabled"
            ? "请先禁用，再删除"
            : "删除",
      },
      disabled: state !== 'disabled',
      popConfirm: {
        placement: "topRight",
        title: "该操作将会删除下属点位，确定删除？",
        onConfirm: async () => {
          const response = await removeCollector(data.id);
          if (response.success) {
            handleDelete(data)
          }
        },
      },
    },
  ];
};

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
      name: '全部',
    };
  } catch (error) {
    console.error('加载数据失败:', error);
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
  if(id === 'all') {
    selectedNode.value = {
      id: 'all',
      name: '全部',
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

//插入节点
const addNode = (_data: any) => {
  if (!_data.channelId) {
    // 新增通道
    treeData.value.splice(1, 0, {
      ..._data,
      isLeaf: false,
      isChannel: true,
      children: [],
    });
  } else {
    // 新增采集器
    const find = (data: any[]) => {
      for (let i = 0; i < data.length; i++) {
        if (data[i].id === _data.channelId) {
          data[i].isLeaf = false;
          if (!data[i].children) {
            data[i].children = [];
          }
          data[i].children.unshift({
            ..._data,
            isLeaf: true,
            isChannel: false,
          });
          return;
        }
        if (data[i].children) {
          find(data[i].children);
        }
      }
    }
    find(treeData.value);
  }
}

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

  if(data.id === selectedKeys.value?.[0]) {
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
  if(data.id === selectedKeys.value?.[0]) {
    emit('change', 'collector', res.result?.[0]);
  }
  // 直接更新树形结构中的采集器节点
  updateNode(data.id!, res.result?.[0]);
}

//在树中点击删除
const handleDelete = (data: ChannelEntity | CollectorEntity) => {
  if(data.id === selectedKeys.value?.[0]) {
    handleChangeNode(['all'], {})
  }
  deleteNode(data.id!);
}

//采集器更新后更新树节点
const onSaveCollector = (type: string, val: Record<string, any>) => {
  saveCollectorVisible.value = false;
  loadCollectors();
};

//新增通道
const handleAdd = () => {
  saveChannelVisible.value = true;
  currentChannel.value = {};
};
defineExpose({
  refreshChannel: (data ) => refreshChannel(data),
  refreshCollector: (data) => refreshCollector(data),
  deleteNode: (id: string) => handleDelete({id: id}),
})
</script>

<style scoped lang="less">
.channel-collector {
  padding: 0 10px 10px 10px;
  width: 200px;
  height: 100%;
  transition: all 0.3s;
  box-sizing: border-box;
  overflow: hidden;
  position: relative;
  .channel-collector-content {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    height: calc(100% - 30px);
    //padding-top: 16px;
  }

  .channel-collector-path {
    height: 30px;
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
    overflow: auto;
    margin: 0 auto;
    padding: 0 8px;
    .channel-node {
      display: flex;
      justify-content: space-between;
      align-items: center;
      .menu-icon {
        display: none;
      }
      &:hover {
        .menu-icon {
          display: block;
        }
      }
    }

  }
  .all-node {
    padding: 8px;
    cursor: pointer;
    border-radius: 2px;
    margin-bottom: 4px;
    &:hover {
      background-color: #f5f5f5;
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
      padding: 10px;
    }
    .collector-box {
      width: 49%;
      padding: 10px;
    }
    .node-item {
      margin-left: 16px;
      cursor: pointer;
      padding: 8px 0;
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
