<template>
    <a-form class="table" ref="formTableRef" :model="modelRef">
        <j-edit-table
            v-if="modelRef.dataSource.length !== 0"
            :dataSource="modelRef.dataSource"
            :columns="BacnetFormTableColumns"
            :height="580"
            :cellHeight="80"
            :disableMenu="false"
            :pagination="false"
            :serial="false"
        >
            <!-- <template #headerCell="{ column }">
                <template
                    v-if="column.key === 'nodeId' || column.key === 'action'"
                >
                    <span> {{ column.title }} </span>
                </template>
                <template v-else>
                    <span> {{ column.title }} </span>
                    <span style="margin-left: 5px; color: red">*</span>
                </template>
            </template> -->
            <!-- <template #bodyCell="{ column: { dataIndex }, record, index }"> -->
                <template #name="{record,index}">
                    <a-form-item
                        :name="['dataSource', index, 'name']"
                        :rules="[
                            {
                                required: true,
                                message: $t('ScanBacnet.Table.400143-0'),
                            },
                            {
                                validator: checkLength,
                                trigger: 'change',
                            },
                        ]"
                    >
                        <a-input
                            v-model:value="record.name"
                            :placeholder="$t('ScanBacnet.Table.400143-0')"
                            style="width: 80%"
                            allowClear
                        ></a-input>
                    </a-form-item>
                </template>
                <template #type="{record}">
                    <a-form-item>
                        {{ record.objectId?.type }}
                    </a-form-item>
                </template>
                <template #instanceNumber="{record}">
                    <a-form-item>
                        {{ record.objectId?.instanceNumber }}
                    </a-form-item>
                </template>
                <template #propertyId="{record,index}">
                    <a-form-item
                        :name="['dataSource', index, 'propertyId']"
                        :rules="{
                            required: true,
                            message: $t('ScanBacnet.Table.400143-1'),
                        }"
                    >
                        <PropertyId
                            v-model:value="record.propertyId"
                            :valueTypeList="valueTypeList"
                            :collectorId="collectorData.collectorId"
                            :objectId="record.objectId"
                            :checkedList="modelRef.dataSource"
                            :index="index"
                        ></PropertyId>
                    </a-form-item>
                </template>
                <template #valueType="{record,index}">
                    <a-form-item
                        :name="['dataSource', index, 'valueType']"
                        :rules="{
                            required: true,
                            message: $t('ScanBacnet.Table.400143-1'),
                        }"
                    >
                        <a-select
                            v-model:value="record.valueType"
                            style="width: 80%"
                            :placeholder="$t('ScanBacnet.Table.400143-1')"
                        >
                            <a-select-option
                                v-for="item in valueTypeList"
                                :key="item"
                                :value="item"
                                >{{ item }}</a-select-option
                            >
                        </a-select>
                    </a-form-item>
                </template>
                <template #accessModes="{record,index}">
                    <a-form-item
                        class="form-item"
                        :name="['dataSource', index, 'accessModes', 'value']"
                        :rules="[
                            {
                                required: true,
                                message: $t('ScanBacnet.Table.400143-1'),
                            },
                        ]"
                    >
                        <a-select
                            style="width: 72%"
                            v-model:value="record.accessModes.value"
                            :placeholder="$t('ScanBacnet.Table.400143-1')"
                            allowClear
                            mode="multiple"
                            :filter-option="filterOption"
                            :options="[
                                { label: $t('ScanBacnet.Table.400143-2'), value: 'read' },
                                { label: $t('ScanBacnet.Table.400143-3'), value: 'write' },
                                { label: $t('ScanBacnet.Table.400143-4'), value: 'subscribe' },
                            ]"
                            :disabled="index !== 0 && record.accessModes.check"
                            @change="changeValue(index, 'accessModes')"
                        >
                        </a-select>
                        <a-checkbox
                            style="margin-left: 5px"
                            v-if="index !== 0"
                            v-model:checked="record.accessModes.check"
                            @click="changeCheckbox(index, 'accessModes')"
                            >{{ $t('ScanBacnet.Table.400143-5') }}</a-checkbox
                        >
                    </a-form-item>
                </template>
                <template #interval="{record,index}">
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
                                message: $t('ScanBacnet.Table.400143-0'),
                            },
                            {
                                pattern: regOnlyNumber,
                                message:  $t('ScanBacnet.Table.400143-6'),
                            },
                        ]"
                    >
                        <a-input-number
                            style="width: 60%"
                            v-model:value="
                                record.configuration.interval.value
                            "
                            :placeholder="$t('ScanBacnet.Table.400143-0')"
                            allowClear
                            addon-after="ms"
                            :max="2147483647"
                            :min="0"
                            :disabled="
                                index !== 0 &&
                                record.configuration.interval.check
                            "
                            @blur="changeValue(index, 'interval')"
                        ></a-input-number>
                        <a-checkbox
                            style="margin-left: 5px; margin-top: 5px"
                            v-show="index !== 0"
                            v-model:checked="
                                record.configuration.interval.check
                            "
                            @click="changeCheckbox(index, 'interval')"
                            >{{ $t('ScanBacnet.Table.400143-5') }}</a-checkbox
                        >
                    </a-form-item>
                </template>
                <template #features="{record,index}">
                    <a-form-item
                        class="form-item"
                        :name="['dataSource', index, 'features', 'value']"
                        :rules="[
                            {
                                required: true,
                                message: $t('ScanBacnet.Table.400143-1'),
                            },
                        ]"
                    >
                        <a-select
                            style="width: 45%"
                            v-model:value="record.features.value"
                            :placeholder="$t('ScanBacnet.Table.400143-1')"
                            allowClear
                            :filter-option="filterOption"
                            :options="[
                                {
                                    label: $t('ScanBacnet.Table.400143-7'),
                                    value: true,
                                },
                                {
                                    label: $t('ScanBacnet.Table.400143-8'),
                                    value: false,
                                },
                            ]"
                            :disabled="index !== 0 && record.features.check"
                            @change="changeValue(index, 'features')"
                        >
                        </a-select>
                        <a-checkbox
                            style="margin-left: 5px"
                            v-show="index !== 0"
                            v-model:checked="record.features.check"
                            @click="changeCheckbox(index, 'features')"
                            >{{ $t('ScanBacnet.Table.400143-5') }}</a-checkbox
                        >
                    </a-form-item>
                </template>

                <template #action="{record,index}">
                    <j-permission-button
                        type="text"
                        :tooltip="{
                            title: $t('ScanBacnet.Table.400143-9'),
                        }"
                        :popConfirm="{
                            title: $t('ScanBacnet.Table.400143-10'),
                            onConfirm: () => clickDelete(record.nodeId, index),
                        }"
                        ><a style="color: red"
                            ><AIcon type="DeleteOutlined" /></a
                    ></j-permission-button>
                </template>
            <!-- </template> -->
        </j-edit-table>
        <a-empty v-else style="margin-top: 10%" />
    </a-form>
