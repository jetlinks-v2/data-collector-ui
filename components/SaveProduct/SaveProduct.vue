<template>
    <a-modal
        v-model:visible="_vis"
        title="快速添加"
        cancelText="取消"
        okText="确定"
        @ok="handleOk"
        @cancel="handleCancel"
        :confirmLoading="btnLoading"
        width="660px"
    >
        <a-form ref="formRef" :model="formData" layout="vertical">
            <a-form
                ref="pluginFormRef"
                :model="productData"
                layout="vertical"
                v-if="productTypes.length"
            >
                <a-form-item
                    name="id"
                    label="产品类型"
                    :rules="[{ required: true, message: '请选择产品类型' }]"
                >
                    <a-select
                        v-model:value="productData.id"
                        :options="productTypes"
                        @change="productTypeChange"
                        placeholder="请选择产品类型"
                    />
                </a-form-item>
            </a-form>
            <a-form-item
                label="产品名称"
                name="name"
                :rules="[
                    { required: true, message: '请输入产品名称' },
                    {
                        max: 64,
                        message: '最多输入64个字符',
                    },
                ]"
            >
                <a-input
                    v-model:value="formData.name"
                    placeholder="请输入名称"
                />
            </a-form-item>
            <template v-if="deviceType !== 'gateway'">
                <template v-for="(item, index) in extendFormItem" :key="index">
                    <a-form-item
                        :name="item.name"
                        :label="item.label"
                        :rules="[
                            {
                                required: item.required,
                                message: item.message,
                                trigger: 'change',
                            },
                            {
                                max: 64,
                                message: '最多输入64个字符',
                            },
                        ]"
                    >
                        <a-select
                            v-if="item.type === 'enum'"
                            v-model:value="formData[item.name[0]][item.name[1]]"
                            :options="item.options"
                            :placeholder="item.message"
                        />
                        <a-input-password
                            v-else-if="item.type === 'password'"
                            v-model:value="formData[item.name[0]][item.name[1]]"
                            :placeholder="item.message"
                        />
                        <a-input
                            v-else
                            v-model:value="formData[item.name[0]][item.name[1]]"
                            :placeholder="item.message"
                        />
                    </a-form-item>
                </template>
            </template>
            <a-form-item
                label="接入网关"
                name="accessId"
                :rules="{ required: true, message: '请选择接入网关' }"
            >
                <div class="gateway-box">
                    <a-empty
                        v-if="!gatewayList.length"
                        style="margin-top: 50px"
                    >
                        <template #description>
                            <template v-if="!isPermission"
                                >暂无数据, 请联系管理员</template
                            >
                            <template v-else>
                                暂无数据，请先
                                <a-button
                                    type="link"
                                    style="padding: 0"
                                    @click="handleAdd"
                                >
                                    添加{{
                                        providerType[props.channel]
                                    }}接入网关
                                </a-button>
                            </template>
                        </template>
                    </a-empty>
                    <div
                        class="gateway-item"
                        v-for="(item, index) in gatewayList"
                        :key="index"
                    >
                        <CardBox
                            @click="handleClick"
                            :active="_selectedRowKeys.includes(item.id)"
                            :value="item"
                            v-bind="item"
                            :status="item.state?.value"
                            :statusText="item.state?.text"
                            :statusNames="{
                                enabled: 'processing',
                                disabled: 'error',
                            }"
                        >
                            <template #img>
                                <slot name="img">
                                    <img
                                        :src="url"
                                    />
                                </slot>
                            </template>
                            <template #content>
                                <j-ellipsis
                                    style="
                                        cursor: pointer;
                                        font-size: 16px;
                                        font-weight: 700;
                                        color: #1d39c4;
                                        width: calc(100% - 100px);
                                    "
                                >
                                    {{ item.name }}
                                </j-ellipsis>
                                <j-ellipsis
                                    style="
                                        margin-top: 10px;
                                        color: #666;
                                        font-weight: 400;
                                        font-size: 12px;
                                    "
                                    >{{ item.description }}</j-ellipsis
                                >
                                <a-row v-if="props.channel === 'gb28181-2016'">
                                    <a-col :span="12">
                                        {{ item.channelInfo?.name }}
                                    </a-col>
                                    <a-col :span="12">
                                        {{ item.protocolDetail.name }}
                                    </a-col>
                                    <a-col :span="12">
                                        <p
                                            v-for="(i, idx) in item.channelInfo
                                                ?.addresses"
                                            :key="`${i.address}_address${idx}`"
                                        >
                                            <Ellipsis>
                                                <a-badge
                                                    :text="i.address"
                                                    :color="
                                                        i.health === -1
                                                            ? 'red'
                                                            : 'green'
                                                    "
                                                />
                                            </Ellipsis>
                                        </p>
                                    </a-col>
                                </a-row>
                                <a-row v-else>
                                    <a-col :span="24">
                                        <div class="subtitle">
                                            {{ item.protocolDetail.name }}
                                        </div>
                                        <p>
                                            {{
                                                item.protocolDetail.description
                                            }}
                                        </p>
                                    </a-col>
                                </a-row>
                            </template>
                        </CardBox>
                    </div>
                </div>
            </a-form-item>
        </a-form>
    </a-modal>
