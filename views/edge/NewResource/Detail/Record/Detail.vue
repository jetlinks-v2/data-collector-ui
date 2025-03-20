<template>
    <a-drawer
        visible
        :title="record?.name"
        width="70%"
        :maskClosable="false"
        @close="onCancel"
    >
        <div class="log-detail-body">
            <div style="margin-bottom: 16px;">
                <TitleComponent :data="$t('Record.Detail.913748-0')"/>
                <a-descriptions bordered>
                    <a-descriptions-item :label="$t('Record.Detail.913748-1')" :labelStyle="{width: '110px'}">
                        {{resourceStore.resource.creatorName}}
                    </a-descriptions-item>
                    <a-descriptions-item :label="$t('Record.Detail.913748-2')" :labelStyle="{width: '110px'}">
                        {{record.createTime ? dayjs(record.createTime).format('YYYY-MM-DD HH:mm:ss') : '--'}}
                    </a-descriptions-item>
                    <a-descriptions-item :label="$t('Record.Detail.913748-3')" :labelStyle="{width: '110px'}">
                        {{ record.thingTotal }}
                    </a-descriptions-item>
                    <a-descriptions-item :label="$t('Record.Detail.913748-4')" :labelStyle="{width: '110px'}">
                        {{JSON.parse(resourceStore.resource.metadata || '{}')?.filename || JSON.parse(resourceStore.resource.metadata || '{}')?.properties?.fileName || resourceStore.resource?.properties?.fileName}}
                    </a-descriptions-item>
                    <a-descriptions-item :label="$t('Record.Detail.913748-5')" :labelStyle="{width: '110px'}">
                        {{JSON.parse(resourceStore.resource.metadata || '{}')?.description || '--'}}
                    </a-descriptions-item>
                </a-descriptions>
            </div>
            <div>
                <TitleComponent :data="$t('Record.Detail.913748-6')"/>
                <div style="display: flex;justify-content: space-between;">
                    <a-space>
                        <j-permission-button :disabled="!stateArr.includes('waiting')" @click="handlePauseAll">
                            <AIcon type="PauseOutlined"/>
                            {{ $t('Record.Detail.913748-7') }}
                        </j-permission-button>
                        <j-permission-button :disabled="!stateArr.includes('canceled')" @click="handleStartAll">
                            <AIcon type="PlayCircleOutlined"/>
                            {{ $t('Record.Detail.913748-8') }}
                        </j-permission-button>
                        <j-permission-button :disabled="!stateArr.includes('failed')" @click="handlePauseAllRetry">
                            <AIcon type="RedoOutlined"/>
                            {{ $t('Record.Detail.913748-9') }}
                        </j-permission-button>
                        <j-permission-button @click="handleRefresh">
                            <AIcon type="RedoOutlined"/>
                            {{ $t('Record.Detail.913748-10') }}
                        </j-permission-button>
                    </a-space>
                    <a-space>
                        <j-permission-button
                            style="float: right; margin-right: 20px"
                            danger
                            :tooltip="{
                                title:
                                    record.state.value === 'running'
                                        ? $t('Record.Detail.913748-11')
                                        : '',
                            }"
                            :popConfirm="{
                                title: $t('Record.Detail.913748-12'),
                                onConfirm: async () => {
                                    deleteAll();
                                },
                            }"
                            :disabled="record.state.value === 'running'"
                        >
                            <template #icon><AIcon type="DeleteOutlined" /> </template>
                            {{ $t('Record.Detail.913748-13') }}
                        </j-permission-button>
                    </a-space>
                </div>
                <div class="progress--warp" :style="progressStyles">
                </div>
                <div class="progress-info">
                    <a-space size="large">
                        <span v-for="item in record.stateCount">
                            <a-space>
                                <Icon :type="iconMap[item.state.value]" :style="{color: `var(--ant-${colorMap[item.state.value]}-color)`}"></Icon>
                                <span>{{item.state.text}}</span>
                                <span>{{item.total}}</span>
                            </a-space>
                        </span>
                        <a-space>
                          <span>{{$t('Record.Card.931797-4')}}</span>
                          <span>{{ taskTotal || 0 }}</span>
                        </a-space>
                    </a-space>
