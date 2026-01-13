import i18n from '@jetlinks-web-core/locales';

export const baseColumns = [
    {
        title: i18n.global.t('DataCollect.columns.290651-0'),
        name: i18n.global.t('DataCollect.columns.290651-1'),
        dataIndex: 'name',
        key: 'name',
        ellipsis: true,
        fixed: 'left',
        scopedSlots: true,
        width: 200,
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
        title: i18n.global.t('DataCollect.columns.290651-4'),
        dataIndex: 'value',
        key: 'value',
        ellipsis: true,
        scopedSlots: true,
        resizable: true,
        width: 150,
        minWidth: 150,
        maxWidth: 250,
    },
    {
        title: i18n.global.t('DataCollect.columns.290651-5'),
        dataIndex: 'updateTime',
        key: 'updateTime',
        scopedSlots: true,
        width: 200,
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
        ellipsis: true,
    },
    {
        title: i18n.global.t('DataCollect.columns.290651-9'),
        dataIndex: 'accessModes',
        key: 'accessModes',
        scopedSlots: true,
        width: 150,
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
        width: 100,
        search: {
            type: 'string'
        },
    }
]
