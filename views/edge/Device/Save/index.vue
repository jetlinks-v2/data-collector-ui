<template>
    <a-modal
        :maskClosable="false"
        width="650px"
        :visible="true"
        :title="!!data?.id ? '编辑' : '新增'"
        @ok="handleSave"
        @cancel="handleCancel"
        :confirmLoading="loading"
    >
        <div style="margin-top: 10px">
            <a-form :layout="'vertical'" ref="formRef" :model="modelRef">
                <a-row type="flex">
                    <a-col flex="180px">
                        <a-form-item name="photoUrl">
                            <pro-upload accept="image/jpeg,image/png" v-model="modelRef.photoUrl" :size="4"/>
                        </a-form-item>
                    </a-col>
                    <a-col flex="auto">
                        <a-form-item
                            name="id"
                            :rules="[
                                {
                                    pattern: /^[a-zA-Z0-9_\-]+$/,
                                    message: '请输入英文或者数字或者-或者_',
                                },
                                {
                                    max: 64,
                                    message: '最多输入64个字符',
                                },
                                {
                                    validator: vailId,
                                    trigger: 'blur',
                                },
                            ]"
                        >
                            <template #label>
                                <span>
                                    ID
                                    <a-tooltip
                                        title="若不填写，系统将自动生成唯一ID"
                                    >
                                        <AIcon
                                            type="QuestionCircleOutlined"
                                            style="margin-left: 2px"
                                        />
                                    </a-tooltip>
                                </span>
                            </template>
                            <a-input
                                v-model:value="modelRef.id"
                                placeholder="请输入ID"
                                :disabled="!!data?.id"
                            />
                        </a-form-item>
                        <a-form-item
                            label="名称"
                            name="name"
                            :rules="[
                                {
                                    required: true,
                                    message: '请输入名称',
                                },
                                {
                                    max: 64,
                                    message: '最多输入64个字符',
                                },
                            ]"
                        >
                            <a-input
                                v-model:value="modelRef.name"
                                placeholder="请输入名称"
                            />
                        </a-form-item>
                    </a-col>
                </a-row>
                <a-row>
                    <a-col :span="22">
                        <a-form-item
                            name="productId"
                            :rules="[
                                {
                                    required: true,
                                    message: '请选择所属产品',
                                },
                            ]"
                        >
                            <template #label>
                                <span
                                    >所属产品
                                    <a-tooltip title="只能选择“正常”状态的产品">
                                        <AIcon
                                            type="QuestionCircleOutlined"
                                            style="margin-left: 2px"
                                        />
                                    </a-tooltip>
                                </span>
                            </template>
                            <a-select
                                showSearch
                                v-model:value="modelRef.productId"
                                :disabled="!!data?.id"
                                placeholder="请选择所属产品"
                            >
                                <a-select-option
                                    :value="item.id"
                                    v-for="item in productList"
                                    :key="item.id"
                                    :label="item.name"
                                    >{{ item.name }}</a-select-option
                                >
                            </a-select>
                        </a-form-item>
                    </a-col>
                    <a-col :span="2" style="margin-top: 30px">
                        <j-permission-button
                            type="link"
                            :disabled="data.id"
                            @click="visible = true"
                            hasPermission="device/Product:add"
                        >
                            <AIcon type="PlusOutlined" />
                        </j-permission-button>
                    </a-col>
                </a-row>
                <a-form-item
                    label="说明"
                    name="describe"
                    :rules="[
                        {
                            max: 200,
                            message: '最多输入200个字符',
                        },
                    ]"
                >
                    <a-textarea
                        v-model:value="modelRef.describe"
                        placeholder="请输入说明"
                        showCount
                        :maxlength="200"
                    />
                </a-form-item>
            </a-form>
        </div>
    </a-modal>
    <SaveProduct
        v-model:visible="visible"
        v-model:productId="modelRef.productId"
        :channel="'official-edge-gateway'"
        @close="onClose"
        :deviceType="'gateway'"
        @save="onSave"
    />
</template>

<script lang="ts" setup>
// import { queryNoPagingPost } from '@/api/device/product';
import { isExists, update, queryNoPagingPost } from '../../../../api/others';
// import { getImage, onlyMessage } from '@/utils/comm';
import { onlyMessage } from '@jetlinks-web/utils'
import url from '../../../../assets/images/device-gateway.png'
import SaveProduct from '../../../../components/SaveProduct/SaveProduct.vue';

const emit = defineEmits(['close', 'save']);
const props = defineProps({
    data: {
        type: Object,
        default: undefined,
    },
});
const productList = ref<Record<string, any>[]>([]);
const loading = ref<boolean>(false);
const visible = ref<boolean>(false);

const formRef = ref();

const modelRef = reactive({
    productId: undefined,
    id: undefined,
    name: '',
    describe: '',
    photoUrl: url,
});

const vailId = async (_: Record<string, any>, value: string) => {
    if (!props?.data?.id && value) {
        const resp = await isExists(value);
        if (resp.status === 200 && resp.result) {
            return Promise.reject('该ID已存在');
        } else {
            return Promise.resolve();
        }
    } else {
        return Promise.resolve();
    }
};

watch(
    () => props.data,
    (newValue) => {
        queryNoPagingPost({
            paging: false,
            sorts: [{ name: 'createTime', order: 'desc' }],
            terms: [
                {
                    terms: [
                        {
                            termType: 'eq',
                            column: 'state',
                            value: 1,
                            type: 'and',
                        },
                        {
                            termType: 'eq',
                            column: 'accessProvider',
                            value: 'official-edge-gateway',
                        },
                    ],
                },
            ],
        }).then((resp) => {
            if (resp.status === 200) {
                productList.value = resp.result as Record<string, any>[];
            }
        });
        Object.assign(modelRef, newValue);
    },
    { immediate: true, deep: true },
);

const handleCancel = () => {
    emit('close');
    formRef.value.resetFields();
};

const onClose = () => {
    visible.value = false;
};

const onSave = (_data: any) => {
    productList.value.push(_data)
}

const handleSave = () => {
    formRef.value
        .validate()
        .then(async (_data: any) => {
            loading.value = true;
            const obj = { ..._data };
            if (!obj.id) {
                delete obj.id;
            }
            const resp = await update(obj).finally(() => {
                loading.value = false;
            });
            if (resp.status === 200) {
                onlyMessage('操作成功！');
                emit('save');
                formRef.value.resetFields();
            }
        })
        .catch((err: any) => {
            console.log('error', err);
        });
};
</script>