<!--                    <span>{{ $t('Record.Detail.913748-14') }}{{ record.thingTotal }}{{ $t('Record.Detail.913748-15') }}</span>-->
                </div>
                <JProTable
                    ref="tableRef"
                    mode="TABLE"
                    :request="queryList"
                    :defaultParams="defaultParams"
                    :columns="gatewayColumns"
                >
                    <template #state="slotProps">
                        <div
                            class="state"
                            :style="{
                                color: colorMap[slotProps.state.value]
                                ? `var(--ant-${colorMap[slotProps.state.value]}-color)`
                                : '#646C73',
                    }"
                        >
                            <a-space>
                                <Icon :type="iconMap[slotProps.state.value]" />
                                <j-ellipsis>
                                    <span>{{ slotProps.state.text }}</span>
                                    <span
                                        v-if="
                                            slotProps.state.value === 'failed' &&
                                            slotProps.errorCodeMessage
                                        "
                                    >
                                        {{ ':' + slotProps.errorCodeMessage }}
                                    </span>
                                </j-ellipsis>
                            </a-space>
                        </div>
                    </template>
                    <template #completeTime="slotProps">
                        {{ slotProps.completeTime ? dayjs(slotProps.completeTime).format('YYYY-MM-DD HH:mm:ss') : '--' }}
                    </template>
                    <template #action="record">
                        <a-space :size="24">
                            <j-permission-button
                                v-if="
                                    record.state.value === 'waiting' ||
                                    record.state.value === 'running'
                                "
                                type="link"
                                :tooltip="{
                                    title: $t('Record.Detail.913748-16'),
                                }"
                                style="padding: 0"
                                @click="stopUpgrades(record.id)"
                            >
                                <AIcon type="StopOutlined" />
                            </j-permission-button>
                            <j-permission-button
                                v-if="record.state.value === 'failed'"
                                type="link"
                                :tooltip="{
                                    title: $t('Record.Detail.913748-18'),
                                }"
                                style="padding: 0"
                                @click="startUpgrades(record.id)"
                            >
                                <AIcon type="ReloadOutlined" />
                            </j-permission-button>
                            <j-permission-button
                                v-if="record.state.value === 'canceled'"
                                type="link"
                                :tooltip="{
                                    title: $t('Record.Detail.913748-20'),
                                }"
                                style="padding: 0"
                                @click="startUpgrades(record.id)"
                            >
                                <AIcon type="PlayCircleOutlined" />
                            </j-permission-button>
                            <j-permission-button
                                type="link"
                                :tooltip="{
                                    title: $t('Record.Detail.913748-22'),
                                }"
                                danger
                                style="padding: 0"
                                :popConfirm="{
                                    title: $t('Record.Detail.913748-12'),
                                    onConfirm: () => {
                                        deleteUpgrades(record.id);
                                    },
                                }"
                                :disabled="
                                    record.state.value === 'waiting' ||
                                    record.state.value === 'running'
                                "
                            >
                                <AIcon type="DeleteOutlined" />
                            </j-permission-button>
                        </a-space>
                    </template>
                </JProTable>
            </div>
        </div>
    </a-drawer>
</template>

<script setup name="LogDrawer">
import {
    queryIssueDetail,
    pauseAll,
    startTask,
    startTaskOne,
    stopTaskOne,
    deleteTaskOne,
    deleteJob
} from '../../../../../api/edge/newResource';
import {queryNoPagingPost} from '../../../../../api/others';
import dayjs from "dayjs";
import {onlyMessage} from "@jetlinks-web/utils";
import Icon from '../../../Batch/components/Icon.vue';
import { useResourceStore } from "../../../../../store/resource";
import { useI18n } from 'vue-i18n';

const { t: $t } = useI18n();

const props = defineProps({
    record: {
        type: Object,
        default: () => ({})
    }
})

const colorMap = {
    'success': 'success',
    'complete': 'success',
    'running': 'warning',
    'incomplete': 'warning',
    'failed': 'error',
    'waiting': 'primary'
}

const iconMap = {
    'success': 'CheckCircleFilled',
    'running': 'ClockCircleFilled',
    'failed': 'InfoCircleFilled',
    'canceled': 'PauseCircleFilled',
    'waiting': 'icon-paiduizhong',
}

const stateArr = computed(() => {
    return props.record.stateCount.map((item) => item.state.value);
});

const emit = defineEmits(['showTaskDetail', 'copy', 'cancel', 'reload']);

const resourceStore = useResourceStore();
const dataSource = ref([]);
const defaultParams = {
    terms: [
        {
            column: "jobId",
            termType: "eq",
            value: props.record.id,
        }
    ]
}

