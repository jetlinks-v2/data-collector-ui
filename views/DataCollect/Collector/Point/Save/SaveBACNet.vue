<template>
    <a-modal :title="data.id ? '编辑' : '新增'" visible @cancel="handleCancel">
        <a-form :model="formData" layout="vertical" ref="formRef">
            <a-form-item label="点位名称" name="name" :rules="rules.name">
                <a-input
                    placeholder="请输入点位名称"
                    v-model:value="formData.name"
                    :maxlength="64"
                />
            </a-form-item>
            <a-form-item label="对象ID" :name="['configuration', 'ObjectId']">
                <a-card>
                    <a-form-item label="对象类型">
                        <a-input
                            v-model:value="formData.configuration.objectId.type"
                            disabled
                        ></a-input>
                    </a-form-item>
                    <a-form-item label="对象实例号">
                        <a-input
                            v-model:value="
                                formData.configuration.objectId.instanceNumber
                            "
                            disabled
                        ></a-input>
                    </a-form-item>
                </a-card>
            </a-form-item>
            <a-form-item
                label="属性ID"
                :name="['configuration', 'propertyId']"
                :rules="rules.configuration.pointAddress"
            >
                <a-input
                    v-model:value="formData.configuration.propertyId"
                    disabled
                ></a-input>
            </a-form-item>
            <a-form-item label="值类型" :name="['configuration', 'valueType']">
                <a-select v-model:value="formData.configuration.valueType">
                    <a-select-option
                        v-for="item in bacnetValueType"
                        :key="item"
                        :value="item"
                        >{{ item }}</a-select-option
                    >
                </a-select>
            </a-form-item>
            <a-form-item
                label="访问类型"
                name="accessModes"
                :rules="rules.accessModes"
            >
                <j-card-select
                    multiple
                    :showImage="false"
                    v-model:value="formData.accessModes"
                    :options="[
                        { label: '读', value: 'read' },
                        { label: '写', value: 'write' },
                        { label: '订阅', value: 'subscribe' },
                    ]"
                    :column="3"
                />
            </a-form-item>
            <a-form-item
                :name="['configuration', 'terms']"
                :rules="[
                    {
                        validator: Area,
                        trigger: 'change',
                    },
                ]"
            >
                <template #label>
                    <a-space>
                        <span>点位死区</span
                        ><span class="explain"
                            >点位死区范围内的异常数据将被过滤（请勿配置非数值类型）</span
                        >
                    </a-space>
                </template>
                <DeathArea v-model:value="formData.configuration.terms" />
            </a-form-item>
            <a-form-item
                label="轮询任务"
                :name="['configuration', 'interval']"
                :rules="rules.configuration.interval"
            >
                <p>
                    采集频率<span
                        style="
                            margin-left: 5px;
                            color: #9d9ea1;
                            font-size: 12px;
                        "
                        >采集频率为0时不执行轮询任务</span
                    >
                </p>
                <a-input-number
                    style="width: 100%"
                    placeholder="请输入采集频率"
                    v-model:value="formData.configuration.interval"
                    addon-after="ms"
                    :max="2147483648"
                    :min="0"
                />
            </a-form-item>
            <a-form-item name="features">
                <a-checkbox-group v-model:value="formData.features">
                    <a-checkbox value="changedOnly"
                        >只推送变化的数据</a-checkbox
                    >
                </a-checkbox-group>
            </a-form-item>
            <a-form-item label="说明" name="description">
                <a-textarea
                    placeholder="请输入说明"
                    v-model:value="formData.description"
                    :maxlength="200"
                    :rows="3"
                    showCount
                />
            </a-form-item>
        </a-form>
        <template #footer>
            <a-button @click="handleCancel">取消</a-button>
            <j-permission-button
                key="submit"
                type="primary"
                :loading="loading"
                @click="handleOk"
                style="margin-left: 8px"
                :hasPermission="`DataCollect/Collector:${
                    data.id ? 'update' : 'add'
                }`"
            >
                确认
            </j-permission-button>
        </template>
    </a-modal>
</template>
<script setup lang="ts">
import {
    savePoint,
    updatePoint,
    getBacnetValueType,
} from '../../../../../api/data-collect/collector';
import { randomString } from '@jetlinks-web/utils';
import DeathArea from './DeathArea.vue';
const props = defineProps({
    data: {
        type: Object,
        default: () => {},
    },
});

const emit = defineEmits(['change']);

const loading = ref(false);
const formRef = ref();
const formData = ref({
    name: props.data.name,
    configuration: props.data.configuration || {
        valueType: undefined,
        pointAddress: '',
        interval: 3000,
    },
    accessModes: [],
    features: [],
    description: props.data.description || '',
});

const rules = {
    name: [
        {
            required: true,
            message: '请输入名称',
            trigger: 'blur',
        },
    ],
    configuration: {
        typeIdentifierName: [
            {
                required: true,
                message: '请输入类型标识',
                trigger: 'change',
            },
        ],
        pointAddress: [
            {
                required: true,
                message: '请输入地址',
                trigger: 'blur',
            },
        ],
        interval: [
            {
                required: true,
                message: '请输入采集频率',
                trigger: 'change',
            },
        ],
    },
    accessModes: [
        {
            required: true,
            message: '请选择访问类型',
            trigger: 'change',
        },
    ],
};

const Area = (_: any, value: any): Promise<any> =>
    new Promise(async (resolve, reject) => {
        if (!value) {
            return resolve('');
        }
        if (value?.length === 0) {
            return resolve('');
        } else if (value?.length === 1) {
            return value[0].value && value[0].termType
                ? resolve('')
                : reject('请配置点位死区');
        } else {
            if (value?.[0].column === 'currentValue') {
                // value.forEach((item:any) => {
                //     if(item.termType && item.value){
                //        return resolve('')
                //     }else{
                //         return reject('请配置点位死区')
                //     }
                // });
                const pass = value.every(
                    (item: any) => item.termType && item.value,
                );
                return pass ? resolve('') : reject('请配置点位死区');
            } else {
                const validate = value.find((item: any) => {
                    item.column ===
                        `this['currentValue'] - this['lastValue']*init/100`;
                });
                return validate ? reject('请配置点位死区') : resolve('');
            }
        }
    });
const bacnetValueType = ref<string[]>([]);

const getIdAndType = async () => {
    //   const res = await getBacnetPropertyId()
    //   if(res.success) {
    //     bacnetPropertyId.value = res.result
    //   }
    const resp: any = await getBacnetValueType();
    if (resp.success) {
        bacnetValueType.value = resp.result;
    }
};

getIdAndType();
const handleOk = async () => {
    const res: any = await formRef.value?.validate();

    const params = {
        ...res,
        configuration: {
            ...res.configuration,
            objectId: props.data.configuration?.objectId,
        },
        inheritBreaker: true,
        pointKey: props.data.pointKey || randomString(9),
        provider: props.data.provider,
        collectorId: props.data.collectorId,
        accessModes: res?.accessModes.filter((item: any) => item),
    };
    loading.value = true;
    const response = !props.data.id
        ? await savePoint(params).catch(() => {})
        : await updatePoint(props.data.id, { ...props.data, ...params }).catch(
              () => {},
          );
    emit('change', response?.status === 200);
    loading.value = false;
};

const handleCancel = () => {
    emit('change', false);
};

onMounted(() => {
    formData.value.features = props.data.features?.map(
        (item: any) => item.value,
    );
    if (props.data.accessModes?.length !== 0) {
        formData.value.accessModes = props.data.accessModes?.map(
            (item: any) => item.value,
        );
    }
});
</script>
