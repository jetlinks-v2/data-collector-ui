<template>
    <div class="device-select-warp">
        <pro-search
            :columns="columns"
            type="simple"
            :style="{ padding: 0, marginBottom: 0 }"
            @search="handleSearch"
        />
        <FullPage>
            <JProTable
                ref="edgeDeviceRef"
                style="margin-top: 20px"
                :columns="columns"
                :request="query"
                :params="params"
                modeValue="CARD"
                :defaultParams="defaultParams"
                :gridColumn="3"
                :gridColumns="[2, 3]"
                :scroll="{ y: 300 }"
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
                        @click="handleClick"
                        :active="deviceRowKeys.includes(slotProps.id)"
                        :status="slotProps.state?.value"
                        :statusText="slotProps.state?.text"
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
                                slotProps?.photoUrl ||
                                DeviceCardImg
                            "
                            />
                        </template>
                        <template #content>
                            <j-ellipsis
                                style="
                                width: calc(100% - 100px);
                                margin-bottom: 18px;
                            "
                            >
                            <span style="font-size: 16px; font-weight: 600">
                                {{ slotProps.name }}
                            </span>
                            </j-ellipsis>
                            <a-row>
                                <a-col :span="24">
                                    <div class="card-item-content-text">
                                        {{ $t('device.device.512194-0') }}
                                    </div>
                                    <j-ellipsis style="width: 100%">
                                        {{ slotProps.productName }}
                                    </j-ellipsis>
                                </a-col>
                            </a-row>
                        </template>
                    </CardBox>
                </template>
                <template #registryTime="slotProps">
                    {{
                        slotProps.registryTime ?dayjs(slotProps.registryTime).format('YYYY-MM-DD hh:mm:ss'):'--'
                    }}
                </template>
                <template #describe="scopedSlots">
                    <j-ellipsis>{{
                            scopedSlots.describe || '--'
                        }}</j-ellipsis></template
                >
                <template #state="slotProps">
                    {{ slotProps.state.text }}
                </template>
            </JProTable>

        </FullPage>
    </div>
</template>

<script setup name="BatchDeviceSelect">
import { query, queryNoPagingPost, queryTree } from '../../../../api/others';
import { getContext } from '../util';
import { omit } from 'lodash-es';
import dayjs from 'dayjs';
import DeviceCardImg from '../../../../assets/device-card.png';
import { useI18n } from 'vue-i18n';

const { t: $t } = useI18n();

const params = ref();
const deviceRowKeys = ref([]);
const deviceSelected = ref([]);
const context = getContext();
const transformData = (arr) => {
    if (Array.isArray(arr) && arr.length) {
        return (arr || []).map((item) => {
            return {
                ...item,
                id: item.id,
                children: transformData(item.children),
            };
        });
    } else {
        return [];
    }
};
const provider = ['agent-device-gateway', 'agent-media-device-gateway', 'official-edge-gateway']
const defaultParams = {
    sorts: [{ name: 'createTime', order: 'desc' }],
    terms: [
        {
            column: 'productId$product-info',
            value: 'accessProvider in (agent-device-gateway,agent-media-device-gateway,official-edge-gateway)',
        },
    ],
};

