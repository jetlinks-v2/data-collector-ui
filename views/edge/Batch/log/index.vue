<template>
    <div class="log-warp">
        <div style="text-align: right;">
            <a-space>
                <a-select
                    v-model:value="searchItem.state"
                    :options="stateOptions"
                    style="width: 100px;text-align: left;"
                />
                <a-input-search v-model:value="searchItem.name" placeholder="请输入任务名称" @search="handleSearch"></a-input-search>
            </a-space>
        </div>
        <!-- <pro-search
            type="simple"
            :columns="columns"
            :style="{ padding: 0, marginBottom: 0 }"
            @search="handleSearch"
        /> -->
        <JProTable
            ref="tableRef"
            mode="CARD"
            style="padding: 12px 0 0"
            :columns="columns"
            :request="queryTask"
            :params="params"
            :gridColumn="1"
            :gridColumns="[1]"
            :defaultParams="{
                sorts: [{ name: 'createTime', order: 'desc' }],
                terms: [
                    {
                        column: 'jobType',
                        value: type,
                    },
                ],
            }"
        >
            <template #card="slotProps">
                <Card
                    :key="slotProps.id"
                    :detail="slotProps"
                    :type="type"
                    @reload="reload"
                    @click="() => onClick(slotProps)"
                />
            </template>
        </JProTable>
        <TaskDetail
            v-if="visible"
            :data="current"
            :type="type"
            @copy="onCopy"
            @refresh="reload"
            @closeDetail="taskDetailClose"
        />
    </div>
</template>

<script setup name="BatchLog">
import { queryTask } from '../../../../api/edge/batch';
import Card from './Card.vue';
import TaskDetail from './TaskDetail.vue';
import { getContext } from '../util';
import { useI18n } from 'vue-i18n';

const { t: $t } = useI18n();

const props = defineProps({
    type: {
        type: String,
        default: undefined,
    },
});
const context = getContext();
const params = ref();
const tableRef = ref();
const visible = ref(false);
const current = ref({});
const searchItem = reactive({
    state: 'all',
    name: '',
});


const stateOptions = [
    {
        label: $t('log.index.741299-3'),
        value: 'all',
    },
    {
        label: $t('log.index.741299-4'),
        value: 'complete',
    },
    {
        label: $t('log.index.741299-5'),
        value: 'running',
    },
    {
        label: $t('log.index.741299-6'),
        value: 'incomplete',
    },
];
const columns = [
    {
        title: $t('log.index.741299-0'),
        dataIndex: 'type',
        key: 'type',
    },
    {
        title: $t('log.index.741299-1'),
        dataIndex: 'gateway',
        key: 'gateway',
    },
    {
        title: $t('log.index.741299-2'),
        dataIndex: 'createTime',
        key: 'createTime',
    },
    {
        title: $t('log.index.741299-3'),
        dataIndex: 'all',
        hideInTable: true,
        search: {
            type: 'string',
        },
    },
    {
        title: $t('log.index.741299-4'),
        dataIndex: 'complete',
        hideInTable: true,
        search: {
            type: 'string',
        },
    },
    {
        title: $t('log.index.741299-5'),
        dataIndex: 'running',
        hideInTable: true,
        search: {
            type: 'string',
        },
    },
    {
        title: $t('log.index.741299-6'),
        dataIndex: 'incomplete',
        hideInTable: true,
        search: {
            type: 'string',
        },
    },
];

const handleSearch = () => {
    const terms = [];
    if (searchItem.state !== 'all') {
        terms.push({
            column: 'state',
            value: searchItem.state,
            type: 'and',
        });
    }
    if (searchItem.name) {
        terms.push({
            column:'name',
            value: `%${searchItem.name}%`,
            termType: 'like',
        });
    }
    params.value = {
        terms: terms.length ? [
            {
                terms,
                type: 'and',
            },
        ] : undefined,
    };
}

const reload = () => {
    tableRef.value?.reload();
};

const onCopy = () => {
    context.openTask({
        thingList: (current.value?.others?.thingList || []).map((item) => ({
            ...item,
            label: item.name || item.thingName,
            value: item.id || item.thingId,
        })),
    });
};

const onClick = (record) => {
    visible.value = true;
    current.value = record;
};
const taskDetailClose = () => {
    visible.value = false;
    current.value = {};
};

defineExpose({
    reload,
});
</script>

<style scoped lang="less">
.log-warp {
    .header {
        padding: 16px 0;
        font-size: 18px;
    }
}
</style>