</template>

<script lang="ts" setup>
import { getBacnetValueType  } from '../../../../../api/data-collect/collector';
import { BacnetFormTableColumns, regOnlyNumber } from '../../data';
import { Rule } from 'ant-design-vue/lib/form';
import PropertyId from './PropertyId.vue';
// import {
//   EditTable
// } from '@/components/Metadata/Table'
import { useI18n } from 'vue-i18n';

const { t: $t } = useI18n();

const props = defineProps({
    data: {
        type: Array,
        default: () => [],
    },
    collectorData: {
        type: Object,
        default: () => {},
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
                ? reject($t('ScanBacnet.Table.400143-11'))
                : resolve('');
        } else {
            resolve('');
        }
    });

const filterOption = (input: string, option: any) => {
    return option.label.toLowerCase().indexOf(input.toLowerCase()) >= 0;
};

const clickDelete = (value: string, index: number) => {
    emits('change', value, index);

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

const valueTypeList = ref([]);
const getValueTypeData = async () => {
    const res: any = await getBacnetValueType();
    if (res.success) {
        valueTypeList.value = res.result;
    }
};

getValueTypeData();

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
    () => props.data.length,
    (vlength:number, plength:number) => {
        const value = props.data
        modelRef.dataSource = value;
        console.log(vlength,plength)
        // 有新增时同上数据
        // const vlength = value.length,
        //     plength = preValue.length;
        if (plength !== 0 && plength < vlength) {
            defaultType.forEach((type) => {
                vlength === 2
                    ? changeValue(0, type)
                    : changeCheckbox(vlength - 1, type);
            });
        }else if(plength === 0 && vlength > 1){
            defaultType.forEach((type)=>{
                changeValue(0,type)
            })
        }
    },
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
:deep(.ant-form-item){
    margin: 0;
}
:deep(.body-cell-box){
    padding: 0
}
</style>