</template>

<script setup lang="ts">
import {DeviceApi,getAccessConfig,getProductsById,savePluginData} from '../../api/others';
// import { getImage, onlyMessage } from '@/utils/comm';
import { onlyMessage } from '@jetlinks-web/utils'
import url from '../../assets/images/device-access.png'
import { gatewayType } from './typings';
import { providerType } from './const';
import { useAuthStore } from '@/store/auth';
import { pick } from 'lodash-es';

const isPermission = useAuthStore().hasPermission(
    'link/AccessConfig:add',
);

type Emits = {
    (e: 'update:visible', data: boolean): void;
    (e: 'update:productId', data: string): void;
    (e: 'close'): void;
    (e: 'save', data: Record<string, any>): void;
    (e: 'update:password', data: string): void;
};
const emit = defineEmits<Emits>();

const props = defineProps({
    visible: { type: Boolean, default: false },
    productId: { type: String, default: '' },
    channel: { type: String, default: '' },
    deviceType: { type: String, default: 'device' },
});

const _vis = computed({
    get: () => props.visible,
    set: (val) => emit('update:visible', val),
});

/**
 * 获取接入网关
 */
const gatewayList = ref<gatewayType[]>([]);

//插件类型 插件产品映射
const productData = reactive({
    id: undefined,
    metadata: {}, // 物模型
});
//插件类型 插件产品选择项
const productTypes = ref([]);
const pluginFormRef = ref();

// 表单数据
const formRef = ref();
const formData = ref({
    accessId: '',
    accessName: '',
    accessProvider: '',
    configuration: {
        access_pwd: '',
        stream_mode: 'UDP',
    },
    deviceType: props.deviceType,
    messageProtocol: '',
    name: '',
    protocolName: '',
    transportProtocol: '',
    metadata: '',
});
const getGatewayList = async () => {
    const params = {
        pageSize: 100,
        sorts: [{ name: 'createTime', order: 'desc' }],
        terms: [{ column: 'provider', value: props.channel }],
    };
    const { result } = await DeviceApi.queryProvider(params);
    gatewayList.value = result.data;
};

/**
 * 点击接入网关, 获取对应配置
 * @param e
 */
