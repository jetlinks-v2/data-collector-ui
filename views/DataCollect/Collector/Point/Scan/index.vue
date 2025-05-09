<template>
    <a-modal :title="$t('Scan.index.400148-0')" :visible="true" width="95%" @cancel="handleCancel">
        <div class="content">
            <Tree
                :data="treeData"
                class="tree"
                @change="changeTree"
                @cancelAll="cancelAll"
                @addAll="addAll"
                :unSelectKeys="unSelectKeys"
            ></Tree>
            <Table
                :data="tableData"
                class="table"
                @change="changeTable"
                ref="formTableRef"
            ></Table>
        </div>
        <template #footer>
            <a-button key="back" @click="handleCancel">{{ $t('Scan.index.400148-1') }}</a-button>
            <j-permission-button
                key="submit"
                type="primary"
                :loading="loading"
                @click="handleOk"
                style="margin-left: 8px"
                :hasPermission="`DataCollect/Collector:update`"
            >
                {{ $t('Scan.index.400148-2') }}
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
const tableData = ref();
const tableDataMap = new Map();
const unSelectKeys = ref();

const handleOk = async () => {
    const data: any = await formTableRef.value?.validate().catch(() => {});
    if (!data) return;
    const list: any = data.map((item: any) => {
        return {
            name: item.name,
            provider: 'OPC_UA',
            collectorId: props.data?.id,
            collectorName: props.data?.name,
            pointKey: item.id,
            configuration: {
                interval: item.configuration?.interval?.value,
                type: item.type,
            },
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

const changeTree = (row: any, checked: boolean) => {
    checked ? tableDataMap.set(row.id, row) : tableDataMap.delete(row.id);
    tableData.value = [...tableDataMap.values()];
};
const changeTable = (value: string) => {
    unSelectKeys.value = value;
    tableDataMap.delete(value);
    tableData.value = [...tableDataMap.values()];
};
const cancelAll = (points:Array<any>)=>{
    unSelectKeys.value = []
    points.forEach((i:any)=>{
        if(tableDataMap.has(i.id)){
            tableDataMap.delete(i.id);
            unSelectKeys.value.push(i.id)
        }
    })
    tableData.value = [...tableDataMap.values()];
}

const addAll = (points: Array<any>)=>{
    points.forEach((i:any)=>{
        tableDataMap.set(i.id,i)
    })
    tableData.value = [...tableDataMap.values()]
}
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
      min-width: 0;
    }
}
</style>
