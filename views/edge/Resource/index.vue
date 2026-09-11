<template>
    <j-page-container>
    <FullPage transparentBackground>
      <ContentPanel>
        <pro-search
            :columns="columns"
            target="edge-resource"
            @search="handleSearch"
        />
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
                                    {{ $t('Channel.index.290640-4') }}
                                </div>
                                <j-ellipsis>{{
                                    slotProps.category
                                }}</j-ellipsis>
                            </a-col>
                            <a-col :span="12">
                                <div class="card-item-content-text">
                                    {{ $t('Resource.index.400159-0') }}
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
      </ContentPanel>
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
import { useMenuStore } from '@jetlinks-web-core/store/menu';
import { onlyMessage } from '@jetlinks-web/utils'
import imgUrl from '../../../assets/device-card.png';
import dayjs from 'dayjs';
import { query, _delete, _start, _stop } from '../../../api/edge/resource';
import Save from './Save/index.vue';
import Issue from './Issue/index.vue';
import {useI18n} from 'vue-i18n';

const {t: $t} = useI18n();
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
        title: $t('NewResource.index.035355-3'),
        dataIndex: 'name',
        key: 'name',
        ellipsis: true,
        search: {
            type: 'string',
        },
    },
    {
        dataIndex: 'category',
        title: $t('Resource.index.400159-1'),
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
        title: $t('Resource.index.400159-0'),
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
        title: $t('Save.GateWayDeviceModal.290645-4'),
        dataIndex: 'createTime',
        key: 'createTime',
        scopedSlots: true,
        search: {
            type: 'date',
        },
    },
    {
        title: $t('Channel.index.290640-5'),
        dataIndex: 'state',
        key: 'state',
        scopedSlots: true,
        search: {
            type: 'select',
            options: [
                { label: $t('Channel.index.290640-7'), value: 'disabled' },
                { label: $t('Channel.index.290640-6'), value: 'enabled' },
            ],
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
    const actions = [
        {
            key: 'view',
            text: $t('NewResource.index.035355-16'),
            tooltip: {
                title: $t('NewResource.index.035355-16'),
            },
            icon: 'EyeOutlined',
            onClick: () => {
                handleView(data);
            },
        },
        {
            key: 'update',
            text: $t('Channel.index.290640-13'),
            tooltip: {
                title: $t('Channel.index.290640-13'),
            },
            icon: 'EditOutlined',
            onClick: () => {
                visible.value = true;
                current.value = data;
            },
        },
        {
            key: 'setting',
            text: $t('NewResource.index.035355-11'),
            disabled: data.state?.value === 'disabled',
            tooltip: {
                title:
                    data.state.value === 'disabled'
                        ? $t('NewResource.index.035355-12')
                        : $t('NewResource.index.035355-11'),
            },
            icon: 'DownSquareOutlined',
            onClick: () => {
                settingVisible.value = true;
                current.value = data;
            },
        },
        {
            key: 'action',
            text: data.state?.value !== 'disabled' ? $t('Channel.index.290640-7') : $t('Channel.index.290640-12'),
            tooltip: {
                title: data.state?.value !== 'disabled' ? $t('Channel.index.290640-7') : $t('Channel.index.290640-12'),
            },
            icon:
                data.state.value !== 'disabled'
                    ? 'StopOutlined'
                    : 'CheckCircleOutlined',
            popConfirm: {
                title: $t('Channel.index.290640-14', [
                    data.state.value !== 'disabled' ? $t('Channel.index.290640-7') : $t('Channel.index.290640-12')
                ]),
                onConfirm: () => {
                    let response = undefined;
                    if (data.state.value !== 'disabled') {
                        response = _stop([data.id]);
                    } else {
                        response = _start([data.id]);
                    }
                    response.then((res) => {
                        if (res && res.status === 200) {
                            onlyMessage($t('DataCollect.index.400150-28'));
                            edgeResourceRef.value?.reload();
                        } else {
                            onlyMessage($t('Resource.index.400159-2'), 'error');
                        }
                    });
                    return response;
                },
            },
        },
        {
            key: 'delete',
            text: $t('Channel.index.290640-16'),
            disabled: data.state?.value !== 'disabled',
            tooltip: {
                title:
                    data.state.value !== 'disabled'
                        ? $t('NewResource.index.035355-14')
                        : $t('Channel.index.290640-16'),
            },
            popConfirm: {
                title: $t('NewResource.index.035355-15'),
                onConfirm: () => {
                    const response = _delete(data.id);
                    response.then((res) => {
                        if (res.status === 200) {
                            onlyMessage($t('DataCollect.index.400150-28'));
                            edgeResourceRef.value?.reload();
                        } else {
                            onlyMessage($t('Resource.index.400159-2'), 'error');
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
