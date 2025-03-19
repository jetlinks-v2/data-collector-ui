<template>
    <a-modal
        visible
        :title="$t('task.GatewayModal.823128-0')"
        :width="1300"
        @cancel="onCancel"
        @ok="onOk"
    >
        <a-tabs v-model:active="activeKey">
            <a-tab-pane :tab="$t('task.GatewayModal.823128-1')" value="device"></a-tab-pane>
        </a-tabs>
        <div class="device-select-body">
            <pro-search
                type="simple"
                :columns="columns"
                :style="{ padding: 0, marginBottom: 0 }"
                @search="handleSearch"
            />
            <JProTable
                ref="edgeDeviceRef"
                :columns="columns"
                modeValue="CARD"
                :style="{ padding: '24px 0' }"
                :request="query"
                :params="params"
                :defaultParams="defaultParams"
                :gridColumn="3"
                :rowSelection="{
                    selectedRowKeys: deviceRowKeys,
                    onSelect: handleClick,
                    onSelectAll: selectAll,
                    onSelectNone: onSelectNone,
                }"
            >
                <template #card="slotProps">
                    <CardBox
                        :value="slotProps"
                        :status="slotProps.state?.value"
                        :statusText="slotProps.state?.text"
                        :statusNames="{
                            online: 'processing',
                            offline: 'error',
                            notActive: 'warning',
                        }"
                        :active="deviceRowKeys.includes(slotProps.id)"
                        @click="handleClick"
                    >
                        <template #img>
                            <img
                                :width="80"
                                :height="80"
                                :src="
                                    slotProps?.photoUrl ||
                                    DeviceGatewayImg
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
                                <a-col :span="24">
                                    <div class="card-item-content-text">
                                        {{ $t('task.GatewayModal.823128-2') }}
                                    </div>
                                    <j-ellipsis style="width: 100%">
                                        {{ slotProps.productName }}
                                    </j-ellipsis>
                                </a-col>
                            </a-row>
                        </template>
                    </CardBox>
                </template>
                <template #state="slotProps">
                    <JBadgeStatus
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
            </JProTable>
        </div>
    </a-modal>
</template>

<script setup name="DeviceSelectBody">
import {query, queryNoPagingPost, queryTree} from '../../../../api/others';
import dayjs from 'dayjs'
import {onlyMessage} from '@jetlinks-web/utils';
import DeviceGatewayImg from '../../../../assets/device-gateway.png'
import { useI18n } from 'vue-i18n';

const { t: $t } = useI18n();
const props = defineProps({
    filter: {
        type: Array,
        default: []
    }
})

const activeKey = ref('device')

const defaultParams = computed(() => {
    const _params = {
        sorts: [{name: 'createTime', order: 'desc'}],
        terms: [
            {
                terms: [
                    {
                        column: 'productId$product-info',
                        value: 'accessProvider in (agent-device-gateway,agent-media-device-gateway,official-edge-gateway)'
                    }
                ],
                type: 'and',
            },
        ],
    };

    if (props.filter.length) {
        _params.terms[0].terms.push({
            column: 'id$nin',
            value: props.filter.map(item => item.id || item.thingId).join(','),
            type: 'and'
        })
    }

    return _params
})

const emit = defineEmits(['cancel', 'ok'])

const params = ref()
const deviceRowKeys = ref([])

const deviceSelected = reactive([])

const transformData = (arr) => {
    if (Array.isArray(arr) && arr.length) {
        return (arr || []).map((item) => {
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
        title: $t('task.GatewayModal.823128-3'),
        dataIndex: 'name',
        key: 'name',
        search: {
            type: 'string',
            first: true,
        },
        ellipsis: true,
    },
    {
        title: $t('task.GatewayModal.823128-2'),
        dataIndex: 'productName',
        key: 'productName',
        search: {
            type: 'select',
            rename: 'productId',
            options: () =>
                new Promise((resolve) => {
                    queryNoPagingPost({
                        paging: false,
                        terms: [{
                            column: 'accessProvider',
                            value: ['agent-device-gateway','agent-media-device-gateway','official-edge-gateway'],
                            termType: 'in',
                        }]
                    }).then((resp) => {
                        resolve(
                            resp.result.map((item) => ({
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
        title: $t('task.GatewayModal.823128-4'),
        dataIndex: 'registryTime',
        key: 'registryTime',
        scopedSlots: true,
        search: {
            type: 'date',
        },
    },
    {
        title: $t('task.GatewayModal.823128-5'),
        dataIndex: 'state',
        key: 'state',
        scopedSlots: true,
        search: {
            type: 'select',
            options: [
                {label: $t('task.GatewayModal.823128-6'), value: 'notActive'},
                {label: $t('task.GatewayModal.823128-7'), value: 'offline'},
                {label: $t('task.GatewayModal.823128-8'), value: 'online'},
            ],
        },
    },
    {
        key: 'productId$product-info',
        dataIndex: 'productId$product-info',
        title: $t('task.GatewayModal.823128-9'),
        hideInTable: true,
        search: {
            type: 'treeSelect',
            options: () =>
                new Promise((resolve) => {
                    queryTree({paging: false}).then((resp) => {
                        resolve(transformData(resp.result));
                    });
                }),
        },
    },
    {
        title: $t('task.GatewayModal.823128-10'),
        dataIndex: 'describe',
        key: 'describe',
        ellipsis: true,
        search: {
            type: 'string',
        },
    },
]

const onCancel = () => {
    emit('cancel')
}

const onOk = () => {
    if (toRaw(deviceSelected).length) {
        emit('ok', toRaw(deviceSelected))
    } else {
        onlyMessage($t('task.GatewayModal.823128-11'), 'warning')
    }
}
const handleSearch = (e) => {
    params.value = e
}

const handleClick = (record) => {
    const index = deviceSelected.findIndex(item => item.id === record.id)

    if (index !== -1) {
        deviceSelected.splice(index, 1)
        deviceRowKeys.value.splice(index, 1)
    } else {
        deviceSelected.push(record)
        deviceRowKeys.value.push(record.id)
    }
}

const onSelectNone = () => {
    deviceSelected.splice(0)
    deviceRowKeys.value = []
}

const selectAll = (selected, selectedRows, changeRows) => {
    changeRows.forEach(item => {
        handleClick(item)
    })
};


</script>

<style scoped>

</style>
