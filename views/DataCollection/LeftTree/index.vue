<template>
  <div class="channel-collector">
    <a-space direction="vertical">
      <a-button>
        <AIcon type="MenuFoldOutlined"></AIcon>
      </a-button>
      <a-input-search placeholder="请输入"></a-input-search>
      <a-space>
        <AIcon type="FilterOutlined"></AIcon>
        <a-button></a-button>
      </a-space>
      <div class="channel-collector-tree">
        <a-tree
          :tree-data="treeData"
          :load-data="onLoadData"
          :selected-keys="selectedKeys"
          :fieldNames="{ key: 'id' }"
          blockNode
          @select="treeSelect"
        >
          <template #title="node">
            <div v-if="!node.channelId">
              <a-dropdown :key="node.id" class="menu-icon" :trigger="['contextmenu']">
                <a-space style="width: 100%;">
                  <Icon v-if="node.id !== '*'" :type="protocolIcon[node.provider]" style="font-size: 20px;"></Icon>
                  <AIcon v-else type="AppstoreOutlined"></AIcon>
                  <j-ellipsis>
                    {{node.name}}
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
                <template #overlay>
                  <a-menu v-if="node.id !== '*'">
                    <a-menu-item v-for="item in channelActions(node)" :key="item.key">
                      <j-permission-button type="text" block style="text-align: left">
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
                  <a-space style="font-size: 14px;">
                    <j-ellipsis>
                      {{node.name}}
                    </j-ellipsis>
                    <a-tag
                      class="tree-left-tag"
                      v-if="node.id !== '*'"
                      :color="colorMap.get(node.state?.value === 'disabled' ? node.state?.value : node?.runningState?.value)"
                    >{{ node.state?.value === 'disabled' ? node.state?.text : node?.runningState?.text }}
                    </a-tag>
                  </a-space>
                  <div style="font-size: 12px;margin-top: 5px;">
                    <a-space>
                      <AIcon type="icon-caijiqichufa"></AIcon>
                      点位数量{{ node.pointNumber }}
                    </a-space>
                  </div>
                </div>
                <template #overlay>
                  <a-menu>
                    <a-menu-item v-for="item in collectorActions(node)" :key="item.key">
                      <j-permission-button type="text" block style="text-align: left">
                        <AIcon :type="item.icon"></AIcon>
                        {{ item.text }}
                      </j-permission-button>
                    </a-menu-item>
                  </a-menu>
                </template>
              </a-dropdown>
            </div>
          </template>
          <template #switcherIcon="{switcherCls}">
            <AIcon type="DownOutlined" :class="switcherCls"></AIcon>
          </template>
        </a-tree>
      </div>
    </a-space>
  </div>
  <!-- <SaveChannel /> -->
</template>
<script setup lang="ts">
import type from '@/modules/device-manager-ui/components/Metadata/components/Type/data';
import { queryNoPaging } from '@collector/api/data-collect/channel';
import { queryCollectorTree } from '@collector/api/data-collect/collector';
import Icon from './components/Icon.vue';
import { protocolIcon, colorMap } from './type';
import SaveChannel from './SaveChannel/index.vue';

const props = defineProps({
  isCollapse: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['change']);
const visibleMenu = ref(false);
const treeData = ref<any[]>([]);
const selectedKeys = ref<string[]>([]);
const channelActions = (data: any) => {
  return [
    {
      text: '新增采集器',
      icon: 'PlusCircleOutlined',
      key: 'add-collector',
      onClick: () => {
        // emit('change', 'add-collector', data);
      },
    },
    {
      text: '编辑',
      icon: 'EditOutlined',
      key: 'edit-channel',
      onClick: () => {
        
      }
    },
    {
      text: data?.state?.value === 'disabled' ? '启用' : '禁用',
      icon: data?.state?.value === 'disabled' ? 'PlayCircleOutlined' : 'StopOutlined',
      key: 'enable-channel',
    },
    {
      text: '删除',
      icon: 'DeleteOutlined',
      key: 'delete-channel',
    }
  ]
}

//采集器节点按钮
const collectorActions = (data: any) => {
  return [
    {
      text: '编辑',
      icon: 'EditOutlined',
      key: 'edit-collector',
    },
    {
      text: data?.state?.value === 'disabled'? '启用' : '禁用',
      icon: data?.state?.value === 'disabled'? 'PlayCircleOutlined' : 'StopOutlined',
      key: 'enable-collector',
    },
    {
      text: '删除',
      icon: 'DeleteOutlined',
      key: 'delete-collector',
    }
  ] 
}
//查询通道列表
const getChannelList = async () => {
  const res = await queryNoPaging({
    sorts: [
      {
        name: 'createTime',
        order: 'desc'
      }
    ]
  });
  if (res.success) {
    treeData.value = res.result.map(item => {
      return {
        ...item,
        isLeaf: item.collectorNumber === 0,
        isChannel: true,
      }
    })
    treeData.value.unshift({
      name: '全部',
      id: '*',
      isLeaf: true,
    })
  }
};

getChannelList();

const onLoadData = (node) => {
  return new Promise((resolve) => {
    if(node.dataRef.children) {
      resolve(node.dataRef.children)
      return
    }
    queryCollectorTree({
      sorts: [
        {
          name: 'createTime',
          order: 'desc'
        }
      ],
      terms: [
        {
          column: 'channelId',
          value: node.dataRef.id,
        }
      ]
    }).then(res => {
      if(res.success) {
        node.dataRef.children = res.result.map(item => {
          return {
            ...item,
            isLeaf: true,
          }
        })
      }
      treeData.value = [...treeData.value]
      resolve(node.dataRef.children)
    })
  });
}

//选中节点
const treeSelect = (keys: string, e: any) => {
  // visibleMenu.value = false;
  selectedKeys.value = [e.node?.id];
  emit('change', e.node?.id === '*' ? '*' : e.node?.isChannel ? 'channel' : 'collector', e.node)
}
</script>

<style scoped lang="less">
.channel-collector {
  padding: 10px;
  width: 350px;
  transition: all 0.3s;
  .channel-collector-tree {
   height: calc(100vh - 300px);
   overflow: auto;
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
}
</style>