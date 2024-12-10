<template >
    <a-modal
        :title="data.id ? $t('Save.SaveModBus.4001413-0') : $t('Save.SaveModBus.4001413-1')"
        :visible="true"
        width="700px"
        @cancel="handleCancel"
    >
        <a-form
            class="form"
            layout="vertical"
            :model="formData"
            name="basic"
            autocomplete="off"
            :rules="ModBusRules"
            ref="formRef"
        >
            <a-form-item :label="$t('Save.SaveModBus.4001413-2')" name="name">
                <a-input
                    :placeholder="$t('Save.SaveModBus.4001413-3')"
                    v-model:value="formData.name"
                />
            </a-form-item>
            <a-form-item
                :label="$t('Save.SaveModBus.4001413-4')"
                :name="['configuration', 'function']"
                :rules="ModBusRules.function"
            >
                <a-select
                    style="width: 100%"
                    v-model:value="formData.configuration.function"
                    :options="[
                        { label: $t('Save.SaveModBus.4001413-5'), value: 'Coils' },
                        { label: $t('Save.SaveModBus.4001413-6'), value: 'DiscreteInputs' },
                        { label: $t('Save.SaveModBus.4001413-7'), value: 'HoldingRegisters' },
                        { label: $t('Save.SaveModBus.4001413-8'), value: 'InputRegisters' },
                    ]"
                    :placeholder="$t('Save.SaveModBus.4001413-9')"
                    allowClear
                    show-search
                    :filter-option="filterOption"
                    @change="changeFunction"
                />
            </a-form-item>
            <a-form-item
                :label="$t('Save.SaveModBus.4001413-10')"
                :name="['pointKey']"
                validateFirst
                :rules="[
                    ...ModBusRules.pointKey,
                    {
                        validator: checkPointKey,
                        trigger: 'blur',
                    },
                ]"
            >
                <a-input-number
                    style="width: 100%"
                    :placeholder="$t('Save.SaveModBus.4001413-11')"
                    v-model:value="formData.pointKey"
                    :min="0"
                    :max="999999"
                    :precision="0"
                />
            </a-form-item>
            <p style="color: #616161" v-if="formData.configuration.function">
                {{ $t('Save.SaveModBus.4001413-12') }}
                {{
                    InitAddress[formData.configuration.function] +
                        Number(formData.pointKey) || 0
                }}
            </p>
            <a-form-item
                :label="$t('Save.SaveModBus.4001413-13')"
                :name="['configuration', 'parameter', 'quantity']"
                :rules="ModBusRules.quantity"
            >
                <a-input-number
                    style="width: 100%"
                    :addon-after="$t('Save.SaveModBus.4001413-14')"
                    v-model:value="formData.configuration.parameter.quantity"
                    :min="1"
                    :max="255"
                    :precision="0"
                    @blur="changeQuantity"
                />
            </a-form-item>

            <a-form-item
                v-if="
                    ['HoldingRegisters', 'InputRegisters'].includes(
                        formData.configuration.function,
                    )
                "
                :label="$t('Save.SaveModBus.4001413-15')"
                :name="['configuration', 'codec', 'provider']"
                :rules="[
                    ...ModBusRules.provider,
                    {
                        validator: checkProvider,
                        trigger: 'change',
                    },
                ]"
            >
                <a-select
                    style="width: 100%"
                    v-model:value="formData.configuration.codec.provider"
                    :options="providerList"
                    :placeholder="$t('Save.SaveModBus.4001413-16')"
                    allowClear
                    show-search
                    :filter-option="filterOption"
                />
            </a-form-item>
            <a-form-item
                :label="$t('Save.SaveModBus.4001413-17')"
                :name="[
                    'configuration',
                    'codec',
                    'configuration',
                    'scaleFactor',
                ]"
                :rules="ModBusRules.scaleFactor"
            >
                <a-input-number
                    style="width: 100%"
                    :placeholder="$t('Save.SaveModBus.4001413-18')"
                    v-model:value="
                        formData.configuration.codec.configuration.scaleFactor
                    "
                />
            </a-form-item>
            <a-form-item
                :label="$t('Save.SaveModBus.4001413-19')"
                :name="['configuration', 'codec', 'configuration', 'scale']"
            >
                <a-input-number
                    style="width: 100%"
                    :placeholder="$t('Save.SaveModBus.4001413-20')"
                    :min="0"
                    :max="65535"
                    :precision="0"
                    v-model:value="
                        formData.configuration.codec.configuration.scale
                    "
                />
            </a-form-item>
            <a-form-item
                v-if="formData.configuration.function"
                :label="$t('Save.SaveModBus.4001413-21')"
                name="accessModes"
            >
                <j-card-select
                    multiple
                    :showImage="false"
                    v-model:value="formData.accessModes"
                    :options="
                        formData.configuration.function === 'InputRegisters' ||
                        formData.configuration.function === 'DiscreteInputs'
                            ? [{ label: $t('Save.SaveModBus.4001413-22'), value: 'read' }]
                            : [
                                  { label: $t('Save.SaveModBus.4001413-22'), value: 'read' },
                                  { label: $t('Save.SaveModBus.4001413-23'), value: 'write' },
                              ]
                    "
                    :column="2"
                />
            </a-form-item>
            <a-form-item
                :name="['nspwc']"
                v-if="
                    formData.accessModes?.includes('write') &&
                    formData.configuration.function === 'HoldingRegisters'
                "
            >
                <span style="margin-right: 10px">{{ $t('Save.SaveModBus.4001413-24') }}</span>
                <a-switch
                    @change="changeNspwc"
                    v-model:checked="formData.nspwc"
                />
            </a-form-item>
            <a-form-item
                v-if="
                    !!formData.nspwc &&
                    formData.accessModes?.includes('write') &&
                    formData.configuration.function === 'HoldingRegisters'
                "
                :label="$t('Save.SaveModBus.4001413-25')"
                :name="['configuration', 'parameter', 'writeByteCount']"
                :rules="ModBusRules.writeByteCount"
            >
                <j-card-select
                    :showImage="false"
                    v-model:value="
                        formData.configuration.parameter.writeByteCount
                    "
                    :options="[
                        { label: $t('Save.SaveModBus.4001413-26'), value: true },
                        { label: $t('Save.SaveModBus.4001413-27'), value: false },
                    ]"
                    @change="changeWriteByteCount"
                    :column="2"
                />
            </a-form-item>
            <a-form-item
                v-if="
                    !!formData.nspwc &&
                    formData.accessModes?.includes('write') &&
                    formData.configuration.function === 'HoldingRegisters'
                "
                :label="$t('Save.SaveModBus.4001413-28')"
                :name="['configuration', 'parameter', 'byteCount']"
                :rules="ModBusRules.byteCount"
            >
                <a-input
                    :placeholder="$t('Save.SaveModBus.4001413-29')"
                    v-model:value="formData.configuration.parameter.byteCount"
                />
            </a-form-item>
            <a-form-item
                :label="$t('Save.SaveModBus.4001413-30')"
                :name="['configuration', 'interval']"
                :rules="[...ModBusRules.interval]"
            >
                <a-input-number
                    style="width: 100%"
                    :placeholder="$t('Save.SaveModBus.4001413-31')"
                    v-model:value="formData.configuration.interval"
                    addon-after="ms"
                    :max="2147483648"
                    :min="0"
                />
            </a-form-item>

            <a-form-item label="" :name="['features']">
                <a-checkbox-group v-model:value="formData.features">
                    <a-checkbox value="changedOnly" name="type"
                        >{{$t('Save.SaveModBus.4001413-32')}}</a-checkbox
                    >
                </a-checkbox-group>
            </a-form-item>

            <a-form-item :label="$t('Save.SaveModBus.4001413-33')" :name="['description']">
                <a-textarea
                    :placeholder="$t('Save.SaveModBus.4001413-34')"
                    v-model:value="formData.description"
                    :maxlength="200"
                    :rows="3"
                    showCount
                />
            </a-form-item>
        </a-form>
        <template #footer>
            <a-button key="back" @click="handleCancel">{{$t('Save.SaveModBus.4001413-35')}}</a-button>
            <j-permission-button
                key="submit"
                type="primary"
                :loading="loading"
                @click="handleOk"
                style="margin-left: 8px"
                :hasPermission="`DataCollect/Collector:${
                    id ? 'update' : 'add'
                }`"
            >
                {{$t('Save.SaveModBus.4001413-36')}}
            </j-permission-button>
        </template>
    </a-modal>
</template>
<script lang="ts" setup>
import {
    savePointBatch,
    updatePoint,
    _validateField,
    queryCodecProvider,
} from '../../../../../api/data-collect/collector';
import {ModBusRules,  checkProviderData } from '../../data';
import type { FormInstance } from 'ant-design-vue';
import type { Rule } from 'ant-design-vue/lib/form';
import { cloneDeep, omit } from 'lodash-es';
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
const providerListAll: any = ref([]);
const providerList: any = ref([]);
const formRef = ref<FormInstance>();

const id = props.data.id;
const collectorId = props.data.collectorId;
const provider = props.data.provider;
const oldPointKey = props.data.pointKey;

const InitAddress = {
    Coils: 1,
    DiscreteInputs: 10001,
    HoldingRegisters: 40001,
    InputRegisters: 30001,
};

const formData = ref({
    name: '',
    configuration: {
        function: undefined,
        interval: 3000,
        parameter: {
            quantity: 1,
            writeByteCount: '',
            byteCount: 2,
            address: '',
        },
        codec: {
            provider: undefined,
            configuration: {
                scaleFactor: 1,
                scale: undefined,
            },
        },
    },
    pointKey: undefined,
    accessModes: [],
    nspwc: false,
    features: [],
    description: '',
});

const handleOk = async () => {
    const data = await formRef.value?.validate();
    delete data?.nspwc;
    const { codec } = data?.configuration;

    if (
        !['HoldingRegisters', 'InputRegisters'].includes(
            data?.configuration.function,
        )
    ) {
        codec.provider = 'int8';
    }
    const { interval } = formData.value.configuration;
    const params = {
        ...props.data,
        ...data,
        provider,
        collectorId,
        interval,
    };

    // address是多余字段，但是react版本上使用到了这个字段
    params.configuration.parameter = {
        ...params.configuration.parameter,
        address: data?.pointKey,
    };

    if (props.data.provider === 'COLLECTOR_GATEWAY') {
        const configuration = cloneDeep(params.configuration);
        // 兼容导入数据格式 24.7.9
        //   params.configuration = {
        //     configuration: configuration,
        //     interval: params.interval
        //   }
        params.configuration = configuration;
    }

    loading.value = true;
    const response = !id
        ? await savePointBatch(params).catch(() => {})
        : await updatePoint(id, { ...props.data, ...params }).catch(() => {});
    emit('change', response?.status === 200);
    loading.value = false;
};

const handleCancel = () => {
    emit('change', false);
};

const changeQuantity = () => {
    const { configuration, nspwc } = formData.value;
    if (configuration.function === 'HoldingRegisters') {
        formRef.value?.validate();
    }
    if (nspwc) {
        configuration.parameter.byteCount =
            Number(configuration.parameter.quantity) * 2;
    }
};
const changeNspwc = (value: boolean) => {
    const { configuration } = formData.value;
    if (value) {
        configuration.parameter.byteCount =
            Number(configuration.parameter.quantity || 0) * 2;
    }
};
const changeWriteByteCount = (value: Array<string>) => {
    formData.value.configuration.parameter.writeByteCount = value[0];
};
const changeFunction = (value: string) => {
    formData.value.accessModes = ['InputRegisters', 'DiscreteInputs'].includes(
        value,
    )
        ? ['read']
        : ['read', 'write'];
};

const checkProvider = (_rule: Rule, value: string): Promise<any> =>
    new Promise(async (resolve, reject) => {
        if (value) {
            const { quantity } = formData.value.configuration.parameter;
            return checkProviderData[value] > Number(quantity) * 2
                ? reject($t('Save.SaveModBus.4001413-37') + '<=' + $t('Save.SaveModBus.4001413-38')  + ' * 2')
                : resolve('');
        } else {
            return reject('');
        }
    });

const checkPointKey = (_rule: Rule, value: string): Promise<any> =>
    new Promise(async (resolve, reject) => {
        if (value || Number(value) === 0) {
            if (Number(oldPointKey) === Number(value)) return resolve('');
            if (typeof value === 'object') return resolve('');
            const res: any = await _validateField(collectorId, {
                pointKey: value,
            });
            return res.result?.passed ? resolve('') : reject(res.result.reason);
        } else {
            return reject($t('Save.SaveModBus.4001413-11'));
        }
    });

const filterOption = (input: string, option: any) => {
    return option.label.toLowerCase().indexOf(input.toLowerCase()) >= 0;
};

const getProviderList = async () => {
    const res: any = await queryCodecProvider();
    providerListAll.value = res.result
        .filter((i: any) => i.id !== 'property' && i.id !== 'bool')
        .map((item: any) => ({
            value: item.id,
            label: item.name,
        }));
    setProviderList(formData.value.configuration.function);
};
getProviderList();

const setProviderList = (value: string | undefined) => {
    providerList.value = providerListAll.value;
};

watch(
    () => formData.value.configuration.function,
    (value) => {
        setProviderList(value);
    },
    { immediate: true, deep: true },
);
watch(
    () => props.data,
    (value) => {
         // 兼容导入数据格式 24.7.9
        if (
            value.id &&
            ['MODBUS_TCP', 'COLLECTOR_GATEWAY'].includes(value.provider)
        ) {
            const _value: any = cloneDeep(value);
            const { writeByteCount, byteCount } =
                props.data.provider === 'COLLECTOR_GATEWAY' &&
                _value.configuration?.configuration
                    ? _value.configuration?.configuration.parameter
                    : _value.configuration.parameter;

            if (props.data.provider === 'COLLECTOR_GATEWAY') {
                _value.configuration?.configuration
                    ? (formData.value = {
                          ...omit(_value, ['configuration']),
                          ..._value.configuration,
                      })
                    : (formData.value = {
                          ..._value,
                      });
            } else {
                formData.value = _value;
            }

            if (!!_value.accessModes[0]?.value) {
                formData.value.accessModes = value.accessModes.map(
                    (i: any) => i.value,
                );
            }
            if (!!_value.features[0]?.value) {
                formData.value.features = value.features.map(
                    (i: any) => i.value,
                );
            }
            formData.value.nspwc = !!writeByteCount || !!byteCount;
        }
    },
    { immediate: true, deep: true },
);
</script>

<style lang="less" scoped></style>
