<template>
    <a-form class="table" ref="formTableRef" :model="modelRef">
        <a-table
            v-if="modelRef.dataSource.length !== 0"
            :dataSource="modelRef.dataSource"
            :columns="FormTableColumns"
            :scroll="{ y: 580 }"
            :pagination="false"
        >
            <template #headerCell="{ column }">
                <template
                    v-if="column.key === 'nodeId' || column.key === 'action'"
                >
                    <span> {{ column.title }} </span>
                </template>
                <template v-else>
                    <span> {{ column.title }} </span>
                    <span style="margin-left: 5px; color: red">*</span>
                </template>
            </template>
            <template #bodyCell="{ column: { dataIndex }, record, index }">
                <template v-if="dataIndex === 'name'">
                    <a-form-item
                        :name="['dataSource', index, 'name']"
                        :rules="[
                            {
                                required: true,
                                message: $t('Scan.Table.400147-0'),
                            },
                            {
                                validator: checkLength,
                                trigger: 'change',
                            },
                        ]"
                    >
                        <a-input
                            v-model:value="record[dataIndex]"
                            :placeholder="$t('Scan.Table.400147-0')"
                            allowClear
                        ></a-input>
                    </a-form-item>
                </template>
                <template v-if="dataIndex === 'id'">
                    <a-form-item
                        v-show="false"
                        :name="['dataSource', index, 'id']"
                    >
                        <a-input
                            v-model:value="record[dataIndex]"
                            disabled
                            :bordered="false"
                        ></a-input>
                    </a-form-item>
                    <div
                        style="
                            margin: -24px 0 0 10px;
                            overflow: hidden;
                            white-space: nowrap;
                            text-overflow: ellipsis;
                        "
                    >
                        <a-tooltip>
                            <template #title>{{ record[dataIndex] }}</template>
                            {{ record[dataIndex] }}
                        </a-tooltip>
                    </div>
                </template>
                <template v-if="dataIndex === 'accessModes'">
                    <a-form-item
                        class="form-item"
                        :name="['dataSource', index, 'accessModes', 'value']"
                        :rules="[
                            {
                                required: true,
                                message: $t('Scan.Table.400147-1'),
                            },
                        ]"
                    >
                        <a-select
                            style="width: 75%"
                            v-model:value="record[dataIndex].value"
                            :placeholder="$t('Scan.Table.400147-1')"
                            allowClear
                            mode="multiple"
                            :filter-option="filterOption"
                            :options="[
                                { label: $t('Scan.Table.400147-2'), value: 'read' },
                                { label: $t('Scan.Table.400147-3'), value: 'write' },
                                { label: $t('Scan.Table.400147-4'), value: 'subscribe' },
                            ]"
                            :disabled="index !== 0 && record[dataIndex].check"
                            @change="changeValue(index, dataIndex)"
                        >
                        </a-select>
                        <a-checkbox
                            style="margin-left: 5px"
                            v-if="index !== 0"
                            v-model:checked="record[dataIndex].check"
                            @click="changeCheckbox(index, dataIndex)"
                            >{{ $t('Scan.Table.400147-5') }}</a-checkbox
                        >
                    </a-form-item>
                </template>
                <template v-if="dataIndex === 'interval'">
                    <a-form-item
                        class="form-item"
                        :name="[
                            'dataSource',
                            index,
                            'configuration',
                            'interval',
                            'value',
                        ]"
                        :rules="[
                            {
                                required: true,
                                message: $t('Scan.Table.400147-0'),
                            },
                            {
                                pattern: regOnlyNumber,
                                message: $t('Scan.Table.400147-6'),
                            },
                        ]"
                    >
                        <a-input-number
                            style="width: 60%"
                            v-model:value="
                                record.configuration[dataIndex].value
                            "
                            :placeholder="$t('Scan.Table.400147-0')"
                            allowClear
                            addon-after="ms"
                            :max="2147483647"
                            :min="0"
                            :disabled="
                                index !== 0 &&
                                record.configuration[dataIndex].check
                            "
                            @blur="changeValue(index, dataIndex)"
                        ></a-input-number>
                        <a-checkbox
                            style="margin-left: 5px; margin-top: 5px"
                            v-show="index !== 0"
                            v-model:checked="
                                record.configuration[dataIndex].check
                            "
                            @click="changeCheckbox(index, dataIndex)"
                            >{{ $t('Scan.Table.400147-5') }}</a-checkbox
                        >
                    </a-form-item>
                </template>
                <template v-if="dataIndex === 'features'">
                    <a-form-item
                        class="form-item"
                        :name="['dataSource', index, 'features', 'value']"
                        :rules="[
                            {
                                required: true,
                                message: $t('Scan.Table.400147-1'),
                            },
                        ]"
                    >
                        <a-select
                            style="width: 40%"
                            v-model:value="record[dataIndex].value"
                            :placeholder="$t('Scan.Table.400147-1')"
                            allowClear
                            :filter-option="filterOption"
                            :options="[
                                {
                                    label: $t('Scan.Table.400147-7'),
                                    value: true,
                                },
                                {
                                    label: $t('Scan.Table.400147-8'),
                                    value: false,
                                },
                            ]"
                            :disabled="index !== 0 && record[dataIndex].check"
                            @change="changeValue(index, dataIndex)"
                        >
                        </a-select>

                        <a-checkbox
                            style="margin-left: 5px"
                            v-show="index !== 0"
                            v-model:checked="record[dataIndex].check"
                            @click="changeCheckbox(index, dataIndex)"
                            >{{ $t('Scan.Table.400147-5') }}</a-checkbox
                        >
                    </a-form-item>
                </template>

                <template v-if="dataIndex === 'action'">
                    <j-permission-button
                        :tooltip="{
                            title: $t('Scan.Table.400147-9'),
                        }"
                        :popConfirm="{
                            title: $t('Scan.Table.400147-10'),
                            onConfirm: () => clickDelete(record.id),
                        }"
                    >
                        <a style="color: red"><AIcon type="DeleteOutlined" /></a
                    ></j-permission-button>
                </template>
            </template>
        </a-table>
        <a-empty v-else style="margin-top: 10%" />
    </a-form>
