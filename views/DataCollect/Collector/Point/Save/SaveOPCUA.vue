<template >
    <a-modal :title="$t('Save.SaveOPCUA.4001412-0')" :visible="true" width="700px" @cancel="handleCancel">
        <a-form
            class="form"
            layout="vertical"
            :model="formData"
            name="basic"
            autocomplete="off"
            :rules="OPCUARules"
            ref="formRef"
        >
            <a-form-item :label="$t('Save.SaveOPCUA.4001412-1')" name="name">
                <a-input
                    :placeholder="$t('Save.SaveOPCUA.4001412-2')"
                    v-model:value="formData.name"
                />
            </a-form-item>
            <a-form-item :label="$t('Save.SaveOPCUA.4001412-3')" :name="['configuration', 'type']">
                <a-select
                    style="width: 100%"
                    v-model:value="formData.configuration.type"
                    :options="options"
                    :placeholder="$t('Save.SaveOPCUA.4001412-4')"
                    allowClear
                    show-search
                    :filter-option="filterOption"
                />
            </a-form-item>

            <a-form-item :label="$t('Save.SaveOPCUA.4001412-5')" name="accessModes">
                <j-card-select
                    multiple
                    :showImage="false"
                    v-model:value="formData.accessModes"
                    :options="[
                        { label: $t('Save.SaveOPCUA.4001412-6'), value: 'read' },
                        { label: $t('Save.SaveOPCUA.4001412-7'), value: 'write' },
                        { label: $t('Save.SaveOPCUA.4001412-8'), value: 'subscribe' },
                    ]"
                    :column="3"
                />
            </a-form-item>
            <a-form-item
                :label="$t('Save.SaveOPCUA.4001412-9')"
                :name="['configuration', 'interval']"
                :rules="[...OPCUARules.interval]"
            >
                <a-input-number
                    style="width: 100%"
                    :placeholder="$t('Save.SaveOPCUA.4001412-10')"
                    v-model:value="formData.configuration.interval"
                    addon-after="ms"
                    :max="2147483648"
                    :min="0"
                />
            </a-form-item>
            <a-form-item label="" :name="['features']">
                <a-checkbox-group v-model:value="formData.features">
                    <a-checkbox value="changedOnly" name="type"
                        >{{$t('Save.SaveOPCUA.4001412-11')}}</a-checkbox
                    >
                </a-checkbox-group>
            </a-form-item>
            <a-form-item :label="$t('Save.SaveOPCUA.4001412-12')" :name="['description']">
                <a-textarea
                    :placeholder="$t('Save.SaveOPCUA.4001412-13')"
                    v-model:value="formData.description"
                    :maxlength="200"
                    :rows="3"
                    showCount
                />
            </a-form-item>
        </a-form>
        <template #footer>
            <a-button key="back" @click="handleCancel">{{$t('Save.SaveOPCUA.4001412-14')}}</a-button>
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
                {{$t('Save.SaveOPCUA.4001412-15')}}
            </j-permission-button>
        </template>
    </a-modal>
</template>
<script lang="ts" setup>
import {
    savePoint,
    updatePoint,
    queryTypeList
} from '../../../../../api/data-collect/collector';
import type { FormInstance } from 'ant-design-vue';
import { cloneDeep } from 'lodash-es';
import { OPCUARules } from '../../data';
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
const formRef = ref<FormInstance>();

const id = props.data.id;
const collectorId = props.data.collectorId;
const provider = props.data.provider;
const options = ref([]);

const formData = ref({
    name: '',
    configuration: {
        type: undefined,
        interval: 3000,
    },
    accessModes: [],
    features: [],
    description: '',
});

const handleOk = async () => {
    const data = await formRef.value?.validate();
    const { interval } = formData.value.configuration;
    const params = {
        ...props.data,
        ...data,
        provider,
        collectorId,
        interval,
    };

    loading.value = true;
    const response = !id
        ? await savePoint(params).catch(() => {})
        : await updatePoint(id, { ...props.data, ...params }).catch(() => {});
    emit('change', response?.status === 200);
    loading.value = false;
};

const handleCancel = () => {
    emit('change', false);
};

const filterOption = (input: string, option: any) => {
    return option.label.toLowerCase().indexOf(input.toLowerCase()) >= 0;
};

onMounted(() => {
    queryTypeList().then((resp: any) => {
        if(resp.status === 200){
            options.value = (resp?.result || []).map((item: any) => {
                return {
                    label: item,
                    value: item
                }
            })
        }
    })
})

watch(
    () => props.data,
    (value) => {
        if (value.id && value.provider === 'OPC_UA') {
            const _value: any = cloneDeep(value);
            formData.value = _value;
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
        }
    },
    { immediate: true, deep: true },
);
</script>

<style lang="less" scoped></style>