const tableRef = ref();
const gatewayColumns = [
    {
        title: $t('Record.Detail.913748-23'),
        dataIndex: 'thingId',
        ellipsis: true,
    },
    {
        title: $t('Record.Detail.913748-24'),
        dataIndex: 'id',
        key: 'id',
        ellipsis: true,
    },
    {
        title: $t('Record.Detail.913748-25'),
        dataIndex: 'thingName',
        ellipsis: true,
    },
    {
        title: $t('Record.Detail.913748-26'),
        dataIndex: 'timeoutSeconds',
        key: 'timeoutSeconds',
        scopedSlots: true,
        ellipsis: true,
    },
    {
        title: $t('Record.Detail.913748-27'),
        dataIndex: 'maxRetry',
        key: 'maxRetry',
        scopedSlots: true,
        ellipsis: true,
    },
    {
        title: $t('Record.Detail.913748-28'),
        dataIndex: 'completeTime',
        scopedSlots: true,
        ellipsis: true,
        width: 180,
    },
    {
        title: $t('Record.Detail.913748-29'),
        dataIndex: 'state',
        key: 'state',
        scopedSlots: true,
    },
    {
        title: $t('Record.Detail.913748-30'),
        dataIndex: 'action',
        key: 'action',
        scopedSlots: true,
        width: 120,
    },
]

const progressStyles = computed(() => {
    const value = {
        'error': (props.record?.stateCount?.find(item => item.state?.value === 'failed')?.percent || 0) * 100,
        'success': (props.record?.stateCount?.find(item => item.state?.value === 'success')?.percent || 0) * 100,
        'primary': (props.record?.stateCount?.find(item => item.state?.value === 'waiting')?.percent || 0) * 100,
    }
    const bgi = Object.keys(value).reduce((prev, key, index) => {
        const v = Object.values(value).splice(0, index + 1).reduce((a, b) => a + b, 0)
        prev += `var(--ant-${key}-color) 0, var(--ant-${key}-color) ${v}%,`
        return prev
    }, '')

    return {
        'background-image': 'linear-gradient(90deg,' + bgi + '#EFF0F1 0, #EFF0F1 100%)'
    }
})

const taskTotal = computed(() => {
  return Object.keys(props.record?.stateCount || {}).reduce((sum, key) => {
    return sum + (props.record?.stateCount?.[key]?.total || 0)
  }, 0)
})
const onCancel = () => {
    emit('cancel')
}

//列表
const queryList = (params) => {
    return new Promise(async (resolve, reject) => {
        const res = await queryIssueDetail(params);
        if(res.success && res.result.data.length) {
            const resp = await queryNoPagingPost({
                terms: [
                    {
                        column: 'id',
                        termType: 'in',
                        value: res.result.data.map(item => item.thingId)
                    }
                ]
            })
            if(resp.success) {
                res.result.data.forEach(item => {
                    const device = resp.result.find(i => i.id === item.thingId);
                    item.deviceType = device?.deviceType?.text;
                    item.deviceState = device?.state?.text;
                })
                dataSource.value = res.result.data || []
                resolve({
                    ...res
                })
            }
        }
    })
}


//刷新
const handleRefresh = () => {
    tableRef.value?.reload();
    emit('reload');
}

//全部删除
const deleteAll = async () => {
    const res = await deleteJob(props.record.id);
    if (res.success) {
        emit('cancel');
        emit('reload');
    }
};

//全部暂停
const handlePauseAll = async () => {
    const res = await pauseAll(props.record.id);
    if (res) {
        tableRef.value?.reload();
        onlyMessage($t('Record.Detail.913748-31'));
        emit('reload');
    }
}

//全部开始
const handleStartAll = async () => {
    const res = await startTask (props.record.id, ['failed', 'canceled']);
    if (res) {
        tableRef.value?.reload();
        onlyMessage($t('Record.Detail.913748-31'));
        emit('reload');
    }
}

//批量重试
const handlePauseAllRetry = async () => {
    const res = await startTask( props.record.id, ['failed', 'canceled']);
    if (res) {
        tableRef.value?.reload();
        onlyMessage($t('Record.Detail.913748-31'));
        emit('reload');
    }
}

//开始某个记录
const startUpgrades = async (id) => {
    const res = await startTaskOne(id, ['failed']);
    if (res.success) {
        tableRef.value?.reload();
        emit('reload');
    }
};

//停止某个记录
const stopUpgrades = async (id) => {
    const res = await stopTaskOne(id, {});
    if (res.success) {
        tableRef.value?.reload();
        emit('reload');
    }
};

//删除某个记录
const deleteUpgrades = async (id) => {
    if (dataSource.value?.length === 1) {
        await deleteAll();
    } else {
        const res = await deleteTaskOne(id);
        if (res.success) {
            tableRef.value?.reload();
            emit('reload');
        }
    }
};

</script>

<style scoped>
:deep(.jtable-body-spin) {
    padding: 0;
}

.progress--warp {
    height: 6px;
    border-radius: 3px;
    position: relative;
    margin: 16px 0;
}

.progress-info {
    width: 100%;
    display: flex;
    justify-content: space-between;
}

.state-text {
    font-size: 14px;
    color: #8D9399;
}
</style>
