import i18n from '@/locales'

export const COLLECTOR_TYPE = Symbol('data-collector-type')
export const COLLECTOR_DATA = Symbol('data-collector-data')


// 通道状态
export const ChannelState = {
    running: 'success',
    disabled: 'error',
    partialError: 'processing',
    failed: 'warning',
    stopped: 'default',
};

// 获取通道状态
export const getState = (record: Partial<Record<string, any>>) => {
    if (record) {
        if (record?.state?.value === 'enabled') {
            return {...record?.runningState};
        } else {
            return {
                text: i18n.global.t('Channel.index.290640-7'),
                value: 'disabled',
            };
        }
    } else {
        return {};
    }
};

export const statusData = [
    {
        type: 'channel',
        title: i18n.global.t('Dashboard.tool.772451-0'),
        value: 0,
        total: 0,
    },
    {
        type: 'collector',
        title: i18n.global.t('Dashboard.tool.772451-2'),
        value: 0,
        total: 0,
    },
    {
        type: 'point',
        title: i18n.global.t('Dashboard.tool.772451-4'),
        value: 0,
        total: 0,
    }
];
