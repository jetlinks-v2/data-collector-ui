<script setup name="ScanPointTree">
import { useRequest } from '@jetlinks-web/hooks'
import {
  scanOpcUAList,
  queryPointNoPaging,
} from '@collector/api/data-collect/collector'
import { useI18n } from 'vue-i18n';
import {useScan} from "./useScan";
import {pick} from "lodash-es";
import RenderComponents from "@collector/components/RenderComponents";
import {devGetProtocol} from "@collector/utils/utils";

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
  immediate: false,
  onWarn: (e) => {
    const el = document.getElementsByClassName('ant-notification');
    for (let i = 0; i < el.length; i++) {
      el[i].getElementsByClassName('ant-notification-notice-description')[0].innerHTML = e.response.data.message.toLowerCase().includes('connection') ? $t('DataCollection.Right.Point.Scan.Tree.476751-1') : e.response.data.message;
    }
  }
})

const jsonData = ref();
const isSelected = ref(false)
const controlAllType = ref(false)
const spinning = ref(false)
const searchValue = ref('')
const savedKeys = ref()
const breadcrumb = ref([
  {
    breadcrumbName: $t('Scan.Tree.400146-3'),
    nodeId: undefined,
  },
])
const setting = reactive({
  request: { type: undefined },
  handleDataSourceItem: () => ({})
})

provide('scan-tree-setting', setting)

const treeAllData = computed(() => {
  return treeData.value?.filter(item => !(isSelected.value && selectKeys.value.has(item.id)) && item.name.includes(searchValue.value)).map((i) => {
    return {
      ...i,
      title: setting.treeTitle?.(i) || i.name,
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

const handleDataSourceItem = (info) => {
  return {
    id: info.id,
    name: info.name,
    type: info.type,
    ...setting.handleDataSourceItem(info)
  }
}

const onAllControl = () => {
  const points = treeData.value.filter(item => !item.folder && !savedKeys.value.has(item.id))
  const filterData = points.filter(item => !item.checked && item.name.includes(searchValue.value))

  if (!controlAllType.value) {
    dataSource.value.push(...filterData.map(handleDataSourceItem))
    selectKeys.value = new Set([...selectKeys.value, ...filterData.map(item => item.id)])
  } else {
    selectKeys.value = new Set([...savedKeys.value])
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
    const item = handleDataSourceItem(info)
    const last = dataSource.value[dataSource.value.length - 1]
    if(last) {
      item.configuration.interval.value = last.configuration?.interval.value
      item.accessModes.value = [...last.accessModes.value]
      item.features = {...last.features}
    }
    dataSource.value.push({...item})
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
  await run(collectionData.value.channelId, setting.request.type, setting.request.data?.() ||{ nodeId })
  // treeData.value = Array.from({length: 20}, (_, index) =>  {
  //   return {
  //     objectId: {
  //       type: 'string',
  //       instanceNumber: index,
  //     },
  //     propertyId: 'propertyId' + index,
  //     valueType: 'valueType' + index,
  //     id: 'id'+index,
  //     name: '点位'+ index,
  //     vendorName: 'vendorName'+ index,
  //     modelName: 'modelName'+ index,
  //     address: 'address'+ index,
  //   }
  // })
}

const getSelectPoint = async () => {
  spinning.value = true
  const resp = await queryPointNoPaging({
    paging: false,
    terms: [
      {
        column: 'collectorId',
        value: collectionData.value.id,
      },
    ]
  }).finally(() => {
    spinning.value = false
  })

  if (resp.success) {
    selectKeys.value = new Set(resp.result.map((item) => item.pointKey))
    savedKeys.value = new Set(resp.result.map((item) => item.pointKey))
  }

  await getFileList()
}
const getProtocol = async () => {
  jsonData.value = await devGetProtocol(collectionData.value.provider, "scanTree")
};

const renderMounted = () => {
  nextTick(() => {
    getSelectPoint()
  })
}

getProtocol();

</script>

<template>
  <div class="scan-tree">
    <RenderComponents v-if="jsonData" :value="jsonData" @mounted="renderMounted" />
    <div class="scan-tree-header">
      <div> {{ $t('ScanBacnet.Tree.400142-0') }} </div>
      <a-checkbox v-model:checked="isSelected">隐藏已有节点</a-checkbox>
    </div>
    <div class="scan-tree-breadcrumb">
      <a-breadcrumb>
        <a-breadcrumb-item
          v-for="(i, index) in breadcrumb"
          :key="i.nodeId"
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
      <a-input-search
        style="margin-bottom: 12px;"
        placeholder="请输入"
        @search="(value) => searchValue = value"
      ></a-input-search>
      <a-button
        block
        shape="round"
        class="j-lightgray"
        style="margin-bottom: 12px"
        :loading="loading"
        @click="onAllControl"
      >
        {{ controlAllType ? $t('ScanBacnet.Tree.400142-1') :  $t('ScanBacnet.Tree.400142-2') }}
      </a-button>
      <div v-if="!!treeAllData" class="treeContainer">
        <div
          v-for="i in treeAllData"
          class="tree-item"
          :key="i.key"
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
              <j-ellipsis>{{ i.title }}</j-ellipsis>
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
  height: 570px;

  .scan-tree-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 8px;
  }

  .scan-tree-content {
    height: calc(100% - 56px);

    .treeContainer {
      height: calc(100% - 80px);
      overflow-y: auto;
    }
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
