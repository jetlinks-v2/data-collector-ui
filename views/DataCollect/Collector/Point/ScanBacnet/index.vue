<template>
    <a-modal :title="$t('ScanBacnet.index.400145-0')" :visible="true" :maskClosable="false" width="95%" @cancel="handleCancel">
        <div class="content">
            <Tree
                :data="treeData"
                :tableData="tableData"
                class="tree"
                @change="changeTree"
                @addAll="addAll"
                @cancel-all="cancelAll"
                :unSelectKeys="unSelectKeys"
            ></Tree>
            <Table
                :data="tableData"
                :collectorData="treeData"
                class="table"
                @change="changeTable"
                ref="formTableRef"
            ></Table>
        </div>
        <template #footer>
            <a-button key="back" @click="handleCancel">{{ $t('ScanBacnet.index.400145-1') }}</a-button>
            <j-permission-button
                key="submit"
                type="primary"
                :loading="loading"
                @click="handleOk"
                style="margin-left: 8px"
                :hasPermission="`DataCollect/Collector:update`"
            >
                {{ $t('ScanBacnet.index.400145-2') }}
            </j-permission-button>
        </template>
    </a-modal>
</template>
<script lang="ts" setup>
import type { FormInstance } from 'ant-design-vue';
import { savePointBatch } from '../../../../../api/data-collect/collector';

import Table from './Table.vue';
import Tree from './Tree.vue';
import { useI18n } from 'vue-i18n';
import {onlyMessage} from "@jetlinks-web/utils";

const { t: $t } = useI18n();

const props = defineProps({
    data: {
        type: Array,
        default: () => [],
    },
});

const treeData = ref(props.data);

const emit = defineEmits(['change']);
const loading = ref(false);
const formTableRef = ref<FormInstance>();
const tableData = ref<any[]>([]);
const tableDataMap = new Map();
const unSelectKeys = ref();

const handleOk = async () => {
    const data: any = await formTableRef.value?.validate().catch(() => {});
    if (!data) return;
    const list: any = data.map((item: any) => {
        return {
            name: item.name,
            provider: 'BACNetIp',
            collectorId: props.data?.id,
            collectorName: props.data?.name,
            configuration: {
                interval: item.configuration?.interval?.value,
                valueType: item.valueType,
                propertyId: item.propertyId,
                objectId: item.objectId,
            },
            pointKey: `${item.objectId.type}:${item.objectId.instanceNumber}:${item.propertyId}`,
            features: !item.features?.value ? [] : ['changedOnly'],
            accessModes: item.accessModes?.value || [],
        };
    });
    if(!list.length){
      onlyMessage($t('Scan.index.400148-3'), 'error')
      return
    }
    loading.value = true;
    const resp = await savePointBatch([...list]).catch(() => {});
    emit('change', resp?.status === 200);
    loading.value = false;
};
const handleCancel = () => {
    emit('change', false);
};

const changeTree = (row: any) => {
    tableData.value.push(row)
};

const addAll = (data:any)=>{
    tableData.value = data
}

const cancelAll = () =>{
    console.log('cancelALl')
    tableData.value = []
}
const changeTable = (value: string, index: number) => {
    tableData.value.splice(index, 1)
};
</script>

<style lang="less" scoped>
.content {
    display: flex;
    min-height: 600px;
    .tree {
        width: 300px;
    }
    .table {
        flex: 1;
    }
}
</style>
