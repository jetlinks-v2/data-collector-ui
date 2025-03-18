import {useMenuStore} from "@/store/menu";
import i18n from "@/locales";

export const ContextName = Symbol('Batch-Task')
export const getContext = () => {
    return inject(ContextName, {})
}

export const taskDetailColumnMap = {
    'plugin': {
        label: i18n.global.t('Plugin.index.879212-3'),
        labelID: i18n.global.t('Plugin.index.879212-2'),
    },
    'AiModel': {
        label: i18n.global.t('AiModel.index.311326-3'),
        labelID: i18n.global.t('AiModel.index.311326-2'),
    },
    'CollectorTemplate': {
        label: i18n.global.t('CollectorTemplate.index.429253-3'),
        labelID: i18n.global.t('CollectorTemplate.index.429253-2'),
    },
}

export const BatchOperateOptions = [
    {
        icon: 'icon-anzhuangchajian',
        label: i18n.global.t('Batch.util.131400-0'),
        tip: i18n.global.t('Batch.util.131400-1'),
        value: 'plugin'
    },
    {
        icon: 'icon-bangdingzishebei',
        label: i18n.global.t('Batch.util.131400-2'),
        tip: i18n.global.t('Batch.util.131400-3'),
        value: 'device'
    },
    {
        icon: 'icon-rongqi',
        label: i18n.global.t('Batch.util.131400-4'),
        tip: i18n.global.t('Batch.util.131400-5'),
        value: 'ai-module'
    },
    {
        icon: 'icon-rongqi1',
        label: i18n.global.t('Batch.util.131400-6'),
        tip: i18n.global.t('Batch.util.131400-7'),
        value: 'device'
    },
    {
        icon: 'icon-xiafacaijiqimoban',
        label: i18n.global.t('Batch.util.131400-8'),
        tip: i18n.global.t('Batch.util.131400-9'),
        value: 'device'
    },
]

export const batchOperateValueMap = {
    'AiModel': 'resourceIssue',
    'AiResource': 'resourceIssue',
    'CollectorTemplate': 'resourceIssue',
}
export const useBatchOperateOptions = () => {
    const menuStore = useMenuStore()
    const batchOperateOptions = ref([
        {
            icon: 'icon-anzhuangchajian',
            label: i18n.global.t('Batch.util.131400-0'),
            tip: i18n.global.t('Batch.util.131400-1'),
            value: 'plugin',
            key: 'resourceIssue',
        },
        {
            icon: 'icon-bangdingzishebei',
            label: i18n.global.t('Batch.util.131400-2'),
            tip: i18n.global.t('Batch.util.131400-3'),
            value: 'device',
            key: 'bindDevice',
        },
    ])

    if (menuStore.hasMenu('edge/NewResource')) {
        batchOperateOptions.value.push(...[{
            icon: 'icon-rongqi',
            label: i18n.global.t('Batch.util.131400-4'),
            tip: i18n.global.t('Batch.util.131400-5'),
            value: 'AiModel',
            key: 'resourceIssue',
        },
            {
                icon: 'icon-xiafacaijiqimoban',
                label: i18n.global.t('Batch.util.131400-8'),
                tip: i18n.global.t('Batch.util.131400-9'),
                value: 'CollectorTemplate',
                key: 'resourceIssue',
            }
        ])
    }

    return {
        batchOperateOptions
    }
}

export const useTemplateRowSelection = () => {
    const selectedRowKeys = ref<Array<string>>([])
    const selectedRowMap = new Map();

    const handleSelect = (selected: boolean, array: any[]) => {
        const keys = new Set(selectedRowKeys.value)

        array.map((i) => {
            if (selected) {
                keys.add(i.id)
                selectedRowMap.set(i.id, i)
            } else {
                keys.delete(i.id)
                selectedRowMap.delete(i.id)
            }
        });

        selectedRowKeys.value = [...keys.values()]
    }
    const onSelectChange = (item: any, state: boolean) => {
        handleSelect(state, [item])
    };

    const selectAll = (selected: boolean, selectedRows: any[], changeRows: any) => {
        handleSelect(selected, changeRows)
    };

    const selectNone = () => {
        selectedRowKeys.value = [];
        selectedRowMap.clear();
    }

    return {
        selectedRowKeys,
        selectedRowMap,
        onSelectChange,
        selectAll,
        selectNone
    }
}
