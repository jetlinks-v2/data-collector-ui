<template>
  <div class="channel-collector">
    <div class="channel-collector-content" direction="vertical">
      <a-button>
        <AIcon type="MenuFoldOutlined"></AIcon>
      </a-button>
      <a-input-search  placeholder="请输入通道名称" @search="handleSearch"></a-input-search>
      <div class="content-operation">
        <AIcon type="FilterOutlined" @click="filterModalVisible = true"></AIcon>
        <j-permission-button type="primary" @click="handleAdd">
          <AIcon type="PlusOutlined"></AIcon>
          新增通道
        </j-permission-button>
      </div>
      <div class="channel-collector-tree">
        <a-tree
          :tree-data="filterTreeData"
          :load-data="onLoadData"
          :selected-keys="selectedKeys"
          :fieldNames="{ key: 'id' }"
          blockNode
          @select="treeSelect"
        >
          <template #title="node">
            <div v-if="!node.channelId">
              <a-dropdown
                :key="node.id"
                class="menu-icon"
                :trigger="['contextmenu']"
              >
                <div class="hover-dropdown">
                  <a-space style="width: 100%">
                    <Icon
                      v-if="node.id !== '*'"
                      :type="protocolIcon[node.provider]"
                      style="font-size: 20px"
                    ></Icon>
                    <AIcon v-else type="AppstoreOutlined"></AIcon>
                    <j-ellipsis>
                      {{ node.name }}
                    </j-ellipsis>
                    <j-badge-status
                      v-if="node.id !== '*'"
                      :status="node.state?.value"
                      :statusNames="{
                        enabled: 'success',
                        disabled: 'error',
                      }"
                    ></j-badge-status>
                  </a-space>
                  <a-dropdown v-if="node.id !== '*'" trigger="click" @click.stop>
                    <div class="more-button">
                      <AIcon type="MoreOutlined"></AIcon>
                    </div>
                    <template #overlay>
                      <a-menu v-if="node.id !== '*'">
                        <a-menu-item
                          v-for="item in channelActions(node)"
                          :key="item.key"
                        >
                          <j-permission-button
                            type="text"
                            block
                            style="text-align: left"
                            :popConfirm="item.popConfirm"
                            :disabled="item.disabled"
                            :tooltip="item.tooltip"
                            @click="item.onClick"
                          >
                            <AIcon :type="item.icon"></AIcon>
                            {{ item.text }}
                          </j-permission-button>
                        </a-menu-item>
                      </a-menu>
                    </template>
                  </a-dropdown>
                </div>
                <template #overlay>
                  <a-menu v-if="node.id !== '*'">
                    <a-menu-item
                      v-for="item in channelActions(node)"
                      :key="item.key"
                    >
                      <j-permission-button
                        type="text"
                        block
                        style="text-align: left"
                        :popConfirm="item.popConfirm"
                        :disabled="item.disabled"
                        :tooltip="item.tooltip"
                        @click="item.onClick"
                      >
                        <AIcon :type="item.icon"></AIcon>
                        {{ item.text }}
                      </j-permission-button>
                    </a-menu-item>
                  </a-menu>
                </template>
              </a-dropdown>
            </div>
            <div v-else>
              <a-dropdown trigger="contextmenu">
                <div>
                  <div class="hover-dropdown">
                    <a-space style="font-size: 14px">
                      <j-ellipsis>
                        {{ node.name }}
                      </j-ellipsis>
                      <a-tag
                        class="tree-left-tag"
                        v-if="node.id !== '*'"
                        :color="
                          colorMap.get(
                            node.state?.value === 'disabled'
                              ? node.state?.value
                              : node?.runningState?.value
                          )
                        "
                        >{{
                          node.state?.value === "disabled"
                            ? node.state?.text
                            : node?.runningState?.text
                        }}
                      </a-tag>
                    </a-space>
                    <a-dropdown trigger="click" @click.stop>
                      <div class="more-button">
                        <AIcon type="MoreOutlined"></AIcon>
                      </div>
                      <template #overlay>
                        <a-menu>
                          <a-menu-item
                            v-for="item in collectorActions(node)"
                            :key="item.key"
                          >
                            <j-permission-button
                              type="text"
                              block
                              style="text-align: left"
                              :popConfirm="item.popConfirm"
                              :disabled="item.disabled"
                              :tooltip="item.tooltip"
                              @click="item.onClick"
                            >
                              <AIcon :type="item.icon"></AIcon>
                              {{ item.text }}
                            </j-permission-button>
                          </a-menu-item>
                        </a-menu>
                      </template>
                    </a-dropdown>
                  </div>
                  <div style="font-size: 12px; margin-top: 5px">
                    <a-space>
                      <AIcon type="icon-caijiqichufa"></AIcon>
                      点位数量{{ node.pointNumber }}
                    </a-space>
                  </div>
                </div>
                <template #overlay>
                  <a-menu>
                    <a-menu-item
                      v-for="item in collectorActions(node)"
                      :key="item.key"
                    >
                      <j-permission-button
                        type="text"
                        block
                        style="text-align: left"
                        :popConfirm="item.popConfirm"
                        :disabled="item.disabled"
                        :tooltip="item.tooltip"
                        @click="item.onClick"
                      >
                        <AIcon :type="item.icon"></AIcon>
                        {{ item.text }}
                      </j-permission-button>
                    </a-menu-item>
                  </a-menu>
                </template>
              </a-dropdown>
            </div>
          </template>
          <template #switcherIcon="{ switcherCls }">
            <AIcon type="DownOutlined" :class="switcherCls"></AIcon>
          </template>
        </a-tree>
        <j-empty v-if="!filterTreeData.length"></j-empty>
      </div>
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
  <FilterModal v-if="filterModalVisible" v-model:value="filterValue" @close="filterModalVisible = false"/>
