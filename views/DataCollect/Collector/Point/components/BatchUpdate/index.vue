<template>
    <a-modal
        :title="$t('BatchUpdate.index.4001419-0')"
        :visible="true"
        width="700px"
        @cancel="handleCancel"
        :destroyOnClose="true"
    >
        <div class="sizeText">
            {{ $t('BatchUpdate.index.4001419-1') }}
            {{ data.length }} {{ $t('BatchUpdate.index.4001419-2') }}{{ labelName.join(',') }}】
        </div>
        <a-form
            class="form"
            layout="vertical"
            :model="formData"
            name="basic"
            autocomplete="off"
            ref="formRef"
        >
            <a-form-item :label="$t('BatchUpdate.index.4001419-3')" v-if="provider === 'BACNetIp'">
                <a-select
                    v-model:value="formData.valueType"
                    allowClear
                    :placeholder="$t('BatchUpdate.index.4001419-4')"
                >
                    <a-select-option
                        v-for="item in bacnetValueType"
                        :key="item"
                        :value="item"
                        >{{ item }}</a-select-option
                    >
                </a-select>
            </a-form-item>
            <a-form-item :label="$t('BatchUpdate.index.4001419-5')" name="accessModes">
                <j-card-select
                    multiple
                    :showImage="false"
                    v-model:value="formData.accessModes"
                    :options="[
                        { label: $t('BatchUpdate.index.4001419-6'), value: 'read' },
                        { label: $t('BatchUpdate.index.4001419-7'), value: 'write' },
                        { label: $t('BatchUpdate.index.4001419-8'), value: 'subscribe' },
                    ]"
                />
            </a-form-item>
            <a-form-item
                :name="['interval']"
                :rules="[
                    {
                        pattern: regOnlyNumber,
                        message: $t('BatchUpdate.index.4001419-9'),
                    },
                ]"
            >
                <template #label>
                    <span>
                        {{ $t('BatchUpdate.index.4001419-10') }}
                        <a-tooltip :title="$t('BatchUpdate.index.4001419-11')">
                            <AIcon
                                type="QuestionCircleOutlined"
                                style="margin-left: 2px"
                            />
                        </a-tooltip>
                    </span>
                </template>
                <a-input-number
                    style="width: 100%"
                    :placeholder="$t('BatchUpdate.index.4001419-12')"
                    v-model:value="formData.interval"
                    addon-after="ms"
                    :max="2147483648"
                    :min="0"
                    :precision="0"
                />
            </a-form-item>
            <a-form-item :label="$t('BatchUpdate.index.4001419-13')">
                <a-switch v-model:checked="formData.pushControl"></a-switch>
            </a-form-item>
            <a-form-item :name="['features']" v-if="formData.pushControl"> 
                <a-checkbox-group v-model:value="formData.features">
                    <a-checkbox value="changedOnly" name="type"
                        >{{ $t('BatchUpdate.index.4001419-14') }}</a-checkbox
                    >
                </a-checkbox-group>
            </a-form-item>
        </a-form>
        <template #footer>
            <a-button key="back" @click="handleCancel">{{ $t('BatchUpdate.index.4001419-15') }}</a-button>
            <j-permission-button
                key="submit"
                type="primary"
                :loading="loading"
                @click="handleOk"
                style="margin-left: 8px"
                :hasPermission="`DataCollect/Collector:update`"
            >
                {{ $t('BatchUpdate.index.4001419-16') }}
            </j-permission-button>
        </template>
    </a-modal>
</template>
<script lang="ts" setup>
import type { FormInstance } from 'ant-design-vue';
import {
    savePointBatch,
    getBacnetValueType,
} from '../../../../../../api/data-collect/collector';
import { cloneDeep, isObject  } from 'lodash-es';
import { regOnlyNumber } from '../../../data';
import { useI18n } from 'vue-i18n';

const { t: $t } = useI18n();

const props = defineProps({
    data: {
        type: Array,
        default: () => [],
    },
    provider: {
        type: String,
        default: '',
    },
});

const emit = defineEmits(['change']);
const loading = ref(false);
const formRef = ref<FormInstance>();

const formData = ref({
    accessModes: [],
    interval: undefined,
    features: [],
    valueType: undefined,
    pushControl: false,
});

const bacnetValueType = ref<string[]>([]);

const getIdAndType = async () => {
    const resp: any = await getBacnetValueType();
    if (resp.success) {
        bacnetValueType.value = resp.result;
    }
};

const handleOk = async () => {
    const data = cloneDeep(formData.value);
    const { accessModes, features, interval, valueType, pushControl } = data;
    const ischange =
        accessModes.length !== 0 ||
        pushControl ||
        Number(interval) === 0 ||
        !!interval ||
        !!valueType;
    if (ischange) {
        const params = cloneDeep(props.data);
        params.forEach((i: any) => {
            if (accessModes.length !== 0) {
                i.accessModes = data.accessModes;
            } else {
                if (isObject(i.accessModes)) {
                    i.accessModes = i.accessModes.map(
                        (item: any) => item.value,
                    );
                }
            }
            if (pushControl) {
                if (features.length !== 0) {
                    i.features = data.features;
                } else {
                    i.features = [];
                }
            }
            
            if (!!interval || Number(interval) === 0) {
                i.interval = data.interval;
                i.configuration = {
                    ...i.configuration,
                    interval: data.interval,
                };
            }
            if (data.valueType) {
                i.configuration = {
                    ...i.configuration,
                    valueType: data.valueType,
                };
            }
        });
        loading.value = true;
        const response = await savePointBatch(params).catch(() => {});
        emit('change', response?.status === 200);
        loading.value = false;
    } else {
        emit('change', true);
    }
};

const handleCancel = () => {
    emit('change', false);
};

watch(
    () => props.provider,
    () => {
        if (props.provider === 'BACNetIp') {
            getIdAndType();
        }
    },
    { immediate: true },
);

const labelName = computed(() => {
    const arr = [];
    if (formData.value.accessModes.length) {
        arr.push($t('BatchUpdate.index.4001419-5'));
    }
    if (!!formData.value.interval) {
        arr.push($t('BatchUpdate.index.4001419-10'));
    }
    if (formData.value.features.length) {
        arr.push($t('BatchUpdate.index.4001419-14'));
    }
    if (formData.value.type) {
        arr.push($t('BatchUpdate.index.4001419-17'));
    }
    if (formData.value.valueType) {
        arr.push($t('BatchUpdate.index.4001419-3'));
    }
    return arr;
});
</script>

<style lang="less" scoped>
.sizeText {
    margin-bottom: 20px;
}
</style>
