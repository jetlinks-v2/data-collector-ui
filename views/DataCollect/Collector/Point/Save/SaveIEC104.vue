<template>
    <a-modal :title="data.id ? $t('Save.SaveIEC104.4001414-0') : $t('Save.SaveIEC104.4001414-1')" visible @cancel="handleCancel">
        <a-form :model="formData" layout="vertical" ref="formRef">
            <a-form-item
                :label="$t('Save.SaveIEC104.4001414-2')"
                name="name"
                :rules="rules.name"
            >
                <a-input
                    :placeholder="$t('Save.SaveIEC104.4001414-3')"
                    v-model:value="formData.name"
                    :maxlength="64"
                />
            </a-form-item>
            <a-form-item
                :label="$t('Save.SaveIEC104.4001414-4')"
                :name="['configuration', 'typeIdentifierName']"
                :rules="rules.configuration.typeIdentifierName"
            >
                <a-select
                    v-model:value="formData.configuration.typeIdentifierName"
                    :options="dataTypeList"
                    :placeholder="$t('Save.SaveIEC104.4001414-5')"
                    allowClear
                    show-search
                />
            </a-form-item>
            <a-form-item
                :label="$t('Save.SaveIEC104.4001414-6')"
                :name="['configuration', 'pointAddress']"
                :rules="rules.configuration.pointAddress"
            >
                <a-input
                    v-model:value="formData.configuration.pointAddress"
                    :placeholder="$t('Save.SaveIEC104.4001414-7')"
                    :min="1"
                    :max="65535"
                    :precision="0"
                />
            </a-form-item>
            <a-form-item
                :label="$t('Save.SaveIEC104.4001414-8')"
                name="accessModes"
                :rules="rules.accessModes"
            >
                <j-card-select
                    multiple
                    :showImage="false"
                    v-model:value="formData.accessModes"
                    :options="[
                        { label: $t('Save.SaveIEC104.4001414-9'), value: 'read' },
                        { label: $t('Save.SaveIEC104.4001414-10'), value: 'write' },
                        { label: $t('Save.SaveIEC104.4001414-11'), value: 'subscribe' },
                    ]"
                    :column="3"
                />
            </a-form-item>
            <a-form-item :name="['configuration', 'terms']" :rules="[{
                validator: Area,
                trigger: 'change',
            }]">
                <template #label>
                    <a-space>
                        <span>{{ $t('Save.SaveIEC104.4001414-12') }}</span><span class="explain">{{ $t('Save.SaveIEC104.4001414-13') }}</span>
                    </a-space>
                </template>
                <DeathArea v-model:value="formData.configuration.terms" />
            </a-form-item>
            <a-form-item :label="$t('Save.SaveIEC104.4001414-14')" :name="['configuration', 'interval']" :rules="rules.configuration.interval">
                <p>
                    {{ $t('Save.SaveIEC104.4001414-15') }}<span
                        style="
                            margin-left: 5px;
                            color: #9d9ea1;
                            font-size: 12px;
                        "
                        >{{ $t('Save.SaveIEC104.4001414-16') }}</span
                    >
                </p>
                <a-input-number
                    style="width: 100%"
                    :placeholder="$t('Save.SaveIEC104.4001414-17')"
                    v-model:value="formData.configuration.interval"
                    addon-after="ms"
                    :max="2147483648"
                    :min="0"
                />
            </a-form-item>
            <a-form-item name="features">
                <a-checkbox-group v-model:value="formData.features">
                    <a-checkbox value="changedOnly"
                        >{{ $t('Save.SaveIEC104.4001414-18') }}</a-checkbox
                    >
                </a-checkbox-group>
            </a-form-item>
            <a-form-item :label="$t('Save.SaveIEC104.4001414-19')" name="description">
                <a-textarea
                    :placeholder="$t('Save.SaveIEC104.4001414-20')"
                    v-model:value="formData.description"
                    :maxlength="200"
                    :rows="3"
                    showCount
                />
            </a-form-item>
        </a-form>
        <template #footer>
            <a-button @click="handleCancel">{{ $t('Save.SaveIEC104.4001414-21') }}</a-button>
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
                {{ $t('Save.SaveIEC104.4001414-22') }}
            </j-permission-button>
        </template>
    </a-modal>
