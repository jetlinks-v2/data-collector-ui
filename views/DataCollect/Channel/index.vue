<template>
    <j-page-container>
        <div>
            <pro-search
                :columns="columns"
                target="search-datacollect-channel"
                @search="handleSearch"
            />
            <FullPage>
                <j-pro-table
                    ref="tableRef"
                    :columns="columns"
                    mode="CARD"
                    :gridColumn="3"
                    :request="query"
                    :defaultParams="{
                        sorts: [{ name: 'createTime', order: 'desc' }],
                    }"
                    :params="params"
                >
                    <template #headerLeftRender>
                        <j-permission-button
                            type="primary"
                            @click="handlAdd"
                            hasPermission="DataCollect/Channel:add"
                        >
                            <template #icon
                                ><AIcon type="PlusOutlined"
                            /></template>
                            {{ $t('Channel.index.290640-0') }}
                        </j-permission-button>
                    </template>
                    <template #card="slotProps">
                        <CardBox
                            :showStatus="true"
                            :value="slotProps"
                            :actions="getActions(slotProps, 'card')"
                            v-bind="slotProps"
                            :status="getState(slotProps).value"
                            :statusText="getState(slotProps).text"
                            :statusNames="StatusColorEnum"
                            @click="handlEye(slotProps.id)"
                        >
                            <template #img>
                                <slot name="img">
                                    <img
                                        :src="ImageMap.get(slotProps.provider)"
                                    />
                                </slot>
                            </template>
                            <template #content>
                                <div class="card-item-content">
                                    <j-ellipsis style="width: calc(100% - 100px)">
                                        <span
                                            style="
                                                font-size: 18px;
                                                font-weight: 800;
                                                line-height: 22px;
                                            "
                                        >
                                            {{ slotProps.name }}
                                        </span>
                                    </j-ellipsis>
                                    <a-row class="card-item-content-box">
                                        <a-col :span="12">
                                            <div class="card-item-content-text">
                                                {{ $t('Channel.index.290640-1') }}
                                            </div>
                                            <div class="card-item-content-text">
                                                <a-tooltip>
                                                    <template #title>{{
                                                        protocolList.find(
                                                            (item) =>
                                                                item.value ===
                                                                slotProps.provider,
                                                        )?.label
                                                    }}</template>
                                                    {{
                                                        protocolList.find(
                                                            (item) =>
                                                                item.value ===
                                                                slotProps.provider,
                                                        )?.label
                                                    }}
                                                </a-tooltip>
                                            </div>
                                        </a-col>
                
                                        <a-col :span="12">
                                            <div class="card-item-content-text">
                                                {{ $t('Channel.index.290640-2') }}
                                            </div>
                                            <j-ellipsis>
                                                <div class="explain">
                                                    {{ slotProps.description }}
                                                </div>
                                            </j-ellipsis>
                                        </a-col>
                                    </a-row>
                                </div>
                            </template>
                            <template #actions="item">
                                <j-permission-button
                                    :disabled="item.disabled"
                                    :popConfirm="item.popConfirm"
                                    :tooltip="{
                                        ...item.tooltip,
                                    }"
                                    @click="item.onClick"
                                    :hasPermission="
                                        'DataCollect/Channel:' + item.key
                                    "
                                >
                                    <AIcon
                                        type="DeleteOutlined"
                                        v-if="item.key === 'delete'"
                                    />
                                    <template v-else>
                                        <AIcon :type="item.icon" />
                                        <span>{{ item?.text }}</span>
                                    </template>
                                </j-permission-button>
                            </template>
                        </CardBox>
                    </template>
                </j-pro-table>
            </FullPage>
            <Save v-if="visible" :data="current" @change="saveChange" />
        </div>
    </j-page-container>
</template>
<script lang="ts" setup name="DataCollectPage">
import {
    query,
    remove,
    update,
    getProviders,
} from '../../../api/data-collect/channel';
import { onlyMessage } from '@jetlinks-web/utils'
import { StatusColorEnum, updateStatus ,protocolList,imgUrl} from './data';
import { useMenuStore } from '@/store/menu';
import Save from './Save/index.vue';
import { cloneDeep } from 'lodash-es';
import { useI18n } from 'vue-i18n';

const {t: $t} = useI18n();
const menuStory = useMenuStore();
const tableRef = ref<Record<string, any>>({});
const params = ref<Record<string, any>>({});
const visible = ref(false);
const current = ref({});


const ImageMap = new Map();
ImageMap.set('OPC_UA', imgUrl.opcImage);
ImageMap.set('MODBUS_TCP', imgUrl.modbusImage);
ImageMap.set('snap7', imgUrl.s7Image);
ImageMap.set('iec104', imgUrl.iecImage);
ImageMap.set('COLLECTOR_GATEWAY', imgUrl.gatewayImage);

