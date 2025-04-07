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
          blockNode
        >
          <template #title="node">
            <a-space v-if="!node.channelId">
              <j-ellipsis>
                {{node.name}}
              </j-ellipsis>
              <j-badge-status
              v-if="node.id !== 'all'"
              :status="node.state?.value"
              :statusNames="{
                  enabled: 'success',
                  disabled: 'error',
              }"
              ></j-badge-status>
            </a-space>
            <div v-else>
              <a-space style="font-size: 14px;">
                <j-ellipsis>
                  {{node.name}}
                </j-ellipsis>
                <a-tag
                  class="tree-left-tag"
                  v-if="node.id !== 'all'"
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
          </template>
          <template #switcherIcon="{switcherCls}">
            <AIcon type="DownOutlined" :class="switcherCls"></AIcon>
          </template>
        </a-tree>
      </div>
    </a-space>
  </div>
</template>
<script setup>
import { queryNoPaging } from '@collector/api/data-collect/channel';
import { queryCollectorTree } from '@collector/api/data-collect/collector';

const colorMap = new Map();
colorMap.set('running', 'success');
colorMap.set('partialError', 'warning');
colorMap.set('partError', 'warning'); // 部分错误
colorMap.set('failed', 'error');
colorMap.set('allError', 'error'); // 全部错误
colorMap.set('stopped', 'default');
colorMap.set('processing', '#cccccc');
colorMap.set('enabled', 'processing');
colorMap.set('disabled', 'error');
const props = defineProps({
  isCollapse: {
    type: Boolean,
    default: false,
  },
});
const treeData = ref([]);
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
    treeData.value = res.result
    treeData.value.unshift({
      name: '全部',
      id: 'all',
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
</script>

<style scoped lang="less">
.channel-collector {
  padding: 10px;
  width: 350px;
  transition: all 0.3s;
  .channel-collector-tree {
   height: calc(100vh - 300px);
   overflow: auto;
 }
}
</style>