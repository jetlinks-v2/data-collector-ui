<template>
    <a-modal visible :title="$t('Import.index.4001420-0')" @cancel="emit('closeImport')" :width="800" :maskClosable="false">
        <div class="import-content">
            <div class="column">
                <p>{{ $t('Import.index.4001420-1') }}</p>
                <div class="import">
                    <a-upload-dragger v-model:fileList="fileList" name="file" :action="`${FileStaticPath}?options=tempFile`"
                        :headers="{
                            [TOKEN_KEY]: LocalStore.get(TOKEN_KEY),
                        }" :limit="1" :showUploadList="false" @change="uploadChange" :accept="['xlsx', 'xls', 'csv']"
                        :before-upload="beforeUpload">
                        <div class="dragger-box">
                            <AIcon class="icon" type="PlusCircleFilled" />
                            <span style="margin: 16px 0 8px 0">{{ $t('Import.index.4001420-2') }}</span>
                            <span>{{ $t('Import.index.4001420-3') }}</span>
                        </div>
                    </a-upload-dragger>
                </div>
            </div>
            <div class="importing-status" v-if="importStatus == 'importing'">
                <AIcon  type="LoadingOutlined" />
                {{ $t('Import.index.4001420-4') }}
            </div>
            <div class="column" v-if="importStatus != 'wait'">
                <p>
                    <AIcon style="color: #00a4ff"  type="CheckOutlined"/>{{ $t('Import.index.4001420-5') }}
                    {{ successNumber }}
                </p>
                <span v-if="failNumber">
                    <AIcon style="color: #e50012" type="CloseOutlined"/>{{ $t('Import.index.4001420-6') }}
                    {{ failNumber }}
                </span>
            </div>
            <div class="column">
                <p>{{ $t('Import.index.4001420-7') }}</p>
                    <div class="file-download">
                        <a-button @click="downTemplate('xlsx')"  class="btn">
                            {{ $t('Import.index.4001420-8') }}
                        </a-button>
                    </div>
            </div>
        </div>
        <template #footer>
            <a-button type="primary" @click="emit('closeImport')">{{ $t('Import.index.4001420-9') }}</a-button>
        </template>
    </a-modal>
</template>

<script lang="ts" setup>
import { FileStaticPath } from '@/api/comm';
// import { TOKEN_KEY, BASE_API_PATH } from '@/utils/variable';
import { BASE_API,TOKEN_KEY } from '@jetlinks-web/constants';
// import { LocalStore, onlyMessage } from '@/utils/comm';
import { onlyMessage,downloadFileByUrl,LocalStore,getToken } from '@jetlinks-web/utils'
import {
    exportTemplate
} from '../../../../../../api/data-collect/collector';
// import { downloadFileByUrl } from '@/utils/utils';
// import { getToken } from '@/utils/comm';
import { useI18n } from 'vue-i18n';

const { t: $t } = useI18n();
const props = defineProps({
    data: {
        type: Object,
        default: {}
    }
})
const emit = defineEmits(['closeImport'])
const fileList = ref()
type ImportStatus = 'wait' | 'importing' | 'done';
const importStatus = ref<ImportStatus>('wait'); //导入进度
const successNumber = ref(0); //导入成功数量
const failNumber = ref(0); //导入失败数量
const errorMessage = ref();
const detailFile = ref('')
const params = props?.data?.provider === 'COLLECTOR_GATEWAY' ? props?.data?.configuration?.collectorProvider : props?.data?.provider
const uploadChange = async (info: Record<string, any>) => {
    successNumber.value = 0;
    failNumber.value = 0;
    if (info.file.status === 'done') {
        const resp: any = info.file.response || { result: '' };
        handleImport(resp)
    }
};

const beforeUpload = (_file: any) => {
    const isCsv = _file.type === 'text/csv';
    const isXlsx =
        _file.type ===
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    if (!isCsv && !isXlsx) {
        onlyMessage($t('Import.index.4001420-10'), 'warning');
    }
    return isCsv || isXlsx;
};
const downTemplate = async (type: string) => {
    const res: any = await exportTemplate(<string>params, type);
    if (res) {
        const blob = new Blob([res], { type: type });
        const url = URL.createObjectURL(blob);
        downloadFileByUrl(url, $t('Import.index.4001420-11', [params]), type);
    }
};
const handleImport = async (file: any) => {
    let message: any = []
    importStatus.value = 'importing';
    let event: EventSource
    event = new EventSource(
        `${BASE_API}/data-collect/point/${props.data?.collectorId
        }/${params}/import?:X_Access_Token=${getToken()
        }&fileUrl=${file.result.accessUrl}`,
        { withCredentials: true },
    );
    event.onopen = (e) => {
        // pushMessage.value = []
        console.log('open');
    };
    event.onmessage = (e) => {
        console.log(e, '123')
        const result = JSON.parse(e.data);
        if (result.success) {
            successNumber.value++;
        } else {
            if (result.rowNumber !== -1) {
                failNumber.value++;
                message.push({
                    rowNumber: $t('Import.index.4001420-12', [result.rowNumber]),
                    message: result.message,
                    name: result.name
                })
                errorMessage.value = JSON.stringify(message)
            } else {
                detailFile.value = result.detailFile;
            }
        }
    };
    event.onerror = (err) => {
        importStatus.value = 'done';
        event.close();
    };
};


</script>
<style lang="less" scoped>
.import-content {
    width: 100%;
    flex-direction: column;
    display: flex;
    justify-content: center;
    align-items: flex-start;
    padding: 20px;

    .column {
        width: 100%;
        margin-bottom: 20px;
        position: relative;

        span {
            flex: 1;
        }

        .import {
            display: flex;
            justify-content: space-between;
        }
        .importing-status {
            align-items: center;
        }
        &.last {
            margin-top: 135px;
        }
    }

    :deep(.ant-upload-select) {
        width: 100% !important;
        display: block !important;
    }

    .ant-row {
        width: 100%;
    }

    :deep(.ant-btn) {
        width: 100%;
        background-color: transparent;

        &.ant-btn-link {
            width: auto;
        }
    }
}

.dragger-box {
    margin: 46px 0;
    display: flex;
    flex-direction: column;
    color: #666666;

    .icon {
        font-size: 30px;
        color: @primary-color;
    }
}

.file-download {
    display: flex;
    gap: 16px;

    .btn {
        border: none;
        background-color: #ECECF0;
        width: 152px;
        color: #666666;
    }
}</style>
