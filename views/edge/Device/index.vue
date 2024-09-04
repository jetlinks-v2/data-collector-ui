<template>
    <j-page-container>
        <pro-search
            :columns="columns"
            target="edge-device"
            @search="handleSearch"
        />
        <FullPage>
            <JProTable
                ref="edgeDeviceRef"
                :columns="columns"
                :request="query"
                :defaultParams="defaultParams"
                :params="params"
                :gridColumn="3"
            >
                <template #headerLeftRender>
                    <a-space>
                        <j-permission-button
                            type="primary"
                            @click="handleAdd"
                            hasPermission="edge/Device:add"
                        >
                            <template #icon
                                ><AIcon type="PlusOutlined"
                            /></template>
                            新增
                        </j-permission-button>
                        <j-permission-button
                            @click="importVisible = true"
                            hasPermission="edge/Device:import"
                        >
                            <template #icon
                                ><AIcon type="ImportOutlined"
                            /></template>
                            导入
                        </j-permission-button>
                    </a-space>
                </template>
                <template #card="slotProps">
                    <CardBox
                        :value="slotProps"
                        :actions="getActions(slotProps, 'card')"
                        :status="slotProps.state?.value"
                        :statusText="slotProps.state?.text"
                        @click="handleView(slotProps.id)"
                        :statusNames="{
                            online: 'processing',
                            offline: 'error',
                            notActive: 'warning',
                        }"
                    >
                        <template #img>
                            <img
                                :width="80"
                                :height="80"
                                :src="
                                    slotProps?.photoUrl || url
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
                                        设备类型
                                    </div>
                                    <div>{{ slotProps.deviceType?.text }}</div>
                                </a-col>
                                <a-col :span="12">
                                    <div class="card-item-content-text">
                                        产品名称
                                    </div>
                                    <j-ellipsis style="width: 100%">
                                        {{ slotProps.productName }}
                                    </j-ellipsis>
                                </a-col>
                            </a-row>
                        </template>
                        <template #actions="item">
                            <a-dropdown
                                placement="bottomRight"
                                v-if="item.key === 'others'"
                            >
                                <a-button>
                                    <AIcon :type="item.icon" />
                                    <span>{{ item.text }}</span>
                                </a-button>
                                <template #overlay>
                                    <a-menu>
                                        <a-menu-item
                                            v-for="(o, i) in item.children"
                                            :key="i"
                                        >
                                            <j-permission-button
                                                :disabled="
                                                    o.disabled ||
                                                    slotProps.state.value !==
                                                        'online'
                                                "
                                                :popConfirm="o.popConfirm"
                                                :tooltip="{
                                                    ...o.tooltip,
                                                }"
                                                @click="o.onClick"
                                                :hasPermission="
                                                    'edge/Device:' + o.key
                                                "
                                                type="link"
                                            >
                                                <AIcon :type="o.icon" />
                                                <span>{{ o?.text }}</span>
                                            </j-permission-button>
                                        </a-menu-item>
                                    </a-menu>
                                </template>
                            </a-dropdown>
                            <j-permission-button
                                :disabled="item.disabled"
                                v-else
                                :popConfirm="item.popConfirm"
                                :tooltip="{
                                    ...item.tooltip,
                                }"
                                @click="item.onClick"
                                :hasPermission="'edge/Device:' + item.key"
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
                            online: 'processing',
                            offline: 'error',
                            notActive: 'warning',
                        }"
                    />
                </template>
                <template #registryTime="slotProps">
                    <span>{{
                        slotProps.registryTime
                            ? dayjs(slotProps.registryTime).format(
                                  'YYYY-MM-DD HH:mm:ss',
                              )
                            : ''
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
                                        : 'edge/Device:' + i.key
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
        <Import
            @save="onRefresh"
            @close="importVisible = false"
            v-if="importVisible"
            type="official-edge-gateway"
        />
    </j-page-container>
</template>

<script lang="ts" setup>
import { useMenuStore } from '@/store/menu';
import { onlyMessage } from '@jetlinks-web/utils'
import dayjs from 'dayjs';
import { query, _delete, _deploy, _undeploy,queryNoPagingPost,queryTree} from '../../../api/others';
import { restPassword } from '../../../api/edge/device';
import url from '../../../assets/images/device-gateway.png'
import Save from './Save/index.vue';
import Import from '../../../components/Import/index.vue';

const menuStory = useMenuStore();

const defaultParams = {
    sorts: [{ name: 'createTime', order: 'desc' }],
    terms: [
        {
            terms: [
                {
                    column: 'productId$product-info',
                    value: 'accessProvider is official-edge-gateway',
                },
            ],
            type: 'and',
        },
    ],
};

const statusMap = new Map();
statusMap.set('online', 'success');
statusMap.set('offline', 'error');
statusMap.set('notActive', 'warning');

const params = ref<Record<string, any>>({});
const edgeDeviceRef = ref<Record<string, any>>({});
const importVisible = ref<boolean>(false);
const visible = ref<boolean>(false);
const current = ref<Record<string, any>>({});

const transformData = (arr: any[]): any[] => {
    if (Array.isArray(arr) && arr.length) {
        return (arr || []).map((item: any) => {
            return {
                ...item,
                id: `classifiedId is ${item.id}`,
                children: transformData(item.children),
            };
        });
    } else {
        return [];
    }
};

const columns = [
    {
        title: 'ID',
        dataIndex: 'id',
        key: 'id',
        search: {
            type: 'string',
            defaultTermType: 'eq',
        },
        ellipsis: true,
    },
    {
        title: '设备名称',
        dataIndex: 'name',
        key: 'name',
        search: {
            type: 'string',
            first: true,
        },
        ellipsis: true,
    },
    {
        title: '产品名称',
        dataIndex: 'productName',
        key: 'productName',
        search: {
            type: 'select',
            rename: 'productId',
            options: () =>
                new Promise((resolve) => {
                    queryNoPagingPost({ paging: false }).then((resp: any) => {
                        resolve(
                            resp.result.map((item: any) => ({
                                label: item.name,
                                value: item.id,
                            })),
                        );
                    });
                }),
        },
        ellipsis: true,
    },
    {
        title: '注册时间',
        dataIndex: 'registryTime',
        key: 'registryTime',
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
                { label: '禁用', value: 'notActive' },
                { label: '离线', value: 'offline' },
                { label: '在线', value: 'online' },
            ],
        },
    },
    {
        key: 'productId$product-info',
        dataIndex: 'productId$product-info',
        title: '产品分类',
        hideInTable: true,
        search: {
            type: 'treeSelect',
            options: () =>
                new Promise((resolve) => {
                    queryTree({ paging: false }).then((resp: any) => {
                        resolve(transformData(resp.result));
                    });
                }),
        },
    },
    // {
    //     key: 'productId$product-info',
    //     dataIndex: 'productId$product-info',
    //     title: '接入方式',
    //     hideInTable: true,
    //     search: {
    //         type: 'select',
    //         options: () =>
    //             new Promise((resolve) => {
    //                 queryGatewayList({}).then((resp: any) => {
    //                     resolve(
    //                         resp.result.map((item: any) => ({
    //                             label: item.name,
    //                             value: `accessId is ${item.id}`,
    //                         })),
    //                     );
    //                 });
    //             }),
    //     },
    // },
    {
        dataIndex: 'deviceType',
        title: '设备类型',
        valueType: 'select',
        hideInTable: true,
        search: {
            type: 'select',
            options: [
                { label: '直连设备', value: 'device' },
                { label: '网关子设备', value: 'childrenDevice' },
                { label: '网关设备', value: 'gateway' },
            ],
        },
    },
    {
        title: '说明',
        dataIndex: 'describe',
        key: 'describe',
        ellipsis: true,
        search: {
            type: 'string',
        },
    },
    {
        title: '操作',
        key: 'action',
        fixed: 'right',
        width: 300,
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
                handleView(data.id);
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
            key: 'action',
            text: data.state?.value !== 'notActive' ? '禁用' : '启用',
            tooltip: {
                title: data.state?.value !== 'notActive' ? '禁用' : '启用',
            },
            icon:
                data.state.value !== 'notActive'
                    ? 'StopOutlined'
                    : 'CheckCircleOutlined',
            popConfirm: {
                title: `确认${
                    data.state.value !== 'notActive' ? '禁用' : '启用'
                }?`,
                onConfirm: () => {
                    let response = undefined;
                    if (data.state.value !== 'notActive') {
                        response = _undeploy(data.id);
                    } else {
                        response = _deploy(data.id);
                    }
                    response.then((res) => {
                        if (res && res.status === 200) {
                            onlyMessage('操作成功！');
                            edgeDeviceRef.value?.reload();
                        } else {
                            onlyMessage('操作失败！', 'error');
                        }
                    });
                    return response;
                },
            },
        },
    ];
    const others = [
        {
            key: 'setting',
            text: '远程控制',
            tooltip: {
                title: '远程控制',
            },
            icon: 'ControlOutlined',
            onClick: () => {
                menuStory.jumpPage('edge/Device/Remote', {
                    params: {
                        id: data.id,
                    },
                });
            },
        },
        {
            key: 'password',
            text: '重置密码',
            tooltip: {
                title: '重置密码',
            },
            icon: 'RedoOutlined',
            popConfirm: {
                title: '确认重置密码为Jetlinks123？',
                onConfirm: () => {
                    const response = restPassword(data.id);
                    response.then((resp: any) => {
                        if (resp.status === 200) {
                            onlyMessage('操作成功！');
                            edgeDeviceRef.value?.reload();
                        }
                    });
                    return response;
                },
            },
        },
    ];

    const deleteItem = {
        key: 'delete',
        text: '删除',
        disabled: data.state?.value !== 'notActive',
        tooltip: {
            title:
                data.state.value !== 'notActive'
                    ? '已启用的设备不能删除'
                    : '删除',
        },
        popConfirm: {
            title: '确认删除?',
            onConfirm: () => {
                const response = _delete(data.id);
                response.then((resp) => {
                    if (resp.status === 200) {
                        onlyMessage('操作成功！');
                        edgeDeviceRef.value?.reload();
                    } else {
                        onlyMessage('操作失败！', 'error');
                    }
                });
                return response;
            },
        },
        icon: 'DeleteOutlined',
    };

    if (type === 'card') {
        const arr = actions.filter((i: any) => i.key !== 'view');
        return [
            ...arr,
            {
                key: 'others',
                text: '其他',
                icon: 'EllipsisOutlined',
                children: [...others],
            },
            deleteItem,
        ];
    } else {
        return [...actions, ...others, deleteItem];
    }
};

const handleSearch = (_params: any) => {
    params.value = _params;
};

const handleView = (id: string) => {
    menuStory.jumpPage('device/Instance/Detail', {
        params: {
            id
        }
     });
};

const handleAdd = () => {
    visible.value = true;
    current.value = {};
};

const saveBtn = () => {
    visible.value = false;
    edgeDeviceRef.value?.reload();
};

const onRefresh = () => {
    importVisible.value = false;
    edgeDeviceRef.value?.reload();
};
</script>

<style lang="less" scoped></style>
