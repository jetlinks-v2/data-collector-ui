import type { BadgeProps } from 'ant-design-vue'
export const COLLECTOR_TYPE = 'data-collector-type'
export const COLLECTOR_DATA = 'data-collector-data'
export const DATA_COLLECTOR_SAVE_TYPE = 'collector'
export const DATA_COLLECTOR_CONFIG_TYPE = 'data-collector-config-type' // 是否需要立即保存
export const FOLD_TREE = 'fold-tree'

export const PLUGIN_DETAIL_SAVE_EVENTS = 'plugin-detail-save-events'

export const REFRESH_HANDLER = 'refresh-handler'

// 通道状态
export const ChannelState: Record<string, NonNullable<BadgeProps['status']>> = {
    running: 'success',
    disabled: 'error',
    partialError: 'processing',
    failed: 'warning',
    stopped: 'default',
};

export const getState = (record: Partial<Record<string, any>>) =>
    record?.state?.value === 'disabled'
        ? record.state
        : record?.effectiveRunningState ?? record?.runningState ?? {};
