<template>
    <a-modal
        visible
        :maskClosable="false"
        :title="!!data?.id ? $t('Save.index.001090-0') : $t('Save.index.001090-1')"
        width="650px"
        :confirm-loading="loading"
        @cancel="emit('close')"
        @ok="handleSave"
    >
        <div class="tip" v-if="!data.id">
          {{ $t('Save.index.001090-17') }}
        </div>
        <a-form ref="formRef" layout="vertical" :model="formData" :rules="rules">
            <a-form-item name="targetType" :label="$t('Save.index.001090-16')" :rules="{
                    required: true,
                    message: $t('Scan.Table.400147-1'),
                }">
                <j-card-select
                    :disabled="!!data.id"
                    v-model:value="formData.targetType"
                    :options="TargetTypeOptions"
                    :column="3"
                    @change="handleChangeTargetType"
                ></j-card-select>
            </a-form-item>
            <a-form-item name="targetId">
                <template #label>
                    <span>
                      ID
<!--                        <span v-if="formData.targetType === 'AiModel'">-->
<!--                            {{ $t('Save.index.001090-2') }}-->
<!--                        </span>-->
<!--                        <span v-else-if="formData.targetType === 'PluginDriver'">-->
<!--                            {{ $t('Save.index.001090-14') }}-->
<!--                        </span>-->
<!--                        <span v-else>-->
<!--                            {{ $t('Save.index.001090-15') }}-->
<!--                        </span>-->
                        <a-tooltip
                            :title="$t('Save.index.001090-3')"
                        >
                            <AIcon
                                type="QuestionCircleOutlined"
                                style="margin-left: 2px"
                            />
                        </a-tooltip>
                    </span>
                </template>
                <a-input v-model:value="formData.id" :disabled="data.id" :placeholder="$t('Save.index.001090-4')"></a-input>
            </a-form-item>
            <a-form-item :label="$t('Save.index.001090-5')" name="name">
                <a-input v-model:value="formData.name" :placeholder="$t('Save.index.001090-6')"></a-input>
            </a-form-item>
            <a-form-item
                v-if="formData.targetType == 'AiModel'"
                :label="$t('Save.index.001090-7')"
                name="properties"
                :rules="{
                    required: true,
                    validator: validateModelFile
                }"
            >
                <UploadFile
                    :accept="['.jar', '.zip', '.gz']"
                    :fileInfo="{url: formData.metadata.fileUrl, name: formData.properties?.fileName}"
                    v-model:model-value="formData.metadata.fileUrl"
                    v-model:fileName="formData.properties.fileName"
                    @change="handleFileChange"
                />
            </a-form-item>
            <a-form-item
                v-else-if="formData.targetType == 'PluginDriver'"
                :label="$t('Save.index.001090-7')"
                name="metadata"
                :rules="{
                    required: true,
                    validator: validatePluginFile
                }"
            >
                <UploadFile
                    :accept="['.jar', '.zip']"
                    :fileInfo="{url: formData.metadata.configuration.location, name: formData.metadata.filename}"
                    v-model:model-value="formData.metadata.configuration.location"
                    v-model:fileName="formData.metadata.filename"
                    @change="handlePluginFileChange"
                />
            </a-form-item>
            <a-form-item
                v-else-if="formData.targetType == 'entityTemplate:Collector'"
                :label="$t('Save.index.001090-7')"
                name="metadata"
                :rules="{
                    required: true,
                    validator: validateTemplateFile
                }"
            >
                <FileSelect
                    v-model:metadata="formData.metadata"
                    v-model:fileName="formData.metadata.properties.fileName"
                    @change="handleTemplateFileChange"
                />
            </a-form-item>
            <a-form-item :label="$t('Save.index.001090-8')">
                <a-textarea v-model:value="formData.metadata.description" :maxlength="200" showCount :placeholder="$t('Save.index.001090-9')"></a-textarea>
            </a-form-item>
        </a-form>
    </a-modal>
</template>

<script setup lang="ts">
import UploadFile from './UploadFile.vue';
import FileSelect from "./FileSelect.vue";
import { save } from '../../../../api/edge/newResource';
import { onlyMessage } from "@/utils/comm";
import { randomString } from "@jetlinks-web/utils";
import {ServiceIdEnum, TargetTypeOptions} from "../utils";
import {cloneDeep} from "lodash-es";
import { useI18n } from 'vue-i18n';

