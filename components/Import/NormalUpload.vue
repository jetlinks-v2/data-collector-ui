<template>
    <a-space align="end">
        <a-upload
            v-model:fileList="modelValue.upload"
            name="file"
            :action="FileUpload"
            :headers="{
                [TOKEN_KEY]: LocalStore.get(TOKEN_KEY),
            }"
            :maxCount="1"
            :showUploadList="false"
            @change="uploadChange"
            :accept="
                props?.file?.fileType ? `.${props?.file?.fileType}` : '.xlsx'
            "
            :before-upload="beforeUpload"
        >
            <a-button>
                <template #icon><AIcon type="UploadOutlined" /></template>
                {{ $t('Import.NormalUpload.135131-0') }}
            </a-button>
        </a-upload>
        <div style="margin-left: 20px">
            <a-space>
                {{ $t('Import.NormalUpload.135131-1') }}
                <a @click="downFile('xlsx')">.xlsx</a>
                <a @click="downFile('csv')">.csv</a>
            </a-space>
        </div>
    </a-space>
    <div style="margin-top: 20px" v-if="importLoading">
        <a-badge v-if="flag" status="processing" :text="$t('Import.NormalUpload.135131-2')" />
        <div v-else>
            <div>
                <a-space size="large">
                    <a-badge status="success" :text="$t('Import.NormalUpload.135131-3')" />
                    <span>{{ $t('Import.NormalUpload.135131-4') }}{{ count }}</span>
                </a-space>
            </div>
            <div>
                <a-space size="large">
                    <a-badge status="error" :text="$t('Import.NormalUpload.135131-5') + '&emsp;'" />
                    <span>{{ $t('Import.NormalUpload.135131-4') }}{{ failCount }}</span>
                    <a :href="detailFile" v-if="failCount">{{ $t('Import.NormalUpload.135131-6') }}</a>
                </a-space>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { FileUpload,deviceImport ,templateDownload} from '../../api/others';
import {LocalStore,onlyMessage,downloadFileByUrl} from "@jetlinks-web/utils";
import { TOKEN_KEY, } from '@jetlinks-web/constants'
import { EventSourcePolyfill } from 'event-source-polyfill';
import { useI18n } from 'vue-i18n';

const { t: $t } = useI18n();


type Emits = {
    (e: 'update:modelValue', data: string[]): void;
};
const emit = defineEmits<Emits>();

const props = defineProps({
    // 组件双向绑定的值
    modelValue: {
        type: Array,
        default: () => [],
    },
    product: {
        type: String,
        default: '',
    },
    file: {
        type: Object,
        default: () => {
            return {
                fileType: 'xlsx',
                autoDeploy: false,
            };
        },
    },
    url: {
        type: Object,
        default: () => {
            return {
                fileType: 'xlsx',
                autoDeploy: false,
            };
        },
    },
});

const importLoading = ref<boolean>(false);
const flag = ref<boolean>(false);
const count = ref<number>(0);
const failCount = ref(0);
const errMessage = ref<string>('');
const detailFile = ref('');

const downFile = async (type: string) => {
    const res: any = await templateDownload(props.product, type);
    if (res) {
        const blob = new Blob([res], { type: type });
        const url = URL.createObjectURL(blob);
        downloadFileByUrl(url, $t('Import.NormalUpload.135131-7'), type);
    }
};

const beforeUpload = (_file: any) => {
    const fileType = props?.file?.fileType === 'csv' ? 'csv' : 'xlsx';
    const isCsv = _file.type === 'text/csv';
    const isXlsx = _file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    if (!isCsv && fileType !== 'xlsx') {
        onlyMessage($t('Import.NormalUpload.135131-8'), 'warning');
    }
    if (!isXlsx && fileType !== 'csv') {
        onlyMessage($t('Import.NormalUpload.135131-9'), 'warning');
    }
    return (isCsv && fileType !== 'xlsx') || (isXlsx && fileType !== 'csv');
};

const submitData = async (fileUrl: string) => {
    if (!!fileUrl) {
        count.value = 0;
        failCount.value = 0;
        errMessage.value = '';
        flag.value = true;
        const autoDeploy = !!props?.file?.autoDeploy || false;
        importLoading.value = true;
        let dt = 0;
        const source = new EventSourcePolyfill(
            deviceImport(props.product, fileUrl, autoDeploy),
        );
        source.onmessage = (e: any) => {
            const res = JSON.parse(e.data);
            if (res.success) {
                const temp = res.result.total;
                dt += temp;
                count.value = dt;
            } else if(!res.success && !res.detailFile) {
                failCount.value++;
                errMessage.value = res.message || $t('Import.NormalUpload.135131-10');
            } else if(res.detailFile) {
                detailFile.value = res.detailFile;
            }
        };
        source.onerror = (e: { status: number }) => {
            if (e.status === 403) errMessage.value = $t('Import.NormalUpload.135131-11');
            flag.value = false;
            source.close();
        };
        source.onopen = () => {};
    } else {
        onlyMessage($t('Import.NormalUpload.135131-12'), 'error');
    }
};

const uploadChange = async (info: Record<string, any>) => {
    if (info.file.status === 'done') {
        const resp: any = info.file.response || { result: '' };
        await submitData(resp?.result?.accessUrl || '');
    }
};
</script>
