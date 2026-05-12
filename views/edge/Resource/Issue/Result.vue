<template>
    <a-modal
        open
        :title="$t('Resource.Result.400159-0')"
        :width="900"
        @ok="emit('close')"
        @cancel="emit('close')"
    >
        <a-row>
            <a-col :span="8">
                <div>{{ $t('Resource.Result.400159-1') }}{{ count }}</div>
                <div>
                    {{ $t('Resource.Result.400159-2') }}{{ countErr }}
                    <a-button @click="_download(errMessage || '', $t('Resource.Result.400159-3'))" v-if="errMessage.length" type="link"
                        >{{ $t('Import.index.400157-4') }}</a-button
                    >
                </div>
            </a-col>
            <a-col :span="8">{{ $t('Resource.Result.400159-4') }}{{ list.length || 0 }}</a-col>
            <a-col :span="8">{{ $t('Resource.Result.400159-5') }}{{ countErr + count }}</a-col>
        </a-row>
        <div v-if="!flag">
            <a-textarea :rows="10" :value="JSON.stringify(errMessage)" />
        </div>
    </a-modal>
</template>

<script setup lang="ts">
import { LocalStore} from "@jetlinks-web/utils";
import {TOKEN_KEY, TOKEN_KEY_URL} from '@jetlinks-web/constants';
import dayjs from 'dayjs';
import { EventSourcePolyfill } from 'event-source-polyfill';
import {getBaseApi} from "@jetlinks-web-core/utils";
import {useI18n} from 'vue-i18n';

const {t: $t} = useI18n();

const props = defineProps({
    data: {
        type: Object,
        default: () => {},
    },
    list: {
        type: Array,
        default: () => [],
    },
});
const emit = defineEmits(['close']);

const count = ref<number>(0);
const countErr = ref<number>(0);
const flag = ref<boolean>(true);
const errMessage = ref<any[]>([]);

const getData = () => {
    let dt = 0;
    let et = 0;
    const errMessages: any[] = [];
    const _terms = {
        deviceId: (props.list || []).map((item: any) => item?.id),
        params: JSON.stringify({
            name: props.data.name,
            targetId: props.data.targetId,
            targetType: props.data.targetType,
            category: props.data.category,
            metadata: props.data?.metadata
        }),
    };
    const url = new URLSearchParams();
    Object.keys(_terms).forEach((key) => {
        if (Array.isArray(_terms[key]) && _terms[key].length) {
            _terms[key].map((item: string) => {
                url.append(key, item);
            });
        } else {
            url.append(key, _terms[key]);
        }
    });
    const source = new EventSourcePolyfill(
        `${getBaseApi()}/edge/operations/entity-template-save/invoke/_batch?${TOKEN_KEY_URL}=${LocalStore.get(
            TOKEN_KEY,
        )}&${url}`,
    );
    source.onmessage = (e: any) => {
        const res = JSON.parse(e.data);
        if (res.successful) {
            dt += 1;
            count.value = dt;
        } else {
            et += 1;
            countErr.value = et;
            flag.value = false;
            if (errMessages.length < 5) {
                errMessages.push({ ...res });
                errMessage.value = [...errMessages];
            }
        }
    };
    source.onerror = () => {
        source.close();
    };
    source.onopen = () => {};
};

const _download = (record: Record<string, any>, fileName: string, format?: string) => {
  // 创建隐藏的可下载链接
  const ghostLink = document.createElement('a');
  ghostLink.download = `${fileName ? '' : record?.name}${fileName}_${dayjs(new Date()).format(
    format || 'YYYY_MM_DD',
  )}.txt`;
  ghostLink.style.display = 'none';
  //字符串内容转成Blob地址
  const blob = new Blob([JSON.stringify(record)]);
  ghostLink.href = URL.createObjectURL(blob);
  //触发点击
  document.body.appendChild(ghostLink);
  ghostLink.click();
  //移除
  document.body.removeChild(ghostLink);
}

watch(
    () => props.data.id,
    (newId) => {
        if(newId){
            getData()
        }
    },
    {
        immediate: true,
    },
);
</script>

<style lang="less" scoped>
</style>
