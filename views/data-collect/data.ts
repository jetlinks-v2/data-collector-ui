import i18n from '@jetlinks-web-core/locales'
export const COLLECTOR_TYPE = 'data-collector-type'
export const COLLECTOR_DATA = 'data-collector-data'
export const DATA_COLLECTOR_SAVE_TYPE = 'collector'
export const FOLD_TREE = 'fold-tree'

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
