<template>
    <j-pro-table
        :columns="columns"
        :request="query"
        mode="TABLE"
        style="padding: 0"
    >
        <template #access="slotProps">
            {{slotProps?.accessModes.map(item => item.text).join(',')}}
        </template>
        <template #interval="slotProps">
            {{slotProps.configuration?.interval || slotProps.interval}}ms
        </template>
        <template #pushRule="slotProps">
            {{slotProps.feature?.find(item => item.value === 'changedOnly') ? $t('Info.Points.218084-0') : $t('Info.Points.218084-1')}}
        </template>
    </j-pro-table>
</template>

<script setup lang="ts">
import { cloneDeep } from "lodash-es";
import { useI18n } from 'vue-i18n';

const { t: $t } = useI18n();

const props = defineProps({
    dataSource: {
        type: Array,
        default: () => ([])
    }
})

const _params = ref({})
const columns = [
    {
        title: $t('Info.Points.218084-2'),
        dataIndex: 'name',
        key: 'name',
        ellipsis: true
    },
    {
        title: $t('Info.Points.218084-3'),
        dataIndex: 'access',
        key: 'access',
        ellipsis: true,
        scopedSlots: true
    },
    {
        title: $t('Info.Points.218084-4'),
        dataIndex: 'interval',
        key: 'interval',
        ellipsis: true,
        scopedSlots: true
    },
    {
        title: $t('Info.Points.218084-5'),
        dataIndex: 'pushRule',
        key: 'pushRule',
        ellipsis: true,
        scopedSlots: true
    }
]

const query = (params: Record<string, any>) => {
    return new Promise((resolve) => {
        const _from = params.pageIndex * params.pageSize;
        const _to = (params.pageIndex + 1) * params.pageSize;
        let arr = cloneDeep(props.dataSource);
        resolve({
            success: true,
            message: 'success',
            status: 200,
            result: {
                data: arr.slice(_from, _to),
                pageIndex: params.pageIndex || 0,
                pageSize: params.pageSize || 12,
                total: arr.length,
            }
        })
    })
}
</script>

<style scoped lang="less">
.point-table {
    .point-header {
        background: #f2f2f2;
        display: grid;
        padding: 0.5rem 1rem;
        border-radius: 6px;
    }
    .point-body-row {
        display: grid;
        padding: 0.4rem 1rem;
    }
}
</style>
