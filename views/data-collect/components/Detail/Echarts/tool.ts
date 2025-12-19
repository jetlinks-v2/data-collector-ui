const getParams = (dt: any) => {
    switch (dt.type) {
        case 'today':
            return {
                limit: 24,
                interval: '1h',
                format: 'YYYY-MM-dd HH:mm',
            };
        case 'week':
            return {
                limit: 7,
                interval: '1d',
                format: 'YYYY-MM-dd',
            };
        case 'hour':
            return {
                limit: 60,
                interval: '1m',
                format: 'YYYY-MM-dd HH:mm',
            };
        default:
            const time = dt.end - dt.start;
            const hour = 60 * 60 * 1000;
            const days = hour * 24;
            const year = days * 365;
            if (time <= hour) {
                return {
                    limit: Math.abs(Math.ceil(time / (60 * 60))),
                    interval: '1m',
                    format: 'YYYY-MM-dd HH:mm',
                };
            } else if (time > hour && time <= days) {
                return {
                    limit: Math.abs(Math.ceil(time / hour)),
                    interval: '1h',
                    format: 'YYYY-MM-dd HH:mm',
                };
            } else if (time > days && time <= days * 7) {
                return {
                    limit: Math.abs(Math.ceil(time / days)) + 1,
                    interval: '1d',
                    format: 'YYYY-MM-dd',
                };
            } else if (time > days * 90) {
                return {
                    limit: Math.abs(Math.ceil(time / days / 30)) + 1,
                    interval: '1M',
                    format: 'YYYY-MM-dd HH:mm',
                };
            } else {
                return {
                    limit: Math.abs(Math.ceil(time / days)) + 1,
                    interval: '1d',
                    format: 'YYYY-MM-dd',
                };
            }
    }
};

export const pointParams = (data: any) => {
    const obj = getParams(data)
    return [
        {
            dashboard: 'collector',
            object: 'pointData',
            measurement: 'quantity',
            dimension: 'agg',
            params: {
                limit: obj.limit,
                from: Number(data.start),
                to: Number(data.end),
                interval: obj.interval,
                format: obj.format
            },
        },
    ];
};