</template>
<script setup lang="ts">
import {
  queryNoPaging,
  remove as removeChannel,
  update as updateChannel,
} from "@collector/api/data-collect/channel";
import { 
  queryCollectorTree,
  update as updateCollector,
  remove as removeCollector,
 } from "@collector/api/data-collect/collector";
import Icon from "./components/Icon.vue";
import { protocolIcon, colorMap, updateStatus } from "./type";
import SaveChannel from "./SaveChannel/index.vue";
import SaveCollector from "./SaveCollector/index.vue";
import FilterModal from "./components/FilterModal.vue";
import { useI18n } from "vue-i18n";
import { onlyMessage } from "@jetlinks-web/utils";
import type { ChannelEntity, CollectorEntity } from "./type";

const { t: $t } = useI18n();
const props = defineProps({
  isCollapse: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["change"]);
const treeData = ref<any[]>([]);
const selectedKeys = ref<string[]>([]);
const saveChannelVisible = ref(false);
const saveCollectorVisible = ref(false);
const filterModalVisible = ref(false);
const currentChannel = ref<ChannelEntity>({});
const currentCollector = ref<CollectorEntity>({});
const searchValue = ref('');
const filterValue = ref<any>({})
const filterTreeData = computed(() => {
  //根据过滤条件和搜索数据筛选树
  return treeData.value.filter((item) => {
    return item.name.includes(searchValue.value);
  })
})

//通道节点按钮
const channelActions = (data: any) => {
  const state = data.state?.value;
  const stateText =
    state === "enabled"
      ? $t("Channel.index.290640-7")
      : $t("Channel.index.290640-12");
  return [
    {
      text: "新增采集器",
      icon: "PlusCircleOutlined",
      key: "add-collector",
      disabled: state === "disabled",
      tooltip: {
        title:
          state === "disabled"
          ? '请先启用通道，再新增采集器'
            : '新增采集器',
      },
      onClick: () => {
        // emit('change', 'add-collector', data);
        saveCollectorVisible.value = true;
        currentChannel.value = data;
        currentCollector.value = {};
      },
    },
    {
      text: $t("Channel.index.290640-13"),
      icon: "EditOutlined",
      key: "edit-channel",
      tooltip: {
        title: $t("Channel.index.290640-13"),
      },
      onClick: () => {
        saveChannelVisible.value = true;
        currentChannel.value = data;
      },
    },
    {
      text: stateText,
      icon: state === "disabled" ? "PlayCircleOutlined" : "StopOutlined",
      key: "action-channel",
      tooltip: {
        title: stateText,
      },
      popConfirm: {
        title: $t("Channel.index.290640-14", [stateText]),
        onConfirm: async () => {
          const res = await updateChannel(data.id, updateStatus[state]);
          if (res.success) {
            onlyMessage($t("Channel.index.290640-15"), "success");
            refreshChannel(data)
          }
        },
      },
    },
    {
      text: $t("Channel.index.290640-16"),
      icon: "DeleteOutlined",
      key: "delete-channel",
      tooltip: {
        title:
          state === "enabled"
            ? $t("Channel.index.290640-17")
            : $t("Channel.index.290640-16"),
      },
      disabled: data?.state?.value !== "disabled",
      popConfirm: {
        placement: "topRight",
        title: $t("Channel.index.290640-18"),
        onConfirm: async () => {
          const response = await removeChannel(data.id);
          if (response.success) {
            onlyMessage($t("Channel.index.290640-15"), "success");
            handleDelete(data);
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
      ? $t("Channel.index.290640-7")
      : $t("Channel.index.290640-12");
  return [
    {
      text: "编辑",
      icon: "EditOutlined",
      key: "edit-collector",
      onClick: () => {
        saveCollectorVisible.value = true;
        currentCollector.value = data;
        currentChannel.value = {};
      },
    },
    {
      text: state === "disabled" ? "启用" : "禁用",
      icon:
        state === "disabled"
          ? "PlayCircleOutlined"
          : "StopOutlined",
      key: "enable-collector",
      disabled: runningState === 'stopped' &&
      state !== 'disabled',
      tooltip: {
        title: stateText
      },
      popConfirm: {
        title: $t("Channel.index.290640-14", [stateText]),
        onConfirm: async () => {
          const res = await updateCollector(data.id, {
            state: state !== 'disabled' ? 'disabled' : 'enabled',
            runningState: state !== 'disabled' ? 'stopped' : 'running',
          });
          if (res.success) {
            onlyMessage($t("Channel.index.290640-15"), "success");
            refreshCollector(data);
          }
        },
      },
    },
    {
      text: $t("Channel.index.290640-16"),
      icon: "DeleteOutlined",
      key: "delete-collector",
      tooltip: {
        title:
          state === "enabled"
            ? $t('Tree.index.4001410-7')
            : $t('Tree.index.4001410-8'),
      },
      disabled: state !== 'disabled',
      popConfirm: {
        placement: "topRight",
        title: $t('Tree.index.4001410-9'),
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

//搜索
const handleSearch = (val: string) => {
  searchValue.value = val;
}
//查询通道列表
const getChannelList = async () => {
  const res = await queryNoPaging({
    sorts: [
      {
        name: "createTime",
        order: "desc",
      },
    ],
  });
  if (res.success) {
    treeData.value = res.result.map((item: ChannelEntity) => {
      return {
        ...item,
        isLeaf: item.collectorNumber === 0,
        isChannel: true,
      };
    });
    treeData.value.unshift({
      name: "全部",
      id: "*",
      isLeaf: true,
    });
    selectedKeys.value = ["*"];
  }
};

getChannelList();

//异步加载采集器节点
const onLoadData = (node: any) => {
  return new Promise((resolve) => {
    if (node.dataRef.children) {
      resolve(node.dataRef.children);
      return;
    }
    queryCollectorTree({
      sorts: [
        {
          name: "createTime",
          order: "desc",
        },
      ],
      terms: [
        {
          column: "channelId",
          value: node.dataRef.id,
        },
      ],
    }).then((res: any) => {
      if (res.success) {
        node.dataRef.children = res.result.map((item) => {
          return {
            ...item,
            isLeaf: true,
          };
        });
      }
      treeData.value = [...treeData.value];
      resolve(node.dataRef.children);
    });
  });
};

//选中节点
const treeSelect = (keys: string[], e: any) => {
  // visibleMenu.value = false;
  handleChangeNode([e.node.id], e.node.dataRef)
};

//传递选中节点信息
const handleChangeNode = (keys: string[], node: any) => {
  selectedKeys.value = keys;
  emit(
    "change",
    keys[0] === "*" ? "*" : node?.isChannel ? "channel" : "collector",
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
  if (!Object.keys(currentChannel.value).length) {
    treeData.value.splice(1, 0, {
      ..._data,
      isLeaf: true,
      isChannel: true,
    });
  } else {
    const find = (data: any[]) => {
      for (let i = 0; i < data.length; i++) {
        if (data[i].id === currentChannel.value?.id) {
          data[i].isLeaf = false;
          data[i].children?.unshift({
            ..._data,
            isLeaf: true,
          });
          return;
        }
      }
    }
    find(treeData.value);
  }
}

//通道新增或编辑成功后执行
const onSaveChannelSuccess = async (val: Record<string, any>) => {
  if(typeof val === 'object') {
    addNode(val)
  } else {
    refreshChannel(currentChannel.value)
  }
  saveChannelVisible.value = false;
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
    terms: [
      {
        column: "channelId",
        value: data?.id,
      },
    ],
  });
  treeData.value.find(item => item.id === data.id).children = resp.result.map((item) => {
    return {
      ...item,
      isLeaf: true,
    };
  });
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
  updateNode(data.id!, res.result?.[0]);
}

//在树中点击删除
const handleDelete = (data: ChannelEntity | CollectorEntity) => {
  if(data.id === selectedKeys.value?.[0]) {
    handleChangeNode(['*'], {})
  }
  deleteNode(data.id!);
}

//采集器更新后更新树节点
const onSaveCollector = (type: string, val: Record<string, any>) => {
  saveCollectorVisible.value = false;
  if(type === 'add') {
    addNode(val)
  } else {
    refreshCollector(currentCollector.value)
  }
};

//新增通道
const handleAdd = () => {
  saveChannelVisible.value = true;
  currentChannel.value = {};
};
</script>

<style scoped lang="less">
.channel-collector {
  padding: 10px;
  width: 350px;
  transition: all 0.3s;
  .channel-collector-content {
    display: flex;
    flex-direction: column;
    gap: 10px;
    align-items: flex-start;
    .content-operation {
      width: 100%;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0 10px;
    }
  }
  .channel-collector-tree {
    height: calc(100vh - 300px);
    width: 100%;
    overflow: auto;
    margin: 0 auto;
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
    .hover-dropdown {
      display: flex;
      justify-content: space-between;
      .more-button {
        display: none;
        padding: 0 5px;
      }
      &:hover {
       .more-button {
          display: block;
        }
      }
    }
  }
}
</style>
