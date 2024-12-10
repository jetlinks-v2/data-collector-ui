<template>
    <pro-search
        :columns="columns"
        @search="handleSearch"
        type="simple"
    ></pro-search>
    <JProTable
        ref="tableRef"
        :request="queryTaskDetailPage"
        :columns="columns"
        :gridColumn="1"
        :gridColumns="[1]"
        mode="CARD"
        :defaultParams="defaultParams"
        :params="params"
    >
        <template #card="slotProps">
            <Card :detail="slotProps" @reload="onReload"/>
        </template>
    </JProTable>
</template>

<script setup lang="ts">
import {queryTaskDetailPage} from '../../../../../api/edge/newResource';
import {PropType} from "vue";
import Card from './Card.vue';
import { useI18n } from 'vue-i18n';

const { t: $t } = useI18n();

const props = defineProps({
    data: {
        type: Object as PropType<Record<string, any>>,
        default: () => ({}),
    }
})
const tableRef = ref();
const defaultParams = {
    sorts: [
        {
            name: 'createTime',
            order: 'desc',
        }
    ],
    terms: [
        {
            column: "targetId",
            termType: "eq",
            value: props.data.targetId,
        }
    ]
}

const params = ref({});
const columns = [
    {
        title: $t('Record.index.327270-0'),
        dataIndex: 'createTime',
        key: 'createTime',
        width: 200,
        search: {
            type: 'date'
        }
    },
    {
        title: $t('Record.index.327270-1'),
        dataIndex: 'state',
        key: 'state',
        search: {
            type: 'select',
            options: [
                {label: $t('Record.index.327270-2'), value: 'complete'},
                {label: $t('Record.index.327270-3'), value: 'incomplete'},
                {label: $t('Record.index.327270-4'), value: 'running'},
            ]
        }
    },
]

const handleSearch = (e: any) => {
    params.value = e
}

const onReload = () => {
    tableRef.value?.reload();
}

</script>

<style scoped lang="less">

</style>