const { t: $t } = useI18n();

const emit = defineEmits(['close', 'save']);
const props = defineProps({
    data: {
        type: Object,
        default: () => ({}),
    }
})

const initAiModelMetadata = {
    name: '',
    fileUrl: '',
    others: {
        fileName: '',
        md5: '',
    },
    provider: 'plugin',
    description: '',
};

const initPluginDriverMetadata = {
    name: '',
    filename: '',
    provider: 'jar',
    description: '',
    configuration: {
        location: '',
    }
}

const initCollectorTemplateMetadata = {
    id: "",
    name: '',
    serviceId: 'commonService:entityTemplate',
    category: '',
    description: '',
    properties: {
        fileName: '',
    },
    metadata: {
        collector: {},
        points: []
    }
}
const loading = ref(false);
const formRef = ref();
const formData = ref<Record<string, any>>({
    id: props.data.id || undefined,
    name: props.data.name || undefined,
    targetType: props.data?.targetType || 'AiModel',
    targetId: props.data?.targetId || undefined,
    serviceId:"aiService:modelManager",
    properties: props.data?.properties || {
        fileName: ""
    },
    metadata: props.data.metadata ? JSON.parse(props.data.metadata) : cloneDeep(initAiModelMetadata)
})

const rules = {
    id: [
        {
            pattern: /^[a-zA-Z0-9_\-]+$/,
            message: $t('Save.index.001090-10'),
        },
        {
            max: 64,
            message: $t('Save.index.001090-11'),
        },
    ],
    name: [
        {
            required: true,
            message: $t('Save.index.001090-6'),
        },
        {
            max: 64,
            message: $t('Save.index.001090-11'),
        },
    ],
}

const handleFileChange = (data: any) => {
    formRef.value?.validateFields(['properties'])
    formData.value.metadata.others.fileName = data.name;
    formData.value.metadata.others.md5 = data.md5;
}

const handlePluginFileChange = () => {
    formRef.value?.validateFields(['metadata'])
}
const handleTemplateFileChange = () => {
    formRef.value?.validateFields(['metadata'])
}

const validateModelFile = (rule: any, value: string) => {
    if (!value?.fileName) {
        return Promise.reject($t('Save.index.001090-12'));
    }
    return Promise.resolve();
}

const validatePluginFile = (rule: any, value: string) => {
    if (!value?.filename) {
        return Promise.reject($t('Save.index.001090-12'));
    }
    return Promise.resolve();
}

const validateTemplateFile = (rule: any, value: string) => {
    if (!value?.properties?.fileName) {
        return Promise.reject($t('Save.index.001090-12'));
    }
    return Promise.resolve();
}
const handleSave = () => {
    formRef.value?.validate().then(async () => {
        loading.value = true;
        formData.value.metadata.name = formData.value.name;
        formData.value.targetId = formData.value.id;
        const params = {
            ...formData.value,
            metadata: JSON.stringify(formData.value.metadata)
        }
        if(!formData.value.targetId) {
            params.targetId = randomString()
        }
        if(formData.value.targetType !== 'AiModel') {
            delete params.properties
        }
        const res = await save(params).finally(() => loading.value = false);
        if (res) {
            onlyMessage($t('Save.index.001090-13'));
            emit('save');
        }
    }) ;
}

const handleChangeTargetType = (e: any) => {
    formData.value.targetType = e;
    formData.value.serviceId = ServiceIdEnum[e]
    switch (formData.value.targetType) {
        case 'AiModel':
            formData.value.metadata = cloneDeep(initAiModelMetadata);
            formData.value.properties = {
                fileName: ""
            }
            break;
        case 'PluginDriver':
            formData.value.metadata = cloneDeep(initPluginDriverMetadata);
            formData.value.properties = {
                fileName: ""
            }
            break;
        case 'entityTemplate:Collector':
            formData.value.metadata = cloneDeep(initCollectorTemplateMetadata);
            delete formData.value.properties
            break;
    }
}
</script>

<style scoped lang="less">
.tip {
  padding: 8px 14px;
  border: 1px solid #91CAFF;
  background-color: #E6F4FF;
  margin-bottom: 16px;
  border-radius: 2px;
}
</style>
