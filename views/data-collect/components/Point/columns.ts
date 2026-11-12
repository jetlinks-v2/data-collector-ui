import i18n from '@jetlinks-web-core/locales';
import type { ConditionFilterField } from '@jetlinks-web-core/components/ConditionFilter'

export const baseColumns = [
    {
        title: i18n.global.t('DataCollect.columns.290651-0'),
        dataIndex: 'name',
        key: 'name',
        ellipsis: true,
        fixed: 'left',
        scopedSlots: true,
        width: 190,
        search: {
            type: 'string'
        },
        sortsList: [
            {
                text: i18n.global.t('DataCollect.columns.290651-2'),
                value: 'asc',
            },
            {
                text: i18n.global.t('DataCollect.columns.290651-3'),
                value: 'desc',
            },
        ]
    },
    {
        title: i18n.global.t('PointWorkspace.status'),
        dataIndex: 'runningState',
        key: 'runningState',
        scopedSlots: true,
        width: 100,
    },
    {
        title: i18n.global.t('PointWorkspace.realtimeValue'),
        dataIndex: 'value',
        key: 'value',
        ellipsis: true,
        scopedSlots: true,
        resizable: true,
        width: 200,
        minWidth: 180,
        maxWidth: 250,
    },
    {
        title: i18n.global.t('DataCollect.columns.290651-5'),
        dataIndex: 'modifyTime',
        key: 'modifyTime',
        scopedSlots: true,
        width: 180,
        ellipsis: true,
        search: {
            type: 'date'
        },
        sortsList: [
            {
                text: i18n.global.t('DataCollect.columns.290651-6'),
                value: 'desc',
            },
            {
                text: i18n.global.t('DataCollect.columns.290651-7'),
                value: 'asc',
            },
        ]
    },
    {
        title: i18n.global.t('DataCollect.columns.290651-8'),
        dataIndex: 'address',
        key: 'address',
        scopedSlots: true,
        width: 220,
        ellipsis: true,
    },
    {
        title: i18n.global.t('DataCollect.columns.290651-9'),
        dataIndex: 'accessModes',
        key: 'accessModes',
        scopedSlots: true,
        width: 130,
        ellipsis: true,
    },
    {
        title: i18n.global.t('DataCollect.columns.290651-10'),
        dataIndex: 'interval',
        key: 'interval',
        scopedSlots: true,
        ellipsis: true,
        width: 100,
        sortsList: [
            {
                text: i18n.global.t('DataCollect.columns.290651-11'),
                value: 'desc',
            },
            {
                text: i18n.global.t('DataCollect.columns.290651-12'),
                value: 'asc',
            },
        ]
    },
    {
        title: i18n.global.t('Channel.index.290640-2'),
        dataIndex: 'description',
        key: 'description',
        ellipsis: true,
        scopedSlots: true,
        width: 160,
        search: {
            type: 'string'
        },
    }
]

export const pointActionColumn = {
    title: i18n.global.t('Channel.index.290640-11'),
    dataIndex: 'action', key: 'action', fixed: 'right', width: 96, scopedSlots: true,
}
export const defaultPointColumns = () => [...baseColumns, pointActionColumn]
export const pointSearchFields: ConditionFilterField[] = [
    ...baseColumns.filter(column => column.search) as ConditionFilterField[],
    { title: i18n.global.t('PointWorkspace.identifier'), dataIndex: 'id', key: 'id', search: { type: 'string' } },
    { title: i18n.global.t('DataCollect.columns.290651-8'), dataIndex: 'address', key: 'address', search: { type: 'string' } },
]
