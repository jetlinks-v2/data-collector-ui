<template>
    <a-upload
        name="file"
        :accept="accept.join(',')"
        :action="uploadUrl"
        :headers="{
            [TOKEN_KEY]: LocalStore.get(TOKEN_KEY),
        }"
        @change="handleChange"
        class="upload-box"
        :before-upload="beforeUpload"
        :disabled="loading"
        :maxCount="1"
        :fileList="list"
        @remove="remove"
    >
        <div>
            <a-button>{{ $t('Save.UploadFile.102395-0') }}</a-button>
            <span class="upload-tip">{{ $t('Save.UploadFile.102395-1') }}{{ accept.join('，') }}</span>
        </div>
    </a-upload>
    <template v-if="loading">
        <a-spin size="small"/>
        {{ $t('Save.UploadFile.102395-2') }}
    </template>
</template>

<script setup lang="ts" name="fileUpload">
import { LocalStore } from '@jetlinks-web/utils'
import { TOKEN_KEY } from '@jetlinks-web/constants';
import { onlyMessage } from '@jetlinks-web/utils';
import type { UploadChangeParam, UploadProps } from 'ant-design-vue';
import { notification as Notification } from 'ant-design-vue';
import { FileStaticPath } from "@/api/comm";
import { useI18n } from "vue-i18n";

const { t: $t } = useI18n();
const emit = defineEmits(['update:modelValue', 'change', 'update:fileName']);

const props = defineProps({
    modelValue: {
        type: String,
        default: () => '',
    },
    disabled: {
        type: Boolean,
        default: false,
    },
    fileName: {
        type: String,
        default: undefined,
    },
    fileInfo: {
        type: Object,
        default: () => ({})
    },
    uploadUrl: {
        type: String,
        default: FileStaticPath
    },
    accept: {
        type: Array,
        default: () => ([])
    }
});

const value = ref(props.modelValue);
const list = ref<any>(props.fileName ? [{ name: props.fileName }] : []);
const loading = ref(false);
const fileCache = ref();
const remove = () => {
    list.value = [];
    emit('update:modelValue', undefined);
    emit('update:fileName', undefined);
    emit('change', {});
};

const beforeUpload: UploadProps['beforeUpload'] = (file, fl) => {
    loading.value = true;
    const arr = file.name.split('.');
    const isFile = props.accept?.map(item => item.replace('.', '')).includes(arr[arr.length - 1]); // file.type === 'application/zip' || file.type === 'application/javj-archive'
    if (!isFile) {
        onlyMessage($t('Save.UploadFile.102395-3', [props.accept?.join('、')]), 'error');
        loading.value = false;
        return false;
    }
    list.value = fl;
    return isFile;
};
const handleChange = async (info: UploadChangeParam) => {
    if (info.file.status === 'done') {
        loading.value = false;
        const result = info.file.response?.result;
        const f = result.accessUrl;
        onlyMessage($t('Save.UploadFile.102395-4'), 'success');
        value.value = f;
        fileCache.value = info.fileList;
        emit('update:modelValue', result.accessUrl);
        emit('update:fileName', result.filename || result.name)
        emit('change', result);
    } else {
        if (info.file.error) {
            list.value = fileCache.value;
            Notification.error({
                // key: '403',
                message: $t('Save.UploadFile.102395-5'),
                description: info.file.response?.message,
            });
            // emit('update:modelValue', { err:'file_upload_error'});
            loading.value = false;
        } else if (info.file.response) {
            loading.value = false;
        }
    }
};
</script>

<style lang="less" scoped>
.upload-tip {
    color: #999;
    padding-left: 12px;
}
</style>
