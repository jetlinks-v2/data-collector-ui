<template>
    <j-page-container>
    <FullPage transparentBackground>
      <ContentPanel>
        <div>
            <pro-search
                :columns="columns"
                target="search-datacollect-channel"
                @search="handleSearch"
            />
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
                    :hasPermission="`${permissionKey}:add`"
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
                          <Image
                            :src="ImageMap.get(slotProps.provider)?ImageMap.get(slotProps.provider):ImageMap.get('protocol')"
                            class="card-list-img-80"
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
                            :hasPermission="`${permissionKey}:${item.key}`"
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
        </div>
      </ContentPanel>
    </FullPage>
            <Save v-if="visible" :data="current" @change="saveChange" />
        
    </j-page-container>
</template>
<script lang="ts" setup name="DataCollectPage">
import {
    query,
    remove,
    update,
} from '../../../api/data-collect/channel';
import { onlyMessage } from '@jetlinks-web/utils'
import { StatusColorEnum, updateStatus ,protocolList,ImageMap} from './data';
import { useMenuStore } from '@jetlinks-web-core/store/menu';
import Save from './Save/index.vue';
import { cloneDeep } from 'lodash-es';
import { useI18n } from 'vue-i18n';
import {useCollectorProvider} from "@data-collector-ui/hooks";

const {t: $t} = useI18n();
const menuStory = useMenuStore();
const tableRef = ref<Record<string, any>>({});
const params = ref<Record<string, any>>({});
const visible = ref(false);
const current = ref({});
const permissionKey = inject('dataCollectChannelPermissionKey', 'DataCollect/Channel')
const permissionCollectorKey = inject('dataCollectCollectorPermissionKey', 'DataCollect/Collector')

const { providers } = useCollectorProvider('data-collect/channel');

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
            options: providers
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
    menuStory.jumpPage(permissionCollectorKey, {
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
