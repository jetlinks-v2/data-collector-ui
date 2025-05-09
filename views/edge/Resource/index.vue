<template>
    <j-page-container>
        <pro-search
            :columns="columns"
            target="edge-resource"
            @search="handleSearch"
        />
        <FullPage>
            <JProTable
                ref="edgeResourceRef"
                :columns="columns"
                :request="query"
                :defaultParams="defaultParams"
                :params="params"
            >
                <template #card="slotProps">
                    <CardBox
                        :value="slotProps"
                        @click="handleView(slotProps)"
                        :actions="getActions(slotProps, 'card')"
                        :status="slotProps.state?.value"
                        :statusText="slotProps.state?.text"
                        :statusNames="{
                            enabled: 'processing',
                            disabled: 'error',
                        }"
                    >
                        <template #img>
                            <img
                                :src="imgUrl
                                    // getImage('/device/instance/device-card.png')
                                "
                            />
                        </template>
                        <template #content>
                            <j-ellipsis style="width: calc(100% - 100px)">
                                <span style="font-size: 16px; font-weight: 600">
                                    {{ slotProps.name }}
                                </span>
                            </j-ellipsis>
                            <a-row style="margin-top: 18px">
                                <a-col :span="12">
                                    <div class="card-item-content-text">
                                        通讯协议
                                    </div>
                                    <j-ellipsis>{{
                                        slotProps.category
                                    }}</j-ellipsis>
                                </a-col>
                                <a-col :span="12">
                                    <div class="card-item-content-text">
                                        所属边缘网关
                                    </div>
                                    <j-ellipsis style="width: 100%">
                                        {{ slotProps.sourceName }}
                                    </j-ellipsis>
                                </a-col>
                            </a-row>
                        </template>
                        <template #actions="item">
                            <j-permission-button
                                :disabled="item.disabled"
                                :popConfirm="item.popConfirm"
                                :tooltip="{
                                    ...item.tooltip,
                                }"
                                @click="item.onClick"
                                :hasPermission="'edge/Resource:' + item.key"
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
                <template #state="slotProps">
                    <j-badge-status
                        :status="slotProps.state?.value"
                        :text="slotProps.state?.text"
                        :statusNames="{
                            enabled: 'processing',
                            disabled: 'error',
                        }"
                    />
                </template>
                <template #sourceId="slotProps">
                    {{ slotProps.sourceName }}
                </template>
                <template #category="slotProps">
                    {{ slotProps.category }}
                </template>
                <template #createTime="slotProps">
                    <span>{{
                        dayjs(slotProps.createTime).format(
                            'YYYY-MM-DD HH:mm:ss',
                        )
                    }}</span>
                </template>
                <template #action="slotProps">
                    <a-space :size="16">
                        <template
                            v-for="i in getActions(slotProps, 'table')"
                            :key="i.key"
                        >
                            <j-permission-button
                                :disabled="i.disabled"
                                :popConfirm="i.popConfirm"
                                :tooltip="{
                                    ...i.tooltip,
                                }"
                                @click="i.onClick"
                                type="link"
                                style="padding: 0 5px"
                                :danger="i.key === 'delete'"
                                :hasPermission="
                                    i.key === 'view'
                                        ? true
                                        : 'edge/Resource:' + i.key
                                "
                            >
                                <template #icon
                                    ><AIcon :type="i.icon"
                                /></template>
                            </j-permission-button>
                        </template>
                    </a-space>
                </template>
            </JProTable>
        </FullPage>

        <Save
            v-if="visible"
            :data="current"
            @close="visible = false"
            @save="saveBtn"
        />
        <Issue
            v-if="settingVisible"
            :data="current"
            @close="settingVisible = false"
        />
    </j-page-container>
</template>

<script lang="ts" setup>
import { useMenuStore } from '@/store/menu';
import { onlyMessage } from '@jetlinks-web/utils'
import imgUrl from '../../../assets/device-card.png';
import dayjs from 'dayjs';
import { query, _delete, _start, _stop } from '../../../api/edge/resource';
import Save from './Save/index.vue';
import Issue from './Issue/index.vue';

const menuStory = useMenuStore();

const defaultParams = { sorts: [{ name: 'createTime', order: 'desc' }] };

const statusMap = new Map();
statusMap.set('enabled', 'processing');
statusMap.set('disabled', 'error');

const params = ref<Record<string, any>>({});
const edgeResourceRef = ref<Record<string, any>>({});
const settingVisible = ref<boolean>(false);
const visible = ref<boolean>(false);
const current = ref<Record<string, any>>({});

