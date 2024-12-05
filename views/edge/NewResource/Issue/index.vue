<template>
    <a-modal
        title="下发"
        visible
        width="50%"
        :maskClosable="false"
        @cancel="emit('close')"
    >
        <a-form :model="formData" ref="formRef" layout="vertical" :rules="rules">
            <div v-show="current === 1">
                <a-form-item label="名称" name="name">
                    <a-input v-model:value="formData.name" placeholder="请输入任务名称"></a-input>
                </a-form-item>
                <a-row :gutter="16">
                    <a-col :span="12">
                        <a-form-item label="响应超时时间" name="timeoutSeconds">
                            <a-input-number v-model:value="formData.timeoutSeconds" style="width: 100%;" :min="1" :max="10000" :precision="0" placeholder="请输入响应超时时间(秒)"></a-input-number>
                        </a-form-item>
                    </a-col>
                    <a-col :span="12">
                        <a-form-item label="重试次数" name="maxRetry">
                            <a-input-number v-model:value="formData.maxRetry" style="width: 100%;" :min="1" :max="10000" :precision="0" placeholder="请输入重试次数"></a-input-number>
                        </a-form-item>
                    </a-col>
                </a-row>
                <a-form-item label="网关设备选择方式">
                    <j-card-select v-model:value="chooseType" :options="options"></j-card-select>
                </a-form-item>
                <a-form-item label="说明">
                    <a-textarea v-model:value="formData.description" placeholder="请输入说明" :maxlength="200" showCount></a-textarea>
                </a-form-item>
            </div>
            <GatewayDevice v-if="current !== 1" v-model:value="deviceList"/>
        </a-form>
        <template #footer>
            <div style="display: flex;justify-content: space-between">
                <div>
                    <a-button v-if="current !== 1" @click="current = 1">上一步</a-button>
                </div>
                <a-space>
                    <a-button @click="emit('close')">取消</a-button>
                    <a-button v-if="current === 1" type="primary" @click="handleSubmit">下一步</a-button>
                    <a-button v-else type="primary" @click="handleSubmit">确定</a-button>
                </a-space>
            </div>
        </template>
    </a-modal>
</template>

<script setup lang="ts">
import GatewayDevice from './GatewayDevice.vue';
import { onlyMessage } from "@/utils/comm";
import { createTask } from '../../../../api/edge/newResource'

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
        {required: true, message: '请输入任务名称', trigger: 'blur'},
        {max: 64, message: '最多输入64个字符', trigger: 'change'},
    ],
    timeoutSeconds: [
        {required: true, message: '请输入响应超时时间', trigger: 'blur'},
    ],
    maxRetry: [
        {required: true, message: '请输入重试次数', trigger: 'blur'},
    ],
}

const options = [
    {label: '按设备选择', value: 'device'},
    {label: '更多方式', value: 'more', disabled: true},
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
                return onlyMessage('请选择网关设备', 'error');
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
                onlyMessage('操作成功');
                emit('close');
            }
        }
    });

}
</script>

<style scoped lang="less">

</style>