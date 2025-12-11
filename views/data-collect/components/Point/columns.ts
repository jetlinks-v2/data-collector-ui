import i18n from '@jetlinks-web-core/locales';

export const baseColumns = [
    {
        title: '点位名称(运行状态)',
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
                text: '点位名称(升序)',
                value: 'asc',
            },
            {
                text: '点位名称(降序)',
                value: 'desc',
            },
        ]
    },
    {
        title: '点位值',
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
        title: '更新时间',
        dataIndex: 'updateTime',
        key: 'updateTime',
        scopedSlots: true,
        width: 200,
        ellipsis: true,
        sortsList: [
            {
                text: '按更新时间倒序',
                value: 'desc',
            },
            {
                text: '按更新时间正序',
                value: 'asc',
            },
        ]
    },
    {
        title: '地址',
        dataIndex: 'address',
        key: 'address',
        scopedSlots: true,
        ellipsis: true,
    },
    {
        title: '访问类型',
        dataIndex: 'accessModes',
        key: 'accessModes',
        scopedSlots: true,
        width: 150,
        ellipsis: true,
    },
    {
        title: '采集频率',
        dataIndex: 'interval',
        key: 'interval',
        scopedSlots: true,
        ellipsis: true,
        sortsList: [
            {
                text: '由高到低',
                value: 'desc',
            },
            {
                text: '由低到高',
                value: 'asc',
            },
        ]
    },
    {
        title: i18n.global.t('Channel.index.290640-2'),
        dataIndex: 'description',
        key: 'description',
        ellipsis: true,
    }
]
