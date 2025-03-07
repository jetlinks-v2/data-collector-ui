<template>
    <j-page-container>
        <pro-search
            :columns="columns"
            target="edge-resource-ai-model"
            @search="handleSearch"
        />
        <full-page>
            <JProTable
                ref="tableRef"
                :columns="columns"
                :request="queryPage"
                :params="params"
                :defaultParams="{
                    sorts: [{ name: 'createTime', order: 'desc' }],
                }"
                modeValue="CARD"
            >
                <template #headerLeftRender>
                    <a-space>
                        <j-permission-button
                            type="primary"
                            hasPermission="edge/NewResource:add"
                            @click="handleAdd"
                        >
                            <template #icon
                            >
                                <AIcon type="PlusOutlined"
                                />
                            </template>
                            {{ $t('NewResource.index.035355-0') }}
                        </j-permission-button>
                    </a-space>
                </template>
                <template #card="slotProps">
                    <CardBox
                        :value="slotProps"
                        :actions="getActions(slotProps, 'card')"
                        :status="slotProps.state?.value"
                        :statusText="slotProps.state?.text"
                        :statusNames="{
                            enabled: 'processing',
                            disabled: 'error'
                        }"
                        @click="handleView(slotProps.id)"
                    >
                        <template #img>
                            <img
                                :width="80"
                                :height="80"
                                :src="
                                    slotProps?.photoUrl ||
                                    DeviceGatewayImg
                                "
                                alt=""
                            />
                        </template>
                        <template #content>
                            <j-ellipsis style="width: calc(100% - 100px)">
                                <span style="font-size: 16px; font-weight: 600">
                                    {{ slotProps.name }}
                                </span>
                            </j-ellipsis>
                            <a-row :gutter="16" style="margin-top: 18px">
                                <a-col :span="12">
                                    <div class="card-item-content-text">
                                        {{ $t('NewResource.index.035355-1') }}
                                    </div>
                                    <j-ellipsis>
                                        <span>
                                            {{ TargetTypeOptions.find(item => slotProps.targetType === item.value)?.label }}
                                        </span>
                                    </j-ellipsis>
                                </a-col>
                                <a-col :span="12">
                                    <div class="card-item-content-text">
                                        {{ $t('NewResource.index.035355-2') }}
                                    </div>
                                    <j-ellipsis style="width: 100%">
                                        {{ JSON.parse(slotProps.metadata || '{}')?.description || '--' }}
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
                                :hasPermission="'edge/NewResource:' + item.key"
                            >
                                <AIcon
                                    type="DeleteOutlined"
                                    v-if="item.key === 'delete'"
                                />
                                <template v-else>
                                    <AIcon :type="item.icon"/>
                                    <span>{{ item?.text }}</span>
                                </template>
                            </j-permission-button>
                        </template>
                    </CardBox>
                </template>
                <template #describe="slotProps">
                    {{ JSON.parse(slotProps.metadata || '{}')?.description || '--' }}
                </template>
                <template #state="slotProps">
                    <JBadgeStatus
                        :status="slotProps.state?.value"
                        :text="slotProps.state?.text"
                        :statusNames="{
                            enabled: 'processing',
                            disabled: 'error'
                        }"
                    />
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
                                        ? true : 'edge/NewResource:' + i.key"
                            >
                                <template #icon>
                                    <AIcon :type="i.icon"/>
                                </template>
                            </j-permission-button>
                        </template>
                    </a-space>
                </template>
            </JProTable>
        </full-page>
    </j-page-container>
    <Save v-if="saveVisible" :data="currentData" @close="saveVisible = false" @save="handleSave"/>
    <Issue v-if="issueVisible" :jobType="JobTypeEnum[currentData?.targetType]" :service-id="ServiceIdEnum[currentData?.targetType]" :data="currentData" @close="issueVisible = false"/>
</template>

<script setup lang="ts">
import Save from './Save/index.vue';
import Issue from './Issue/index.vue';
import {queryPage, remove, update} from '../../../api/edge/newResource'
import {onlyMessage} from "@jetlinks-web/utils";
import { useMenuStore } from "@/store/menu";
import { TargetTypeOptions, ServiceIdEnum, JobTypeEnum } from './utils';
import DeviceGatewayImg from '../../../assets/device-gateway.png';
import { useI18n } from 'vue-i18n';

const { t: $t } = useI18n();

