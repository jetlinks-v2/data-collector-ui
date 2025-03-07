<template>
    <a-modal
        :maskClosable="false"
        width="650px"
        :visible="true"
        :title="!!data?.id ? $t('Save.index.697851-0') : $t('Save.index.697851-1')"
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
                                    message: $t('Save.index.697851-2'),
                                },
                                {
                                    max: 64,
                                    message: $t('Save.index.697851-3'),
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
                                        :title="$t('Save.index.697851-4')"
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
                                :placeholder="$t('Save.index.697851-5')"
                                :disabled="!!data?.id"
                            />
                        </a-form-item>
                        <a-form-item
                            :label="$t('Save.index.697851-6')"
                            name="name"
                            :rules="[
                                {
                                    required: true,
                                    message: $t('Save.index.697851-7'),
                                },
                                {
                                    max: 64,
                                    message: $t('Save.index.697851-3'),
                                },
                            ]"
                        >
                            <a-input
                                v-model:value="modelRef.name"
                                :placeholder="$t('Save.index.697851-7')"
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
                                    message: $t('Save.index.697851-8'),
                                },
                            ]"
                        >
                            <template #label>
                                <span
                                    >{{ $t('Save.index.697851-9') }}
                                    <a-tooltip :title="$t('Save.index.697851-10')">
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
                                :placeholder="$t('Save.index.697851-8')"
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
                    :label="$t('Save.index.697851-11')"
                    name="describe"
                    :rules="[
                        {
                            max: 200,
                            message: $t('Save.index.697851-12'),
                        },
                    ]"
                >
                    <a-textarea
                        v-model:value="modelRef.describe"
                        :placeholder="$t('Save.index.697851-13')"
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
        :channels="provider"
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
import url from '../../../../assets/device-gateway.png'
import SaveProduct from '../../../../components/SaveProduct/SaveProduct.vue';
import {useI18n} from "vue-i18n";

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
const provider = ['agent-device-gateway', 'agent-media-device-gateway', 'official-edge-gateway']
const modelRef = reactive({
    productId: undefined,
    id: undefined,
    name: '',
    describe: '',
    photoUrl: url,
});
const { t: $t } = useI18n();
const vailId = async (_: Record<string, any>, value: string) => {
    if (!props?.data?.id && value) {
        const resp = await isExists(value);
        if (resp.status === 200 && resp.result) {
            return Promise.reject($t('Save.index.697851-14'));
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
                            termType: 'in',
                            column: 'accessProvider',
                            value: provider,
                            type: 'and',
                        },
                        {
                          "value": "gateway",
                          "termType": "eq",
                          "column": "deviceType"
                        }
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
                onlyMessage($t('Save.index.697851-15'));
                emit('save');
                formRef.value.resetFields();
            }
        })
        .catch((err: any) => {
            console.log('error', err);
        });
};
</script>
