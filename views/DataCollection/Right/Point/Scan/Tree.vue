<script setup name="ScanPointTree">
import { useRequest } from '@jetlinks-web/hooks'
import {
  scanOpcUAList,
  queryPointNoPaging,
} from '@collector/api/data-collect/collector'
import { useI18n } from 'vue-i18n';
import {useScan} from "./useScan";
import {pick} from "lodash-es";

const props = defineProps({
  unSelectKeys: {
    type: String || Array,
    default: '',
  },
});

const { t: $t } = useI18n();
const collectionData = inject('collector-data', {})
const {dataSource, selectKeys} = useScan()

const { data: treeData, loading, run } = useRequest(scanOpcUAList, {
  immediate: false
})

const isSelected = ref(false)
const controlAllType = ref(false)
const spinning = ref(false)
const breadcrumb = ref([
  {
    breadcrumbName: $t('Scan.Tree.400146-3'),
    nodeId: undefined,
  },
])

const treeAllData = computed(() => {
  return treeData.value?.filter(item => !(isSelected.value && selectKeys.value.has(item.id))).map((i) => {
    return {
      ...i,
      checked: selectKeys.value.has(i.id),
      key: i.id,
    }
  })
})

const jumpFile = (breadcrumbNumber, nodeId) => {
  if (nodeId === breadcrumb.value[breadcrumb.value.length - 1]?.nodeId) return

  breadcrumb.value.splice(breadcrumbNumber + 1, breadcrumb.value.length - 1);
  getFileList(nodeId);
}

const onAllControl = () => {
  const points = treeAllData.value.filter(item => !item.folder)
  const filterData = points.filter(item => !item.checked)

  if (filterData.length) {
    dataSource.value.push(...filterData.map(info => ({
      ...pick(info, ['id', 'name', 'type']),
      features: {
        value: (info.features || []).includes('changedOnly'),
        check: true,
      },
      accessModes: {
        value: undefined,
        check: true,
      },
      configuration: {
        ...(info.configuration || {}),
        interval: {
          value: info.configuration?.interval || 3000,
          check: true,
        },
        nodeId: info.id,
      }
    })))
    selectKeys.value = new Set([...selectKeys.value, ...filterData.map(item => item.id)])
  } else {
    dataSource.value = dataSource.value.filter(item => {
      const isFilter = points.some(tItem => tItem.id === item.id)
      if (isFilter) {
        selectKeys.value.delete(item.id)
      }
      return !isFilter
    })
  }
  controlAllType.value = !controlAllType.value
}

const onCheck = (info) => {

  if (!selectKeys.value.has(info.id)) {
    selectKeys.value.add(info.id)
    dataSource.value.push({
      ...pick(info, ['id', 'name', 'type']),
      features: {
        value: (info.features || []).includes('changedOnly'),
        check: true,
      },
      accessModes: {
        value: undefined,
        check: true,
      },
      configuration: {
        ...(info.configuration || {}),
        interval: {
          value: info.configuration?.interval || 3000,
          check: true,
        },
        nodeId: info.id,
      }
    })
  }
}

const clickItem = (node) => {
  if (node?.folder) {
    getFileList(node.key);
    breadcrumb.value.push({
      breadcrumbName: node.name,
      nodeId: node.key,
    });
  } else {
    onCheck(node);
  }
}

const getFileList = async (nodeId) => {
  await run(collectionData.value.channelId, 'BrowseNodes', { nodeId })
}

const getSelectPoint = async () => {
  spinning.value = true
  const resp = await queryPointNoPaging({
    paging: false,
    terms: [
      {
        column: 'collectorId',
        value: props.data?.id,
      },
    ]
  }).finally(() => {
    spinning.value = false
  })

  if (resp.success) {
    selectKeys.value = new Set(resp.result.map((item) => item.pointKey))
  }

  await getFileList()
}

getSelectPoint()

</script>

<template>
  <div class="scan-tree">
    <div class="scan-tree-header">
      <div> 数据源 </div>
      <a-checkbox v-model:checked="isSelected">隐藏已有节点</a-checkbox>
    </div>
    <div class="scan-tree-breadcrumb">
      <a-breadcrumb>
        <a-breadcrumb-item
          v-for="(i, index) in breadcrumb"
          @click="() => jumpFile(index, i.nodeId)"
        >
          <a-button type="text" style="padding: 0">
            {{
              i.breadcrumbName
            }}
          </a-button>
        </a-breadcrumb-item>
      </a-breadcrumb>
    </div>
    <div class="scan-tree-content">
      <a-button
        block
        shape="round"
        class="j-lightgray"
        style="margin-bottom: 12px"
        :loading="loading"
        @click="onAllControl"
      >
        {{ controlAllType ? "全部撤销" : "全部添加" }}
      </a-button>
      <div v-if="!!treeAllData" class="treeContainer">
        <div
          v-for="i in treeAllData"
          class="tree-item"
          @click="() => clickItem(i)"
        >
          <div class="item-label">
            <AIcon
              :type="i?.folder ? 'FolderOutlined' : 'ArrowRightOutlined'"
              style="margin-right: 6px"
            ></AIcon>
            <div
              class="item-label-content"
              :class="{'checked': i.checked}"
            >
              <j-ellipsis>{{ i.name }}</j-ellipsis>
            </div>
          </div>

          <a-button
            class="item-icon"
            size="small"
            v-if="!i?.folder"
            shape="circle"
          >
            <AIcon type="ArrowRightOutlined" />
          </a-button>
        </div>
      </div>
      <Empty v-else style="margin-top: 24px" />
    </div>
  </div>
</template>

<style scoped lang="less">
.scan-tree {
  flex: 0 0 300px;

  .scan-tree-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 8px;
  }

  .tree-item {
    cursor: pointer;
    display: flex;
    &:not(:last-child) {
      margin-bottom: 4px;
    }

    .item-label {
      flex: 1 1 auto;
      display: flex;
      align-items: center;

      .item-icon {
        flex: 0 0 32px;
        padding: 0;
      }

      .item-label-content {
        padding: 0 4px;
        max-width: calc(100% - 32px);
        &.checked {
          background-color: var(--ant-primary-2);
        }
      }
    }
  }
}
</style>