const columns = [
    {
        title: 'ID',
        dataIndex: 'id',
        key: 'id',
    },
    {
        title: '名称',
        dataIndex: 'name',
        key: 'name',
        ellipsis: true,
        search: {
            type: 'string',
        },
    },
    {
        dataIndex: 'category',
        title: '通信协议',
        valueType: 'select',
        scopedSlots: true,
        key: 'category',
        search: {
            type: 'select',
            options: () =>
                new Promise((resolve) => {
                    query({
                        paging: false,
                        sorts: [{ name: 'createTime', order: 'desc' }],
                    }).then((resp: any) => {
                        const arrMap = new Map();
                        resp.result.data.forEach((item: any) => {
                            arrMap.set(item.category, {
                                label: item.category,
                                value: item.category,
                            });
                        });
                        resolve([...arrMap.values()]);
                    });
                }),
        },
    },
    {
        title: '所属边缘网关',
        dataIndex: 'sourceId',
        key: 'sourceId',
        scopedSlots: true,
        search: {
            type: 'select',
            options: () =>
                new Promise((resolve) => {
                    query({
                        paging: false,
                        sorts: [
                            {
                                name: 'createTime',
                                order: 'desc',
                            },
                        ],
                    }).then((resp: any) => {
                        const arrMap = new Map();
                        resp.result.data.forEach((item: any) => {
                            arrMap.set(item.sourceId, {
                                label: item.sourceName,
                                value: item.sourceId,
                            });
                        });
                        resolve([...arrMap.values()]);
                    });
                }),
        },
    },
    {
        title: '创建时间',
        dataIndex: 'createTime',
        key: 'createTime',
        scopedSlots: true,
        search: {
            type: 'date',
        },
    },
    {
        title: '状态',
        dataIndex: 'state',
        key: 'state',
        scopedSlots: true,
        search: {
            type: 'select',
            options: [
                { label: '禁用', value: 'disabled' },
                { label: '正常', value: 'enabled' },
            ],
        },
    },
    {
        title: '操作',
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
    const actions = [
        {
            key: 'view',
            text: '查看',
            tooltip: {
                title: '查看',
            },
            icon: 'EyeOutlined',
            onClick: () => {
                handleView(data);
            },
        },
        {
            key: 'update',
            text: '编辑',
            tooltip: {
                title: '编辑',
            },
            icon: 'EditOutlined',
            onClick: () => {
                visible.value = true;
                current.value = data;
            },
        },
        {
            key: 'setting',
            text: '下发',
            disabled: data.state?.value === 'disabled',
            tooltip: {
                title:
                    data.state.value === 'disabled'
                        ? '请先启用，再下发'
                        : '下发',
            },
            icon: 'DownSquareOutlined',
            onClick: () => {
                settingVisible.value = true;
                current.value = data;
            },
        },
        {
            key: 'action',
            text: data.state?.value !== 'disabled' ? '禁用' : '启用',
            tooltip: {
                title: data.state?.value !== 'disabled' ? '禁用' : '启用',
            },
            icon:
                data.state.value !== 'disabled'
                    ? 'StopOutlined'
                    : 'CheckCircleOutlined',
            popConfirm: {
                title: `确认${
                    data.state.value !== 'disabled' ? '禁用' : '启用'
                }?`,
                onConfirm: () => {
                    let response = undefined;
                    if (data.state.value !== 'disabled') {
                        response = _stop([data.id]);
                    } else {
                        response = _start([data.id]);
                    }
                    response.then((res) => {
                        if (res && res.status === 200) {
                            onlyMessage('操作成功！');
                            edgeResourceRef.value?.reload();
                        } else {
                            onlyMessage('操作失败！', 'error');
                        }
                    });
                    return response;
                },
            },
        },
        {
            key: 'delete',
            text: '删除',
            disabled: data.state?.value !== 'disabled',
            tooltip: {
                title:
                    data.state.value !== 'disabled'
                        ? '请先禁用，再删除。'
                        : '删除',
            },
            popConfirm: {
                title: '确认删除?',
                onConfirm: () => {
                    const response = _delete(data.id);
                    response.then((res) => {
                        if (res.status === 200) {
                            onlyMessage('操作成功！');
                            edgeResourceRef.value?.reload();
                        } else {
                            onlyMessage('操作失败！', 'error');
                        }
                    });
                    return response
                },
            },
            icon: 'DeleteOutlined',
        },
    ];
    if (type === 'card')
        return actions.filter((i: any) => i.key !== 'view');
    return actions;
};

const handleSearch = (_params: any) => {
    params.value = _params;
};

const handleView = (dt: any) => {
    menuStory.jumpPage('device/Instance/Detail', {
        params: {
            id: dt?.sourceId
        },
     });
};

const saveBtn = () => {
    visible.value = false;
    edgeResourceRef.value?.reload();
};

const onRefresh = () => {
    settingVisible.value = false;
    edgeResourceRef.value?.reload();
};
</script>

<style lang="less" scoped></style>