</template>
<script setup lang="ts">
import {
    savePoint,
    updatePoint,
    queryIEC104
} from '../../../../../api/data-collect/collector';
import { randomString } from '@jetlinks-web/utils';
import DeathArea from './DeathArea.vue';
import { useI18n } from 'vue-i18n';

const { t: $t } = useI18n();
const props = defineProps({
    data: {
        type: Object,
        default: () => {},
    },
});

const emit = defineEmits(['change']);

const loading = ref(false);
const formRef = ref()
const dataTypeList = ref();
const formData = ref({
    name: props.data.name,
    configuration: props.data.configuration || {
        typeIdentifierName: undefined,
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
            message: $t('Save.SaveIEC104.4001414-23'),
            trigger: 'blur',
        },
    ],
    configuration: {
        typeIdentifierName: [
            {
                required: true,
                message: $t('Save.SaveIEC104.4001414-24'),
                trigger: 'change',
            },
        ],
        pointAddress: [
            {
                required: true,
                message: $t('Save.SaveIEC104.4001414-7'),
                trigger: 'blur',
            },
        ],
        interval: [
            {
                required: true,
                message: $t('Save.SaveIEC104.4001414-17'),
                trigger: 'change',
            },
        ],
    },
    accessModes: [
        {
            required: true,
            message: $t('Save.SaveIEC104.4001414-25'),
            trigger: 'change',
        },
    ],
};

const Area = (_: any, value: any): Promise<any> =>
    new Promise(async (resolve, reject) => {
        if (!value) {
            return resolve('')
        }
        if (value?.length === 0) {
            return resolve('')
        } else if (value?.length === 1) {
            return value[0].value && value[0].termType ? resolve('') : reject($t('Save.SaveIEC104.4001414-26'));
        } else {
            if (value?.[0].column === 'currentValue') {
                // value.forEach((item:any) => {
                //     if(item.termType && item.value){
                //        return resolve('')
                //     }else{
                //         return reject(this.$t('Save.SaveIEC104.4001414-26'))
                //     }
                // });
                const pass = value.every((item: any) => item.termType && item.value)
                return pass ? resolve('') : reject($t('Save.SaveIEC104.4001414-26'))
            } else {
                value.forEach((item: any) => {
                    if (item.column === `this['currentValue'] - this['lastValue']*init/100`) {
                        return reject($t('Save.SaveIEC104.4001414-26'))
                    } else {
                        return resolve('')
                    }
                });
            }

        }
    });

const handleOk = async () => {
    const res: any = await formRef.value?.validate();

    const params = {
        ...res,
        configuration: {
            ...res.configuration,
        },
        inheritBreaker: true,
        pointKey: props.data.pointKey || randomString(9),
        provider: props.data.provider,
        collectorId: props.data.collectorId,
        accessModes: res?.accessModes.filter((item: any) => item)
    }
    loading.value = true;
    const response = !props.data.id
        ? await savePoint(params).catch(() => { })
        : await updatePoint(props.data.id, { ...props.data, ...params }).catch(() => { });
    emit('change', response?.status === 200);
    loading.value = false;
};

const handleCancel = () => {
    emit('change', false);
};

const queryDataType = async () => {
    const res = await queryIEC104();
    if (res.success) {
        dataTypeList.value = res.result.map((i:any)=>{
            return {
                label: i.name,
                value: i.key
            }
        });
    }
};

onMounted(() => {
    queryDataType();
    formData.value.features = props.data.features?.map((item: any) => item.value)
    if (props.data.accessModes?.length !== 0) {
        formData.value.accessModes = props.data.accessModes?.map((item: any) => item.value)
    }
})
</script>
