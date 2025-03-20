<template>
    <a-modal
        visible
        :title="$t('log.TaskDetail.866822-0')"
        width="75vw"
        @cancel="$emit('closeDetail')"
        :maskClosable="false"
    >
        <div class="generalInfo">
            <div class="header">
                <div class="header-left">
                    <div style="font-size: 20px; max-width: 300px">
                        <j-ellipsis>{{ _detail.name || '--' }}</j-ellipsis>
                    </div>
                    <div class="header-status bg-color-200">
                        <JBadgeStatus
                            :text="_detail.state.text"
                            :status="_detail.state.value"
                            :statusNames="{
                                ...colorMap,
                                running: 'primary',
                            }"
                        />
                    </div>
                </div>
                <div class="header-right">
                    <span
                        class="text-color-500"
                        :style="{ fontSize: '12px', marginRight: '10px' }"
                        >{{
                            dayjs(_detail.createTime).format('YYYY-MM-DD HH:mm:ss')
                        }}</span
                    >
                    <div class="body-count bg-color-200">
                        <div>
                            <a-space>
                                <Icon
                                    type="icon-shebei"
                                    style="font-size: 16px"
                                />
                                <label class="text-color-500">{{ $t('log.TaskDetail.866822-1') }}</label>
                                <span class="text-color-900">{{
                                    _detail?.thingTotal
                                }}</span>
                            </a-space>
                        </div>
                        <div>
                            <a-space>
                                <Icon
                                    type="icon-chajianbao"
                                    style="font-size: 16px"
                                />
                                <label class="text-color-500">{{ $t('log.TaskDetail.866822-2') }}</label>
                                <span class="text-color-900">{{
                                    _detail?.others.commandTotal || 0
                                }}</span>
                            </a-space>
                        </div>
                    </div>
                </div>
            </div>
            <div class="dec">
                <j-ellipsis>{{ data.description || '--' }}</j-ellipsis>
                <!-- {{ data.description || '--' }} -->
            </div>
            <div class="allOperation">
                <j-permission-button @click="stopAll" :disabled="!stateArr.includes('waiting')"
                    ><template #icon><AIcon type="PauseOutlined" /> </template
                    >{{ $t('log.TaskDetail.866822-3') }}
                </j-permission-button>
                <j-permission-button style="margin-left: 20px" @click="startAll" :disabled="!stateArr.includes('canceled')"
                    ><template #icon
                        ><AIcon type="CaretRightOutlined" /> </template
                    >{{ $t('log.TaskDetail.866822-4') }}</j-permission-button
                >
                <j-permission-button
                    style="margin-left: 20px"
                    @click="batchRetry"
                    :tooltip="{
                        title: stateArr.includes('failed') ? $t('log.TaskDetail.866822-5') : '',
                    }"
                    :disabled="!stateArr.includes('failed')"
                    ><template #icon><AIcon type="RedoOutlined" /> </template>
                    {{ $t('log.TaskDetail.866822-5') }}
                </j-permission-button>
                <j-permission-button
                    style="margin-left: 20px"
                    @click="refreshState"
                    ><template #icon><AIcon type="RedoOutlined" /> </template>
                    {{ $t('log.TaskDetail.866822-6') }}
                </j-permission-button>
                <j-permission-button style="float: right" @click="onCopy"
                    ><template #icon><AIcon type="CopyOutlined" /> </template>
                    {{ $t('log.TaskDetail.866822-7') }}
                </j-permission-button>
                <j-permission-button
                    style="float: right; margin-right: 20px"
                    danger
                    :tooltip="{
                        title:
                        _detail.state.value === 'running'
                                ? $t('log.TaskDetail.866822-8')
                                : '',
                    }"
                    :popConfirm="{
                        title: $t('log.TaskDetail.866822-9'),
                        onConfirm: async () => {
                            deleteAll();
                        },
                    }"
                    :disabled="_detail.state.value === 'running'"
                >
                    <template #icon><AIcon type="DeleteOutlined" /> </template>
                    {{ $t('log.TaskDetail.866822-10') }}
                </j-permission-button>
            </div>
            <div class="body-progress">
                <div class="progress--warp bg-color-200">
                    <div
                        v-for="item in options"
                        :style="{ width: item.per + '%', background: item.bgc }"
                    ></div>
                </div>
            </div>
            <div class="body-status">
                <div v-for="item in options" class="status-item">
                    <div>
                        <Icon
                            :type="item.icon"
                            :style="{ color: item.color }"
                        />
                        {{ item.label }}
                    </div>
                    <div style="font-size: 20px">
                        {{ item.value }}
                    </div>
                </div>
                <div class="status-item last-item">
                    <label> {{ $t('log.TaskDetail.866822-11') }} </label>
                    <span class="text-color-900" style="font-size: 20px">
                        {{ taskTotal }}
                    </span>
                </div>
            </div>
        </div>
        <JProTable
            ref="tableRef"
            mode="TABLE"
            style="padding: 0"
            :columns="columns"
            :request="_query"
            :scroll="{ x: 1650 }"
            :defaultParams="{
                sorts: [{ name: 'createTime', order: 'desc' }],
                terms: [
                    {
                        column: 'jobId',
                        value: props?.data?.id,
                        termType: 'eq',
                    },
                ],
            }"
        >
            <template #pluginId="{ detail }">
                <j-ellipsis style="width: 100%">{{ detail.data.targetId }}</j-ellipsis>
            </template>
            <template #pluginName="{ detail }">
                <j-ellipsis style="width: 100%"> {{ detail.data.name }}</j-ellipsis>
            </template>
            <template #thingName="{ thingName }">
                <j-ellipsis style="width: 100%"> {{ thingName }}</j-ellipsis>
            </template>
            <template #timeoutSeconds="{ timeoutSeconds }">
                <j-ellipsis style="width: 100%"> {{ timeoutSeconds }}s</j-ellipsis>
            </template>
            <template #id="{ id }">
                <div>
                    <j-ellipsis style="width: 100%"> {{ id }}</j-ellipsis>
                </div>
            </template>
            <template #filename="{ detail }">
                <j-ellipsis style="width: 100%">
                    {{
                        JSON.parse(detail.data.metadata || '{}')?.filename || detail.data.file ||
                        '--'
                    }}</j-ellipsis
                >
            </template>
            <template #completeTime="record">
                {{
                    record.completeTime
                        ? dayjs(record.completeTime).format(
                              'YYYY-MM-DD HH:mm:ss',
                          )
                        : '--'
                }}
            </template>
            <template #state="record">
                <div
                    class="state"
                    :style="{
                        color: colorMap[record.state.value]
                            ? `var(--ant-${colorMap[record.state.value]}-color)`
                            : '#646C73',
                    }"
                >
                    <a-space>
                        <Icon :type="iconMap[record.state.value]" />
                        <j-ellipsis>
                            <div>{{ record.state.text }}</div>
                            <div
                                v-if="
                                    record.state.value === 'failed' &&
                                    record.errorCodeMessage
                                "
                            >
                                {{ ':' + record.errorCodeMessage }}
                            </div>
                        </j-ellipsis>
                    </a-space>
                </div>
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
                            title: $t('log.TaskDetail.866822-12'),
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
                            title: $t('log.TaskDetail.866822-14'),
                        }"
                        style="padding: 0"
                        @click="startUpgrades(record.id);"
                    >
                        <AIcon type="ReloadOutlined" />
                    </j-permission-button>
                    <j-permission-button
                        v-if="record.state.value === 'canceled'"
                        type="link"
                        :tooltip="{
                            title: $t('log.TaskDetail.866822-16'),
                        }"
                        style="padding: 0"
                        @click="startUpgrades(record.id)"
                    >
                        <AIcon type="PlayCircleOutlined" />
                    </j-permission-button>
                    <j-permission-button
                        type="link"
                        :tooltip="{
                            title: $t('log.TaskDetail.866822-18'),
                        }"
                        danger
                        style="padding: 0"
                        :popConfirm="{
                            title: $t('log.TaskDetail.866822-9'),
                            onConfirm: async () => {
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
        <template #footer>
            <span class="tip">{{ $t('log.TaskDetail.866822-19') }}</span>
            <a-button value="large" type="primary" @click="$emit('closeDetail')"
                >{{ $t('log.TaskDetail.866822-20') }}</a-button
            >
        </template>
    </a-modal>
</template>

<script setup name="TaskDetail">
import {
    queryTaskdDtail,
    startAllTask,
    stopAllTask,
    startOneTask,
    stopOneTask,
    deleteOneTask,
    deleteAllTask,
    queryTask
} from '../../../../api/edge/batch';
import dayjs from 'dayjs';
import { onlyMessage } from '@/utils/comm';
import Icon from '../components/Icon.vue';
import { useI18n } from 'vue-i18n';
import { taskDetailColumnMap } from '../util';

const { t: $t } = useI18n();
const props = defineProps({
    data: {
        type: Object,
        default: {},
    },
    deviceId: {
        type: String,
    },
    type: {
        type: String,
    }
});
const emit = defineEmits(['closeDetail', 'refresh', 'copy']);
const columns = computed(()=>([
    {
        title: taskDetailColumnMap[props.type]?.labelID,
        key: 'pluginId',
        scopedSlots: true,
        width: 150,
    },
    {
        title: taskDetailColumnMap[props.type]?.label,
        key: 'pluginName',
        scopedSlots: true,
        width: 150,
    },
    {
        title: $t('log.TaskDetail.866822-22'),
        key: 'filename',
        scopedSlots: true,
        ellipsis: true,
        width: 150,
    },
    {
        title: $t('log.TaskDetail.866822-23'),
        key: 'id',
        dataIndex: 'id',
        scopedSlots: true,
        width: 100,
    },
    {
        title: $t('log.TaskDetail.866822-24'),
        key: 'thingName',
        dataIndex: 'thingName',
        scopedSlots: true,
        width: 150,
    },
    {
        title: $t('log.TaskDetail.866822-25'),
        key: 'timeoutSeconds',
        dataIndex: 'timeoutSeconds',
        scopedSlots: true,
        width: 200,
    },
    {
        title: $t('log.TaskDetail.866822-26'),
        key: 'maxRetry',
        dataIndex: 'maxRetry',
        width: 150,
    },
    {
        title: $t('log.TaskDetail.866822-27'),
        key: 'completeTime',
        scopedSlots: true,
        width: 300,
    },
    {
        title: $t('log.TaskDetail.866822-28'),
        key: 'state',
        scopedSlots: true,
        width: 180,
    },
    {
        title: $t('log.TaskDetail.866822-29'),
        dataIndex: 'action',
        key: 'action',
        width: 120,
        fixed: 'right',
        scopedSlots: true,
    },
]));

const tableRef = ref();
const dataSource = ref({});
const _detail = ref(props.data)

const colorMap = {
    success: 'success',
    complete: 'success',
    running: 'warning',
    incomplete: 'warning',
    failed: 'error',
    waiting: 'primary',
};

const iconMap = {
    success: 'CheckCircleFilled',
    running: 'ClockCircleFilled',
    failed: 'InfoCircleFilled',
    canceled: 'PauseCircleFilled',
    waiting: 'icon-paiduizhong',
};
const taskTotal = computed(() => {
    return (
        _detail.value.stateCount?.reduce((prev, next) => prev + next.total, 0) || 0
    );
});

const options = computed(() => {
    return (
        _detail.value.stateCount?.map((item) => {
            const per = taskTotal.value
                ? Math.round(parseFloat(item.total / taskTotal.value) * 100)
                : 0; // 单个进度比例
            const key = colorMap[item.state.value];
            return {
                label: item.state.text,
                type: item.state.value,
                value: item.total,
                icon: iconMap[item.state.value],
                per: key ? per : 0,
                bgc: key ? `var(--ant-${key}-color)` : 'transparent',
                color: key ? `var(--ant-${key}-color)` : '#646C73',
            };
        }) || []
    );
});

const stateArr = computed(() => {
    return _detail.value.stateCount.map((item) => item.state.value);
});

const _query = async (e) => {
    const res = await queryTaskdDtail(e);
    if (res.success) {
        dataSource.value = res.result;
    }
    return res;
};

const refreshState = () => {
    tableRef.value?.reload();
    getDetail();
    onlyMessage($t('log.TaskDetail.866822-30'));
    emit('refresh');
};
//全部开始
const startAll = async () => {
    const res = await startAllTask(props.data.id, ['canceled']);
    if (res.success) {
        refreshState();
    }
};
//全部重试
const batchRetry = async () => {
    const res = await startAllTask(props.data.id, ['failed']);
    if (res.success) {
        refreshState();
    }
};
//全部停止
const stopAll = async () => {
    const res = await stopAllTask(props.data.id, {});
    if (res.success) {
        refreshState();
    }
};
//全部删除
const deleteAll = async () => {
    const res = await deleteAllTask(props.data.id);
    if (res.success) {
        emit('closeDetail');
        emit('refresh');
    }
};
//开始某个记录
const startUpgrades = async (id) => {
    const res = await startOneTask(id, {});
    if (res.success) {
        refreshState();
    }
};
//停止某个记录
const stopUpgrades = async (id) => {
    const res = await stopOneTask(id, {});
    if (res.success) {
        refreshState();
    }
};
//删除某个记录
const deleteUpgrades = async (id) => {
    if (dataSource.value?.total === 1) {
        deleteAll();
    } else {
        const res = await deleteOneTask(id);
        if (res.success) {
            refreshState();
        }
    }
};

const onCopy = () => {
    emit('copy');
};

const getDetail =async () => {
    const res = await queryTask({
        terms:[{
            column:'id',
            value:props.data.id,
            termType:'eq'
        }]
    });
    if(res.success){
       _detail.value=res.result.data?.[0]
    }
}
getDetail()


</script>
<style lang="less" scoped>
.generalInfo {
    // margin-bottom: 30px;
    .header {
        display: flex;
        justify-content: space-between;

        .header-left {
            display: flex;
            align-items: center;
            .header-status {
                margin-left: 6px;
                padding: 2px 8px;
                border-radius: 4px;
            }
        }
        .header-right {
            display: flex;
            align-items: center;
            .body-count {
                display: flex;
                padding: 8px 24px;
                border-radius: 6px;

                > div {
                    flex: 1;
                    min-width: 200px;
                }
            }
        }
    }
    .dec {
        height: 30px;
        line-height: 20px;
        border-bottom: 1px solid #eaeaeb;
        // margin: 6px 0
        color: #aaaaaa;
        margin-bottom: 6px;
    }
    .progress {
        width: 100%;
        line-height: 32px;
        display: flex;
    }
    .allOperation {
        margin-bottom: 20px;
    }
    .body-progress {
        margin-bottom: 12px;
    }

    .body-status {
        display: flex;
        .status-item {
            display: flex;
            align-items: center;
            flex-direction: column;
        }

        .last-item {
            margin-left: auto;
        }
    }

    .progress--warp {
        height: 6px;
        position: relative;
        border-radius: 4px;
        overflow: hidden;
        display: flex;
    }
}
.tip {
    color: rgb(170, 170, 170);
    margin-right: 10px;
}
.state {
    display: flex;
    align-items: center;
    width: 140px;
}
</style>