const columns = [
    {
        title: 'ID',
        dataIndex: 'id',
        key: 'id',
        width: 200,
        search: {
            type: 'string'
        }
    },
    {
        title: $t('NewResource.index.035355-3'),
        dataIndex: 'name',
        key: 'name',
        width: 200,
        search: {
            type: 'string'
        }
    },
    {
        title: $t('NewResource.index.035355-1'),
        dataIndex: 'targetType',
        key: 'targetType',
        width: 150,
        search: {
            type: 'select',
            options: TargetTypeOptions
        }
    },
    {
        title: $t('NewResource.index.035355-4'),
        dataIndex: 'state',
        key: 'state',
        width: 100,
        scopedSlots: true,
        search: {
            type: 'select',
            options: [
                {label: $t('NewResource.index.035355-5'), value: 'enabled'},
                {label: $t('NewResource.index.035355-6'), value: 'disabled'},
            ]
        }
    },
    {
        title: $t('NewResource.index.035355-2'),
        dataIndex: 'describe',
        key: 'describe',
        width: 200,
        scopedSlots: true
    },
    {
        title: $t('NewResource.index.035355-7'),
        dataIndex: 'action',
        key: 'action',
        width: 250,
        fixed: 'right',
        scopedSlots: true
    }
]

const tableRef = ref();
const saveVisible = ref(false);
const issueVisible = ref(false);
const currentData = ref({});
const params = ref();
const menuStore = useMenuStore();

const getActions = (data, type) => {
    const actions = [
        {
            key: 'update',
            text: $t('NewResource.index.035355-8'),
            tooltip: {
                title: $t('NewResource.index.035355-8'),
            },
            icon: 'EditOutlined',
            onClick: () => {
                currentData.value = data;
                saveVisible.value = true;
            },
        },
        {
            key: 'action',
            text: data.state?.value !== 'disabled' ? $t('NewResource.index.035355-6') : $t('NewResource.index.035355-5'),
            tooltip: {
                title: data.state?.value !== 'disabled' ? $t('NewResource.index.035355-6') : $t('NewResource.index.035355-5'),
            },
            icon:
                data.state.value !== 'disabled'
                    ? 'StopOutlined'
                    : 'CheckCircleOutlined',
            popConfirm: {
                title: $t('NewResource.index.035355-9', [data.state.value !== 'disabled' ? $t('NewResource.index.035355-6') : $t('NewResource.index.035355-5')]),
                onConfirm: () => {
                    const state = data.state.value === 'disabled' ? 'enabled' : 'disabled';
                    update(data.id, {state}).then(() => {
                        onlyMessage($t('NewResource.index.035355-10'));
                        tableRef.value?.reload();
                    });
                },
            },
        },
        {
            key: 'issue',
            text: $t('NewResource.index.035355-11'),
            tooltip: {
                title: data.state.value === 'disabled' ? $t('NewResource.index.035355-12') : $t('NewResource.index.035355-11'),
            },
            disabled: data.state?.value === 'disabled',
            icon: 'DownSquareOutlined',
            onClick: () => {
                currentData.value = data;
                issueVisible.value = true;
            },
        },
        {
            key: 'delete',
            text: $t('NewResource.index.035355-13'),
            tooltip: {
                title: data.state?.value === 'enabled' ? $t('NewResource.index.035355-14') : $t('NewResource.index.035355-13'),
            },
            disabled: data.state?.value === 'enabled',
            icon: 'DeleteOutlined',
            popConfirm: {
                title: $t('NewResource.index.035355-15'),
                onConfirm: () => {
                    remove(data.id).then(() => {
                        onlyMessage($t('NewResource.index.035355-10'));
                        tableRef.value?.reload();
                    })
                },
            },
        }
    ];
    if(type === 'table') {
        actions.unshift({
            key: 'view',
            text: $t('NewResource.index.035355-16'),
            tooltip: {
                title: $t('NewResource.index.035355-16'),
            },
            icon: 'EyeOutlined',
            onClick: () => {
                handleView(data.id);
            }
        },)
    }
    return actions
}

const handleSearch = (e: any) => {
    params.value = e;
}

const handleAdd = () => {
    currentData.value = {};
    saveVisible.value = true;
}

const handleSave = () => {
    tableRef.value?.reload();
    saveVisible.value = false;
}

const handleView = (id: string) => {
    menuStore.jumpPage('edge/NewResource/Detail', {params: {id}});
}
</script>

<style scoped lang="less">

</style>
