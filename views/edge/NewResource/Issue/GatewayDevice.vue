<template>
    <pro-search
        :columns="columns"
        target="edge-device"
        type="simple"
        @search="handleSearch"
        style="padding: 0"
    />
    <JProTable
        ref="edgeDeviceRef"
        :columns="columns"
        :request="query"
        :defaultParams="defaultParams"
        :params="params"
        modeValue="CARD"
        :gridColumn="2"
        :gridColumns="[2]"
        :pagination="{
            pageSizeOptions: ['4', '12', '24', '48'],
            showSizeChanger: true,
        }"
        :rowSelection="{
            selectedRowKeys: _selectedRowKeys,
            onSelect: onSelectChange,
            onSelectAll: selectAll,
            onSelectNone: selectNone,
        }"
        style="padding: 0"
    >
        <template #card="slotProps">
            <CardBox
                :value="slotProps"
                :status="slotProps.state?.value"
                :statusText="slotProps.state?.text"
                :active="_selectedRowKeys.includes(slotProps.id)"
                @click="handleClick(slotProps)"
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
                        <a-col :span="12">
                            <div class="card-item-content-text">
                                {{ $t('Issue.GatewayDevice.556619-0') }}
                            </div>
                            <div>{{ slotProps.deviceType?.text }}</div>
                        </a-col>
                        <a-col :span="12">
                            <div class="card-item-content-text">
                                {{ $t('Issue.GatewayDevice.556619-1') }}
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
            <j-badgeStatus
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
</template>

<script setup lang="ts">
import {queryNoPagingPost, query, queryTree} from "../../../../api/others";
import DeviceGatewayImg from '../../../../assets/device-gateway.png'
import dayjs from "dayjs";
import {PropType} from "vue";
import { useI18n } from 'vue-i18n';

const { t: $t } = useI18n();

const emit = defineEmits(['update:value']);
const props = defineProps({
    value: {
        type: Array as PropType<string[]>,
        default: () => ([]),
    }
})
const provider = ['agent-device-gateway', 'agent-media-device-gateway', 'official-edge-gateway']
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
        title: $t('Issue.GatewayDevice.556619-2'),
        dataIndex: 'name',
        key: 'name',
        search: {
            type: 'string',
            first: true,
        },
        ellipsis: true,
    },
    {
        title: $t('Issue.GatewayDevice.556619-1'),
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
        title: $t('Issue.GatewayDevice.556619-3'),
        dataIndex: 'registryTime',
        key: 'registryTime',
        scopedSlots: true,
        search: {
            type: 'date',
        },
    },
    {
        title: $t('Issue.GatewayDevice.556619-4'),
        dataIndex: 'state',
        key: 'state',
        scopedSlots: true,
        search: {
            type: 'select',
            options: [
                {label: $t('Issue.GatewayDevice.556619-5'), value: 'notActive'},
                {label: $t('Issue.GatewayDevice.556619-6'), value: 'offline'},
                {label: $t('Issue.GatewayDevice.556619-7'), value: 'online'},
            ],
        },
    },
    {
        key: 'productId$product-info',
        dataIndex: 'productId$product-info',
        title: $t('Issue.GatewayDevice.556619-8'),
        hideInTable: true,
        search: {
            type: 'treeSelect',
            options: () =>
                new Promise((resolve) => {
                    queryTree({paging: false}).then((resp: any) => {
                        resolve(transformData(resp.result));
                    });
                }),
        },
    },
    {
        title: $t('Issue.GatewayDevice.556619-12'),
        dataIndex: 'describe',
        key: 'describe',
        ellipsis: true,
        search: {
            type: 'string',
        },
    },
];

const defaultParams = {
    pageSize: 4,
    sorts: [{name: 'createTime', order: 'desc'}],
    terms: [
        {
            column: 'productId$product-info',
            value: 'accessProvider in (agent-device-gateway,agent-media-device-gateway,official-edge-gateway)',
        },
    ],
};

const _selectedRowKeys = ref<string[]>([]);
const _selectedDataMap = new Map()
const params = ref<Record<string, any>>({});

const onChange = () => {
  const arr = _selectedRowKeys.value.map(i => {
    return _selectedDataMap.get(i)
  })
  console.log(arr, 'arr')
  emit('update:value', arr)
}
const onSelectChange = (item: any, state: boolean) => {
    if (state) {
        _selectedRowKeys.value.push(item.id);
      _selectedDataMap.set(item.id, item)
    } else {
        _selectedRowKeys.value.splice(_selectedRowKeys.value.findIndex(i => i === item.id), 1);
    }
    onChange()
};

const selectAll = (selected: Boolean, selectedRows: any, changeRows: any) => {
    if (selected) {
        changeRows.map((i: any) => {
            if (!_selectedRowKeys.value.includes(i.id)) {
                _selectedRowKeys.value.push(i.id);
              _selectedDataMap.set(i.id, i)
            }
        });
    } else {
        const arr = changeRows.map((item: any) => item.id);
        const _ids: string[] = [];
        _selectedRowKeys.value.map((i: any) => {
            if (!arr.includes(i)) {
                _ids.push(i);
              _selectedDataMap.set(i.id, i)
            }
        });
        _selectedRowKeys.value = _ids;
    }
  onChange()
};

const selectNone = () => {
    _selectedRowKeys.value = []
    _selectedDataMap.clear()
    onChange()
}
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

const handleSearch = (e: any) => {
    params.value = e;
}
const handleClick = (data: any) => {
    const _index = _selectedRowKeys.value.findIndex(i => i === data.id)
    if (_index !== -1) {
        _selectedRowKeys.value.splice(_index, 1);
    } else {
        _selectedRowKeys.value.push(data.id);
        _selectedDataMap.set(data.id, data)
    }
  onChange()
};

</script>

<style scoped lang="less">

</style>
