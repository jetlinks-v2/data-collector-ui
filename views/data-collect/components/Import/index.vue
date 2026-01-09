<template>
  <a-modal open :title="title" :width="width" :mask-closable="false" @cancel="emits('close')">
    <slot name="alert">
      <div class="alert" v-if="message">
        <div>
          <AIcon type="InfoCircleFilled" style="color: #2F54EB; margin-right: 10px;"/>
        </div>
        <span v-html="message"></span>
      </div>
    </slot>
    <slot name="content"></slot>
    <template v-if="showUpload">
      <p>上传文件</p>
      <a-upload-dragger
          v-model:fileList="value"
          name="file"
          :maxCount="1"
          :showUploadList="false"
          @change="uploadChange"
          :accept="'.xlsx,.csv'"
          :before-upload="beforeUpload"
          :disabled="disabled"
      >
        <div class="draggable-box">
          <AIcon class="icon" type="PlusCircleFilled"/>
          <span style="margin: 16px 0 8px 0">点击上传文件</span>
          <span>格式：.xlsx, .csv</span>
        </div>
      </a-upload-dragger>
      <div class="result" v-if="loading">
        <div v-if="result.loading">
          <a-spin size="small" style="margin-right: 10px"/>
          正在导入
        </div>
        <div v-else>
          <AIcon style="color: #08e21e; margin-right: 10px;font-size: 16px;" type="CheckCircleOutlined"/>
          导入完成
        </div>
        <div>导入成功：{{ result.success }}</div>
        <div>
          导入失败：<span style="color: #ff595e">{{ result.error }}</span>
          <a
              v-if="result.errMessage && result.error > 0"
              style="margin-left: 20px"
              @click="downError"
          >
            下载
          </a>
        </div>
      </div>
      <div class="file-download" v-if="downloadUrlBuilder">
        <p>下载模板</p>
        <a-space>
          <a-button :loading="templateLoading" ghost type="primary" @click="downTemplate('xlsx')">
            模板格式.xlsx
          </a-button>
          <a-button :loading="templateLoading" ghost type="primary" @click="downTemplate('csv')">
            模板格式.csv
          </a-button>
        </a-space>
      </div>
    </template>

    <template #footer>
      <a-button :loading="result.loading" @click="emits('close')">关闭</a-button>
    </template>
  </a-modal>
</template>

<script setup name="BatchImport">
import {FileStaticPath} from "@jetlinks-web-core/api/comm";
import {downloadFileByUrl, getToken, onlyMessage} from "@jetlinks-web/utils";
import {useI18n} from "vue-i18n";
import { getUploadHeaders } from '@jetlinks-web-core/utils'
import { Observable } from "rxjs";
import { TOKEN_KEY } from "@jetlinks-web/constants";

const props = defineProps({
  beforeUpload: {
    type: Function,
    default: undefined
  },
  message: {
    type: String,
    default: '',
  },
  downloadUrlBuilder: {
    type: Function,
    default: undefined
  },
  templateName: {
    type: String,
    default: ''
  },
  request: {
    type: Function,
    default: undefined
  },
  width: {
    type: Number || String,
    default: 600
  },
  title: {
    type: String,
    default: '批量导入'
  },
  showUpload: {
    type: Boolean,
    default: true
  }
})
const emits = defineEmits(['close', 'save'])

const {t: $t} = useI18n();
const value = ref()
const loading = ref(false)
const result = reactive({
  loading: false,
  success: 0,
  error: 0,
  errMessage: undefined
})
const disabled = ref(false)
const templateLoading = ref(false)

const submitData = (file) => {
  let reader = null
  let isRead = false
  if (props.request) {
    result.loading = true
    result.success = 0
    result.error = 0
    result.errMessage = undefined
    const obs = new Observable(observer => {
      fetch(props.request(), {
        method: 'POST',
        body: file,
        headers: {
          [TOKEN_KEY]: getToken()
        }
      }).then(resp => {
        reader = resp.body?.getReader();
        const decoder = new TextDecoder();
        let data_buf = "";

        if (!reader) {
          observer.error(new Error('No readable stream available'));
          return;
        }

        const read = () => {

          if (!isRead) {
            reader.cancel()
            observer.complete();
            return
          }

          reader.read().then(({ done, value }) => {
            if (done) {
              if (data_buf.trim().length > 0) {
                try {
                  observer.next(JSON.parse(data_buf.trim()));
                } catch (e) {
                  observer.error(e);
                }
              }
              observer.complete();
              return;
            }

            const data = decoder.decode(value, { stream: true });
            data_buf += data;

            let lines = data_buf.split('\n');
            for (let i = 0; i < lines.length - 1; ++i) {
              const line = lines[i].trim();
              if (line.length > 0) {
                try {
                  observer.next(JSON.parse(line.startsWith('data:') ? line.slice(5) : line));
                } catch (e) {
                  observer.error(e);
                  reader.cancel();
                  return;
                }
              }
            }
            data_buf = lines[lines.length - 1];
            read();
          }).catch(err => observer.error(err));
        };
        isRead = true
        read();
      })
    }).subscribe({
      next: data => {// 处理数据
        console.log('Received data:', data)
        if(data.success){
          result.success = data.result.total
        }else{
          if(data.detailFile){
            result.errMessage = data.detailFile
          }else{
            result.error = data.result.total
          }
        }

        // if(data.success) {
        //   result.success = data.result.added + data.result.updated
        // } else if(!data.success && data.rowNumber !== -1) {
        //   result.error = data.result.total
        // } else if(!data.success && data.rowNumber === -1) {
        //   result.errMessage = data.detailFile
        // }
        // result.success
      },
      error: err => {
        console.error('Error:', err)
      },
      complete: () => {
        console.log('Stream complete')
        emits('save')
        disabled.value = false
        result.loading = false
      }
    })
  } else {
    disabled.value = false
  }
}

const beforeUpload = (_file, fileList) => {
  if (props.beforeUpload) {
    return props.beforeUpload(_file, fileList)
  }
  const isCsv = _file.type === 'text/csv';
  const isXlsx = _file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  if (!isCsv && !isXlsx) {
    onlyMessage('请上传.xlsx或.csv格式文件', 'warning');
    return
  }
  const formData = new FormData();
  formData.append('file', _file);
  loading.value = true
  submitData(formData)
  return false;
};

const downError = () => {
  window.open(result.errMessage);
};

const downTemplate = async (type) => {
  templateLoading.value = true;
  const resp = await props.downloadUrlBuilder(type).finally(() => {
    templateLoading.value = false;
  })
  if (resp) {
    const blob = new Blob([resp], {type: type});
    const url = URL.createObjectURL(blob);
    downloadFileByUrl(url, props.templateName || '导入模板', type);
  }
};
</script>

<style lang="less" scoped>
.alert {
  padding: 6px 12px;
  border: 1px solid #CCCCCC;
  border-radius: 4px;
  margin-bottom: 16px;
  background-color: #F5F5F5;
  display: flex;
  align-items: center;
}

.draggable-box {
  margin: 46px 0;
  display: flex;
  flex-direction: column;
  color: #666666;
  align-items: center;
  .icon {
    font-size: 30px;
    color: @primary-color;
  }
}

.result, .file-download {
  margin-top: 16px;
}
</style>