const _selectedRowKeys = ref<string[]>([]);
const extendFormItem = ref<any[]>();
const handleClick = async (e: any) => {
    _selectedRowKeys.value = [e.id];
    formData.value.accessId = e.id;
    formData.value.accessName = e.name;
    formData.value.accessProvider = e.provider;
    formData.value.messageProtocol = e.protocolDetail.id;
    formData.value.protocolName = e.protocolDetail.name;
    formData.value.transportProtocol = e.transport;
    if (props.channel === 'media-plugin') {
        const res = await getProductsById(e.channelId);
        if (res.success) {
            productTypes.value = res.result?.map((item) => ({
                ...item,
                label: item.name,
                value: item.id,
            }));
        }
        const resp = await getAccessConfig('empty', e.id);
        if (resp.success) {
            const result = resp.result;
            extendFormItem.value = result?.[0]?.properties?.map(
                (item: any) => ({
                    name: ['configuration', item.property],
                    label: item.name,
                    type: item.type?.type,
                    value: item.type.expands?.defaultValue,
                    options: item.type.elements?.map((e: any) => ({
                        label: e.text,
                        value: e.value,
                    })),
                    required: !!item.type.expands?.required,
                    message:
                        item.type?.type === 'enum'
                            ? `请选择${item.name}`
                            : `请输入${item.name}`,
                }),
            );
        }
    } else {
        const res = await DeviceApi.getConfiguration(e.protocol, e.transport);
        if (res.success) {
            const result = res.result;
            if (
                e.protocol === 'onvif' &&
                !result.scopes.find((i) => {
                    return i === 'product';
                })
            ) {
                return '';
            }
            extendFormItem.value = result?.properties?.map((item: any) => ({
                name: ['configuration', item.property],
                label: item.name,
                type: item.type?.type,
                value: item.type.expands?.defaultValue,
                options: item.type.elements?.map((e: any) => ({
                    label: e.text,
                    value: e.value,
                })),
                required: !!item.type.expands?.required,
                message:
                    item.type?.type === 'enum'
                        ? `请选择${item.name}`
                        : `请输入${item.name}`,
            }));
        }
    }
};

const productTypeChange = (id: string, items: any) => {
    productData.metadata = items?.metadata
        ? pick(items.metadata, ['functions', 'properties', 'events', 'tags'])
        : {};
};
watch(
    () => _vis.value,
    (val) => {
        if (val) {
            getGatewayList();
        } else {
            _selectedRowKeys.value = [];
            extendFormItem.value = [];
            emit('close');
        }
    },
);

/**
 * 提交
 */
const btnLoading = ref(false);
const handleOk = async () => {
    if (pluginFormRef.value) {
        // 插件
        const pluginRef = await pluginFormRef.value.validate();
        if (!pluginRef) return;
    }
    formRef.value
        ?.validate()
        .then(async () => {
            btnLoading.value = true;
            if (
                productData.metadata &&
                Object.keys(productData.metadata).length
            ) {
                formData.value.metadata = JSON.stringify(productData.metadata);
            }
            const res = await DeviceApi.saveProduct(formData.value);
            if (res.success) {
                emit('update:productId', res.result.id);
                emit('update:password', res.result.configuration.access_pwd);
                if (props.channel === 'media-plugin' && productData.id) {
                    await savePluginData(
                        'product',
                        formData.value.accessId,
                        res.result.id,
                        productData.id,
                    ).catch(() => ({}));
                }
                const deployResp = await DeviceApi.deployProductById(
                    res.result.id,
                );
                if (deployResp.success) {
                    emit('save', { ...res.result });
                    onlyMessage('操作成功');
                    handleCancel();
                }
            }
            btnLoading.value = false;
        })
        .catch((err: any) => {
            console.log('err: ', err);
        });
};

const handleCancel = () => {
    _vis.value = false;
    formRef.value.resetFields();
};

/**
 * 添加接入网关
 */
const handleAdd = () => {
    const tab: any = window.open(
        `${origin}/#/iot/link/accessConfig/detail/:id?save=true&view=false&type=${props.channel}`,
    );
    tab.onTabSaveSuccess = async (value: any) => {
        await getGatewayList();
        handleClick(gatewayList.value?.[0]);
    };
};
</script>

<style lang="less" scoped>
.gateway-box {
    max-height: 450px;
    overflow-y: auto;
    text-align: center;
    .gateway-item {
        padding: 16px;
        text-align: left;
        .subtitle {
            overflow: hidden;
            white-space: nowrap;
            text-overflow: ellipsis;
        }
        .subtitle {
            margin-top: 10px;
            color: #666;
            font-weight: 400;
            font-size: 12px;
        }
    }
}
</style>
