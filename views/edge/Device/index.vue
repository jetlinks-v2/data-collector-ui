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
                modeValue="CARD"
                :defaultParams="defaultParams"
                :params="params"
                :gridColumns="[2, 2, 2, 3]"
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
                            {{ $t('Device.index.911422-0') }}
                        </j-permission-button>
                        <j-permission-button
                            @click="importVisible = true"
                            hasPermission="edge/Device:import"
                        >
                            <template #icon
                                ><AIcon type="ImportOutlined"
                            /></template>
                            {{ $t('Device.index.911422-1') }}
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
                                        {{ $t('Device.index.911422-3') }}
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
                            : '--'
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
            v-if="importVisible"
            :type="['agent-device-gateway', 'agent-media-device-gateway']"
            @save="onRefresh"
            @close="importVisible = false"
        />
    </j-page-container>
</template>

<script lang="ts" setup>
import { useMenuStore } from '@/store/menu';
import { onlyMessage } from '@jetlinks-web/utils'
import { openEdgeUrl } from '../../../utils/utils';
import dayjs from 'dayjs';
import { query, _delete, _deploy, _undeploy,queryNoPagingPost,queryTree} from '../../../api/others';
import url from '../../../assets/device-gateway.png'
import Save from './Save/index.vue';
import Import from '../../../components/Import/index.vue';
import { useI18n } from 'vue-i18n';

const { t: $t } = useI18n();

const menuStory = useMenuStore();

const defaultParams = {
    sorts: [{ name: 'createTime', order: 'desc' }],
    terms: [
        {
            terms: [
                {
                    column: 'productId$product-info',
                    value: 'accessProvider in (agent-device-gateway,agent-media-device-gateway,official-edge-gateway)',
                },
            ],
            type: 'and',
        },
        {
            "terms": [
                {
                    "type": "or",
                    "value": "gateway",
                    "termType": "eq",
                    "column": "deviceType"
                }
            ]
        }
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
        title: $t('Device.index.911422-4'),
        dataIndex: 'name',
        key: 'name',
        search: {
            type: 'string',
            first: true,
        },
        ellipsis: true,
    },
    {
        title: $t('Device.index.911422-3'),
        dataIndex: 'productName',
        key: 'productName',
        search: {
            type: 'select',
            rename: 'productId',
            options: () =>
                new Promise((resolve) => {
                    queryNoPagingPost({ paging: false, terms: [
                        {
                          column: 'accessProvider',
                          termType: 'in',
                          value: ['agent-device-gateway','agent-media-device-gateway','official-edge-gateway']
                        }
                      ]}).then((resp: any) => {
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
        title: $t('Device.index.911422-5'),
        dataIndex: 'registryTime',
        key: 'registryTime',
        scopedSlots: true,
        search: {
            type: 'date',
        },
    },
    {
        title: $t('Device.index.911422-6'),
        dataIndex: 'state',
        key: 'state',
        scopedSlots: true,
        search: {
            type: 'select',
            options: [
                { label: $t('Device.index.911422-7'), value: 'notActive' },
                { label: $t('Device.index.911422-8'), value: 'offline' },
                { label: $t('Device.index.911422-9'), value: 'online' },
            ],
        },
    },
    {
        key: 'productId$product-info',
        dataIndex: 'productId$product-info',
        title: $t('Device.index.911422-10'),
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
        title: $t('Device.index.911422-2'),
        valueType: 'select',
        hideInTable: true,
    },
    {
        title: $t('Device.index.911422-14'),
        dataIndex: 'describe',
        key: 'describe',
        ellipsis: true,
        search: {
            type: 'string',
        },
    },
    {
        title: $t('Device.index.911422-15'),
        key: 'action',
        fixed: 'right',
        width: 300,
        scopedSlots: true,
    },
];

const getActions = (
    data: Partial<Record<string, any>>,
    type: 'card' | 'table',
): ActionsType[] => {
    if (!data) return [];
    const actions = [
        {
            key: 'view',
            text: $t('Device.index.911422-16'),
            tooltip: {
                title: $t('Device.index.911422-16'),
            },
            icon: 'EyeOutlined',
            onClick: () => {
                handleView(data.id);
            },
        },
        {
            key: 'update',
            text: $t('Device.index.911422-17'),
            tooltip: {
                title: $t('Device.index.911422-17'),
            },
            icon: 'EditOutlined',
            onClick: () => {
                visible.value = true;
                current.value = data;
            },
        },
        {
            key: 'action',
            text: data.state?.value !== 'notActive' ? $t('Device.index.911422-7') : $t('Device.index.911422-18'),
            tooltip: {
                title: data.state?.value !== 'notActive' ? $t('Device.index.911422-7') : $t('Device.index.911422-18'),
            },
            icon:
                data.state.value !== 'notActive'
                    ? 'StopOutlined'
                    : 'CheckCircleOutlined',
            popConfirm: {
                title: `${$t('Device.index.911422-19', [data.state.value !== 'notActive' ? $t('Device.index.911422-7') : $t('Device.index.911422-18')])}`,
                onConfirm: () => {
                    let response = undefined;
                    if (data.state.value !== 'notActive') {
                        response = _undeploy(data.id);
                    } else {
                        response = _deploy(data.id);
                    }
                    response.then((res) => {
                        if (res && res.status === 200) {
                            onlyMessage($t('Device.index.911422-20'));
                            edgeDeviceRef.value?.reload();
                        } else {
                            onlyMessage($t('Device.index.911422-21'), 'error');
                        }
                    });
                    return response;
                },
            },
        },
        {
            key: 'setting',
            text: $t('Device.index.911422-22'),
            disabled: data.state.value !== 'online',
            tooltip: {
                title: $t('Device.index.911422-22'),
            },
            icon: 'ControlOutlined',
            onClick: async () => {
                await openEdgeUrl(data?.id)
            },
        },
    ];


    const deleteItem = {
        key: 'delete',
        text: $t('Device.index.911422-23'),
        disabled: data.state?.value !== 'notActive',
        tooltip: {
            title:
                data.state.value !== 'notActive'
                    ? $t('Device.index.911422-24')
                    : $t('Device.index.911422-23'),
        },
        popConfirm: {
            title: $t('Device.index.911422-25'),
            onConfirm: () => {
                const response = _delete(data.id);
                response.then((resp) => {
                    if (resp.status === 200) {
                        onlyMessage($t('Device.index.911422-20'));
                        edgeDeviceRef.value?.reload();
                    } else {
                        onlyMessage($t('Device.index.911422-21'), 'error');
                    }
                });
                return response;
            },
        },
        icon: 'DeleteOutlined',
    };

    if (type === 'card') {
        const arr = actions.filter((i: ActionsType) => i.key !== 'view');
        return [
            ...arr,
            deleteItem,
        ];
    } else {
        return [...actions, deleteItem];
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
