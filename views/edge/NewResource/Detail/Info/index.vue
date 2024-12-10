<template>
    <a-descriptions bordered :labelStyle="{width: '200px'}">
        <template #title>
            <a-space>
                <span>{{ $t('Info.index.077901-0') }}</span>
                <a-button type="link" @click="visible = true">
                    <AIcon type="EditOutlined"></AIcon>
                </a-button>
            </a-space>
        </template>
        <a-descriptions-item label="ID">
            {{data.id}}
        </a-descriptions-item>
        <a-descriptions-item v-if="data.targetType === 'AiModel'" :label="$t('Info.index.077901-1')">
            {{data.properties?.fileName}}
        </a-descriptions-item>
        <a-descriptions-item v-else-if="data.targetType === 'PluginDriver'" :label="$t('Info.index.077901-1')">
            {{JSON.parse(data.metadata || '{}')?.filename}}
        </a-descriptions-item>
        <a-descriptions-item :label="$t('Info.index.077901-2')">
            {{dayjs(data.createTime).format('YYYY-MM-DD HH:mm:ss') || '--'}}
        </a-descriptions-item>
        <a-descriptions-item :label="$t('Info.index.077901-3')">
            {{data.creatorName || '--'}}
        </a-descriptions-item>
        <template v-if="data.targetType === 'entityTemplate:Collector'">
            <a-descriptions-item :label="$t('Info.index.077901-4')">
                {{metadata.category}}
            </a-descriptions-item>
        </template>
        <a-descriptions-item :label="$t('Info.index.077901-5')">
            {{metadata?.description || '--'}}
        </a-descriptions-item>
    </a-descriptions>
    <template v-if="data.targetType === 'entityTemplate:Collector'">
        <div class="title">
            <span>{{ $t('Info.index.077901-6') }}</span>
        </div>
        <Points :dataSource="typeof metadata.metadata === 'string' ? JSON.parse(metadata.metadata || '{}')?.points : metadata.metadata?.metadata" />
    </template>
    <Save v-if="visible" :data="data" @close="visible = false" @save="handleSave"/>
</template>

<script setup lang="ts">
import dayjs from "dayjs";
import {PropType} from "vue";
import Save from '../../Save/index.vue';
import Points from "./Points.vue";
import { useI18n } from 'vue-i18n';

const { t: $t } = useI18n();

const emit = defineEmits(['refresh'])
const props = defineProps({
    data: {
        type: Object as PropType<Record<string, any>>,
        default: () => ({}),
    }
})

const metadata = computed(() => {
    return JSON.parse(props.data.metadata || '{}')
})

const visible = ref(false);
const route = useRoute();

const handleSave = () => {
    visible.value = false;
    emit('refresh');
}
</script>

<style scoped lang="less">
.title {
    margin: 16px 0;
    font-size: 16px;
    font-weight: bold;
}
</style>