const columns = [
    {
        title: 'ID',
        dataIndex: 'id',
        key: 'id',
        search: {
            type: 'string',
            // defaultTermType: 'eq',
        },
        ellipsis: true,
    },
    {
        title: $t('device.device.512194-1'),
        dataIndex: 'name',
        key: 'name',
        search: {
            type: 'string',
            first: true,
        },
        ellipsis: true,
    },
    {
        title: $t('device.device.512194-0'),
        dataIndex: 'productName',
        key: 'productName',
        search: {
            type: 'select',
            rename: 'productId',
            options: () =>
                new Promise((resolve) => {
                    queryNoPagingPost({ paging: false, terms: [
                        {
                            termType: 'in',
                            column: 'accessProvider',
                            value: provider,
                        },
                    ] }).then((resp) => {
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
        title: $t('device.device.512194-2'),
        dataIndex: 'state',
        key: 'state',
        scopedSlots: true,
        search: {
            type: 'select',
            options: [
                { label: $t('device.device.512194-3'), value: 'notActive' },
                { label: $t('device.device.512194-4'), value: 'offline' },
                { label: $t('device.device.512194-5'), value: 'online' },
            ],
        },
    },
    {
        title: $t('device.device.512194-6'),
        dataIndex: 'registryTime',
        key: 'registryTime',
        scopedSlots: true,
        search: {
            type: 'date',
        },
    },
    {
        key: 'productId$product-info',
        dataIndex: 'productId$product-info',
        title: $t('device.device.512194-7'),
        hideInTable: true,
        search: {
            type: 'treeSelect',
            options: () =>
                new Promise((resolve) => {
                    queryTree({ paging: false }).then((resp) => {
                        resolve(transformData(resp.result));
                    });
                }),
        },
    },
    {
        title: $t('device.device.512194-8'),
        dataIndex: 'describe',
        key: 'describe',
        ellipsis: true,
        scopedSlots: true,
        search: {
            type: 'string',
        },
    },
];

const handleSearch = (e) => {
    if (e.terms?.[0]?.terms?.[0]?.column === 'productId$product-info') {
        switch (e.terms?.[0]?.terms?.[0]?.termType) {
            case 'not':
                e.terms[0].terms[0].options = [e.terms[0].terms[0].termType];
                e.terms[0].terms[0].value =
                    'classifiedId is ' + e.terms[0].terms[0].value;
                break;
            case 'eq':
                e.terms[0].terms[0].value =
                    `classifiedId is ${e.terms[0].terms[0].value}`
                break;
            case 'in':
                const newValue = e.terms[0].terms[0].value.join(', ')
                e.terms[0].terms[0].value =
                    `classifiedId in (${newValue})`
                break;
            case 'nin':
                const _value = e.terms[0].terms[0].value.join(', ')
                e.terms[0].terms[0].value =
                    `classifiedId nin (${_value})`
                break;
            default:
               return
        }
        e.terms[0].terms[0] = omit(e.terms[0].terms[0], ['termType']);
    }
    params.value = e;
};

const changeContextSelected = () => {
    context.addGateWay(
        deviceSelected.value.map((item) => ({
            value: item.id,
            label: item.name,
            ...item,
        })),
    );
};
const handleClick = (record) => {
    const index = deviceSelected.value.findIndex(
        (item) => item.id === record.id,
    );
    if (index !== -1) {
        deviceSelected.value.splice(index, 1);
        deviceRowKeys.value.splice(index, 1);
    } else {
        deviceSelected.value.push(record);
        deviceRowKeys.value.push(record.id);
    }
    changeContextSelected();
};

const selectAll = (selected, record, changeRows) => {
    const selectedMap = new Map();
    deviceSelected.value.forEach((item) => {
        selectedMap.set(item.id, item);
    });
    if (selected) {
        changeRows.forEach((i) => {
            if (!selectedMap.has(i.id)) {
                selectedMap.set(i.id, i);
            }
        });
    } else {
        changeRows.forEach((i) => {
            if (selectedMap.has(i.id)) {
                selectedMap.delete(i.id);
            }
        });
    }
    deviceSelected.value = [...selectedMap.values()];
    deviceRowKeys.value = [...selectedMap.keys()];
    changeContextSelected();
};

const onSelectNone = () => {
    deviceRowKeys.value = [];
    deviceSelected.value = [];
    context.addGateWay([]);
};
</script>

<style scoped lang="less">
.device-select-warp {
    :deep(.jtable-body-spin) {
        padding: 0 0 16px 0 !important;
    }
    :deep(.JSearch-warp) {
        padding: 0 !important;
    }
}
</style>
