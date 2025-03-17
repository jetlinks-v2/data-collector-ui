<template>
    <a-modal
        :title="$t('Issue.index.517977-0')"
        visible
        width="50%"
        :maskClosable="false"
        @cancel="emit('close')"
    >
        <a-form :model="formData" ref="formRef" layout="vertical" :rules="rules">
            <div v-show="current === 1">
                <a-form-item :label="$t('Issue.index.517977-1')" name="name">
                    <a-input v-model:value="formData.name" :placeholder="$t('Issue.index.517977-2')"></a-input>
                </a-form-item>
                <a-row :gutter="16">
                    <a-col :span="12">
                        <a-form-item :label="$t('Issue.index.517977-3')" name="timeoutSeconds">
                            <a-input-number v-model:value="formData.timeoutSeconds" style="width: 100%;" :min="1" :max="10000" :precision="0" :placeholder="$t('Issue.index.517977-4') + `(${$t('Issue.index.517977-5')})`"></a-input-number>
                        </a-form-item>
                    </a-col>
                    <a-col :span="12">
                        <a-form-item :label="$t('Issue.index.517977-6')" name="maxRetry">
                            <a-input-number v-model:value="formData.maxRetry" style="width: 100%;" :min="1" :max="10000" :precision="0" :placeholder="$t('Issue.index.517977-7')"></a-input-number>
                        </a-form-item>
                    </a-col>
                </a-row>
                <a-form-item :label="$t('Issue.index.517977-8')">
                    <j-card-select v-model:value="chooseType" :options="options">
                        <template #itemRender={node}>
                            <a-space align="flex-start">
                                <AIcon :type="node.icon"></AIcon>
                            <div>
                                <p>{{node.label}}</p>
                                <span style="color: #999;font-size: 14px;">{{node.describe}}</span>
                            </div>
                            </a-space>
                        </template>
                    </j-card-select>
                </a-form-item>
                <a-form-item :label="$t('Issue.index.517977-9')">
                    <a-textarea v-model:value="formData.description" :placeholder="$t('Issue.index.517977-10')" :maxlength="200" showCount></a-textarea>
                </a-form-item>
            </div>
            <GatewayDevice v-if="current !== 1" v-model:value="deviceList"/>
        </a-form>
        <template #footer>
            <div style="display: flex;justify-content: space-between">
                <div>
                    <a-button v-if="current !== 1" @click="current = 1">{{ $t('Issue.index.517977-11') }}</a-button>
                </div>
                <a-space>
                    <a-button @click="emit('close')">{{ $t('Issue.index.517977-12') }}</a-button>
                    <a-button v-if="current === 1" type="primary" @click="handleSubmit">{{ $t('Issue.index.517977-13') }}</a-button>
                    <a-button v-else type="primary" @click="handleSubmit">{{ $t('Issue.index.517977-14') }}</a-button>
                </a-space>
            </div>
        </template>
    </a-modal>
</template>

<script setup lang="ts">
import GatewayDevice from './GatewayDevice.vue';
import { onlyMessage } from "@/utils/comm";
import { createTask } from '../../../../api/edge/newResource'
import { useI18n } from 'vue-i18n';

const { t: $t } = useI18n();

const emit = defineEmits(['close']);
const props = defineProps({
    data: {
        type: Object,
        default: () => ({}),
    },
    jobType: {
        type: String,
        default: '',
    },
    serviceId: {
        type: String,
        default: '',
    },
})
const current = ref(1);
const chooseType = ref('device');
const formRef = ref();
const deviceList = ref<Record<string, any>[]>([]);
const formData = ref<Record<string, any>>({
    name: undefined,
    timeoutSeconds: null,
    maxRetry: null,
    jobType: props.jobType,
    serviceId: props.serviceId,
    commandId: 'SaveByTemplate',
    thingList: [],
    targetId: props.data.targetId,
    resourceTotal: 1,
})

const rules = {
    name: [
        {required: true, message: $t('Issue.index.517977-2'), trigger: 'blur'},
        {max: 64, message: $t('Issue.index.517977-15'), trigger: 'change'},
    ],
    timeoutSeconds: [
        {required: true, message: $t('Issue.index.517977-4'), trigger: 'blur'},
    ],
    maxRetry: [
        {required: true, message: $t('Issue.index.517977-7'), trigger: 'blur'},
    ],
}

const options = [
    {label: $t('Issue.index.517977-16'), value: 'device', describe: '按设备列表选择对应网关设备', icon: 'icon-shebeixinxi'},
    {label: $t('Issue.index.517977-17'), value: 'more', disabled: true, describe: '敬请期待！', icon: 'AppstoreOutlined'},
]

const handleSubmit = () => {
    formRef.value?.validate().then(async () => {
        if (current.value === 1) {
            if(!formData.value.name) {
                return
            }
            current.value += 1
        } else if (current.value === 2) {
            if(!deviceList.value.length) {
                return onlyMessage($t('Issue.index.517977-18'), 'error');
            }
            const data = {
                ...formData.value,
                thingList: deviceList.value.map(item => {
                    return {
                        thingId: item.id,
                        thingType: 'device',
                        thingName: item.name
                    }
                }),
                commandArgs: [
                    {
                        data: props.data
                    }
                ],
                others: {
                    thingList: deviceList.value.map(item => {
                        return {
                            thingId: item.id,
                            thingType: 'device',
                            thingName: item.name
                        }
                    })
                }
            }
            const res = await createTask(data);
            if(res.success) {
                onlyMessage($t('Issue.index.517977-19'));
                emit('close');
            }
        }
    });

}
</script>

<style scoped lang="less">

</style>