const columns = [
    {
        title: $t('Channel.index.290640-3'),
        dataIndex: 'name',
        key: 'name',
        ellipsis: true,
        fixed: 'left',
        search: {
            type: 'string',
        },
    },
    {
        title: $t('Channel.index.290640-4'),
        dataIndex: 'provider',
        key: 'provider',
        ellipsis: true,
        search: {
            type: 'select',
            options: async () => {
                const resp: any = await getProviders();
                if (resp.status === 200) {
                    return resp.result.map((i:any)=>{
                        return {
                            label: i.name,
                            value: i.id
                        }
                    })
                }
            },
        },
    },
    {
        title: $t('Channel.index.290640-5'),
        dataIndex: 'state',
        key: 'state',
        ellipsis: true,
        scopedSlots: true,
        search: {
            type: 'select',
            options: [
                { label: $t('Channel.index.290640-6'), value: 'enabled' },
                { label: $t('Channel.index.290640-7'), value: 'disabled' },
            ],
        },
    },
    {
        title: $t('Channel.index.290640-8'),
        dataIndex: 'runningState',
        key: 'runningState',
        ellipsis: true,
        scopedSlots: true,
        search: {
            type: 'select',
            options: [
                { label: $t('Channel.index.290640-9'), value: 'running' },
                { label: $t('Channel.index.290640-10'), value: 'stopped' },
            ],
        },
    },
    {
        title: $t('Channel.index.290640-2'),
        dataIndex: 'description',
        key: 'description',
        ellipsis: true,
        search: {
            type: 'string',
        },
    },
    {
        title: $t('Channel.index.290640-11'),
        key: 'action',
        fixed: 'right',
        width: 200,
        scopedSlots: true,
    },
];

const getActions = (
    data: Partial<Record<string, any>>,
    type: 'card' | 'table',
): any[] => {
    if (!data) return [];
    const state = data.state.value;
    const stateText = state === 'enabled' ? $t('Channel.index.290640-7') : $t('Channel.index.290640-12');
    const actions = [
        {
            key: 'update',
            text: $t('Channel.index.290640-13'),
            tooltip: {
                title: $t('Channel.index.290640-13'),
            },
            icon: 'EditOutlined',
            onClick: () => {
                handleEdit(data);
            },
        },
        {
            key: 'action',
            text: stateText,
            tooltip: {
                title: stateText,
            },
            icon: state === 'enabled' ? 'StopOutlined' : 'CheckCircleOutlined',
            popConfirm: {
                title: $t('Channel.index.290640-14', [stateText]),
                onConfirm: () => {
                    const response = update(data.id, updateStatus[state]);
                    response.then((res) => {
                        if (res.success) {
                            onlyMessage($t('Channel.index.290640-15'), 'success');
                            tableRef.value?.reload();
                        }
                    });
                    return response
                },
            },
        },
        {
            key: 'delete',
            text: $t('Channel.index.290640-16'),
            disabled: state === 'enabled',
            tooltip: {
                title:
                    state === 'enabled' ? $t('Channel.index.290640-17') : $t('Channel.index.290640-16'),
            },
            popConfirm: {
                placement: 'topRight',
                title: $t('Channel.index.290640-18'),
                onConfirm:  () => {
                    const response =  remove(data.id);
                    response.then((res)=>{
                        if (res.success) {
                        onlyMessage($t('Channel.index.290640-15'), 'success');
                        tableRef.value.reload();
                    }
                    })
                   return response
                },
            },
            icon: 'DeleteOutlined',
        },
    ];
    return actions;
};

const handlAdd = () => {
    current.value = {};
    visible.value = true;
};

const handleEdit = (data: object) => {
    current.value = cloneDeep(data);
    visible.value = true;
};
const handlEye = (id: string) => {
    menuStory.jumpPage(`DataCollect/Collector`, {
        query: { channelId: id }
    });
};
const saveChange = (value: object) => {
    visible.value = false;
    current.value = {};
    if (value) {
        onlyMessage($t('Channel.index.290640-15'), 'success');
        tableRef.value.reload();
    }
};
const getState = (record: Partial<Record<string, any>>) => {
    if (record) {
        if (record?.state?.value === 'enabled') {
            return { ...record?.runningState };
        } else {
            return {
                text: $t('Channel.index.290640-7'),
                value: 'disabled',
            };
        }
    } else {
        return {};
    }
};

/**
 * 搜索
 * @param params
 */
const handleSearch = (e: any) => {
    params.value = e;
};
</script>
<style lang="less" scoped>
.card-item-content {
    min-height: 100px;
    .card-item-content-box {
        min-height: 50px;
    }
    .card-item-content-text {
        margin-top: 10px;
        color: rgba(0, 0, 0, 0.75);
        font-size: 12px;
        overflow: hidden; //超出的文本隐藏
        text-overflow: ellipsis; //溢出用省略号显示
        white-space: nowrap; //溢出不换行
    }
    .explain {
        margin-top: 10px;
    }
}
.details-text {
    font-weight: 700;
    font-size: 14px;
}
</style>