</template>

<script lang="ts" setup>
import { FormTableColumns, regOnlyNumber } from '../../data';
import { Rule } from 'ant-design-vue/lib/form';
import { useI18n } from 'vue-i18n';

const { t: $t } = useI18n();
const props = defineProps({
    data: {
        type: Array,
        default: () => [],
    },
});
const emits = defineEmits(['change']);

const formTableRef = ref();
const defaultType = ['accessModes', 'interval', 'features'];
const modelRef: any = reactive({
    dataSource: [],
});

const checkLength = (_rule: Rule, value: string): Promise<any> =>
    new Promise(async (resolve, reject) => {
        if (value) {
            return String(value).length > 64
                ? reject($t('Scan.Table.400147-11'))
                : resolve('');
        } else {
            resolve('');
        }
    });

const filterOption = (input: string, option: any) => {
    return option.label.toLowerCase().indexOf(input.toLowerCase()) >= 0;
};

const clickDelete = (value: string) => {
    emits('change', value);

    // 删除时需要做同上操作 todo
};

const getTargetData = (index: number, type: string) => {
    const { dataSource } = modelRef;
    const Interval = type === 'interval';
    return !Interval
        ? dataSource[index][type]
        : dataSource[index].configuration[type];
};

const changeValue = (index: number, type: string) => {
    const { dataSource } = modelRef;
    const originData = getTargetData(index, type);
    for (let i = index + 1; i < dataSource.length; i++) {
        const targetType = getTargetData(i, type);
        if (!targetType.check) return;
        targetType.value = originData.value;
    }
};

const changeCheckbox = async (index: number, type: string) => {
    //Dom未更新完成，需要用 setTimeout 或者 await nextTick() 处理
    setTimeout(() => {
        let startIndex = 0;
        const { dataSource } = modelRef;
        const currentCheck = getTargetData(index, type).check;
        if (!currentCheck) return;
        for (let i = index; i >= 0; i--) {
            const preDataCheck = getTargetData(i, type).check;
            if (!preDataCheck) {
                startIndex = i;
                break;
            }
        }
        const originData = getTargetData(startIndex, type);
        for (let i = startIndex; i < dataSource.length - 1; i++) {
            const targetType = getTargetData(i + 1, type);
            if (!targetType.check) return;
            targetType.value = originData.value;
        }
    }, 0);
};

const validate = () => {
    return new Promise((res, rej) => {
        formTableRef.value
            .validate()
            .then(() => {
                res(modelRef.dataSource);
            })
            .catch((err: any) => {
                rej(err);
            });
    });
};
defineExpose({
    validate,
});
watch(
    () => props.data,
    (value, preValue) => {
        modelRef.dataSource = value;
        // 有新增时同上数据
        const vlength = value.length,
            plength = preValue.length;
        if (plength !== 0 && plength < vlength) {
            defaultType.forEach((type) => {
                vlength === 2
                    ? changeValue(0, type)
                    : changeCheckbox(vlength - 1, type);
            });
        }
    },
    { deep: true },
);
</script>

<style lang="less" scoped>
.table {
    width: 100%;
    min-width: 600px;
    :deep(.ant-table-header) {
        .ant-table-cell {
            padding: 16px 5px;
        }
    }

    :deep(.ant-table-tbody) {
        .ant-table-cell {
            padding: 24px 0 0 0;
        }
        .ant-table-cell-fix-right-first {
            padding: 0 0 0 10px;
        }
    }
    :deep(.ant-pagination) {
        display: none;
    }
}

.form-item {
    display: flex;
}
</style>
