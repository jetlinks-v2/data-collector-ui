import dayjs from 'dayjs';

export const getTimeByType = (type: string) => {
    switch (type) {
        case 'hour':
            return dayjs().subtract(1, 'hours');
        case 'week':
            return dayjs().subtract(6, 'days');
        case 'month':
            return dayjs().subtract(29, 'days');
        case 'year':
            return dayjs().subtract(365, 'days');
        default:
            return dayjs().startOf('day');
    }
};

export const defaultParams = {
    terms: [
        {
            column: 'runningState',
            termType: 'not',
            value: 'running',
        },
    ],
};

export const StatusColorEnum = {
    running: 'success',
    enabled: 'success',
    disabled: 'error',
    failed: 'warning',
    stopped: 'default',
};

export const updateStatus = {
    disabled: {
        state: 'enabled',
        runningState: 'running',
    },
    enabled: {
        state: 'disabled',
        runningState: 'stopped',
    },
}
