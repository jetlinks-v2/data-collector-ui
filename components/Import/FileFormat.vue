<template>
    <a-space align="end">
        <a-radio-group button-style="solid" v-model:value="modelValue.fileType" :placeholder="$t('Import.FileFormat.240355-0')">
            <a-radio-button value="xlsx">xlsx</a-radio-button>
            <a-radio-button value="csv">csv</a-radio-button>
        </a-radio-group>
        <a-checkbox v-model:checked="modelValue.autoDeploy">{{ $t('Import.FileFormat.240355-1') }}</a-checkbox>
    </a-space>
</template>

<script lang="ts" setup>
import { PropType } from 'vue'

type Props = {
    autoDeploy: boolean,
    fileType: 'xlsx' | 'csv'
}
type Emits = {
    (e: 'update:modelValue', data: Partial<Props>): void;
};
const emit = defineEmits<Emits>();

const props = defineProps({
    // 组件双向绑定的值
    modelValue: {
        type: Object as PropType<Props>,
        default: () => {
            return {
                fileType: 'xlsx',
                autoDeploy: false
            }
        }
    },
})

</script>