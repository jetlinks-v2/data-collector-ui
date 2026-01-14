import {remove as removeChannel, update as updateChannel} from "@data-collector-ui/api/data-collect/channel";
import {updateStatus} from "@data-collector-ui/views/data-collect/Left/type";
import {onlyMessage} from "@jetlinks-web/utils";
import {
    queryPointMetadata,
    remove as removeCollector,
    removePoint,
    update as updateCollector,
    updatePoint
} from "@data-collector-ui/api/data-collect/collector";
import i18n from "@jetlinks-web-core/locales";
import {queryCount} from "@data-collector-ui/api/data-collect/dashboard";

export const getChannelActions = (data: Partial<Record<string, any>>, onAction: (id: string, data: Partial<Record<string, any>>) => void): any[] => {
    const state = data.state?.value;
    const stateText = state === "enabled" ? i18n.global.t('Channel.index.290640-7') : i18n.global.t('Channel.index.290640-12');
    return [
        {
            text: i18n.global.t('DataCollect.index.400151-3'),
            icon: "PlusCircleOutlined",
            key: "add-collector",
            disabled: state === "disabled",
            tooltip: {
                title:
                    state === "disabled"
                        ? i18n.global.t('DataCollect.utils.400158-0')
                        : i18n.global.t('DataCollect.index.400151-3'),
            },
            onClick: () => {
                onAction('add-collector', data);
            },
        },
        {
            text: i18n.global.t('Channel.index.290640-13'),
            icon: "EditOutlined",
            key: "update",
            tooltip: {
                title: i18n.global.t('Channel.index.290640-13'),
            },
            onClick: () => {
                onAction('update', data);
            },
        },
        {
            text: stateText,
            icon: state === "disabled" ? "PlayCircleOutlined" : "StopOutlined",
            key: "action",
            tooltip: {
                title: stateText,
            },
            popConfirm: {
                title: `${i18n.global.t('Channel.index.290640-14', [stateText])}`,
                onConfirm: async () => {
                    const res = await updateChannel(data.id, updateStatus[state]);
                    if (res.success) {
                        onlyMessage(i18n.global.t('DataCollect.index.400150-28'), "success");
                        onAction('action', data);
                    }
                },
            },
        },
        {
            text: i18n.global.t('Channel.index.290640-16'),
            icon: "DeleteOutlined",
            key: "delete",
            tooltip: {
                title:
                    state === "enabled"
                        ? i18n.global.t('Channel.index.290640-17')
                        : i18n.global.t('Channel.index.290640-16'),
            },
            danger: true,
            disabled: data?.state?.value !== "disabled",
            popConfirm: {
                placement: "topRight",
                title: i18n.global.t('Channel.index.290640-18'),
                onConfirm: async () => {
                    const response = await removeChannel(data.id);
                    if (response.success) {
                        onlyMessage(i18n.global.t('DataCollect.index.400150-28'), "success");
                        onAction('delete', data);
                    }
                },
            },
        },
    ]
}

export const getCollectorActions = (data: Partial<Record<string, any>>, onAction: (id: string, data: Partial<Record<string, any>>) => void): any[] => {
    const state = data.state?.value;
    const runningState = data.runningState?.value;
    const stateText =
        state === "enabled"
            ? i18n.global.t('Channel.index.290640-7')
            : i18n.global.t('Channel.index.290640-12');
    return [
        {
            text: i18n.global.t('Channel.index.290640-13'),
            icon: "EditOutlined",
            key: "update",
            onClick: () => {
                onAction('update', data);
            },
        },
        {
            text: state === "disabled" ? stateText : stateText,
            icon:
                state === "disabled"
                    ? "PlayCircleOutlined"
                    : "StopOutlined",
            key: "action",
            disabled: runningState === 'stopped' &&
                state !== 'disabled',
            tooltip: {
                title: stateText
            },
            popConfirm: {
                title: `${i18n.global.t('Channel.index.290640-14', [stateText])}`,
                onConfirm: async () => {
                    const res = await updateCollector(data.id, {
                        state: state !== 'disabled' ? 'disabled' : 'enabled',
                        runningState: state !== 'disabled' ? 'stopped' : 'running',
                    });
                    if (res.success) {
                        onlyMessage(i18n.global.t('DataCollect.index.400150-28'), "success");
                        onAction('action', data);
                    }
                },
            },
        },
        {
            text: i18n.global.t('Channel.index.290640-16'),
            icon: "DeleteOutlined",
            key: "delete",
            tooltip: {
                title:
                    state === "enabled"
                        ? i18n.global.t('Tree.index.4001410-7')
                        : i18n.global.t('Channel.index.290640-16'),
            },
            danger: true,
            disabled: state !== 'disabled',
            popConfirm: {
                placement: "topRight",
                title: i18n.global.t('Tree.index.4001410-9'),
                onConfirm: async () => {
                    const response = await removeCollector(data.id);
                    if (response.success) {
                        onAction('delete', data);
                    }
                },
            },
        },
    ];
};

export const getPointActions = (data: Partial<Record<string, any>>, onAction: (id: string, data: Partial<Record<string, any>>) => void): any[] => {
    return [
        {
            text: i18n.global.t('Channel.index.290640-16'),
            icon: "DeleteOutlined",
            key: "delete",
            tooltip: {
                title: i18n.global.t('Channel.index.290640-16'),
            },
            danger: true,
            popConfirm: {
                placement: "topRight",
                title: i18n.global.t('DataCollect.utils.400158-2'),
                onConfirm: async () => {
                    const response = await removePoint(data.id);
                    if (response.success) {
                        onAction('delete', data);
                    }
                },
            },
        },
    ];
};

// 查询点位,采集器,通道的数量方法
export const CollectorTypeList = [
    {
        type: 'channel',
        title: i18n.global.t('Dashboard.tool.772451-0'),
        text: i18n.global.t('Dashboard.tool.772451-1'),
        value: 0,
        total: 0,
    },
    {
        type: 'collector',
        title: i18n.global.t('Dashboard.tool.772451-2'),
        text: i18n.global.t('Dashboard.tool.772451-3'),
        value: 0,
        total: 0,
    },
    {
        type: 'point',
        title: i18n.global.t('Dashboard.tool.772451-4'),
        text: i18n.global.t('DataCollect.utils.400158-1'),
        value: 0,
        total: 0,
    }
];

export const getCountList = async (_type, id, flag) => {
    const _terms = []
    let typeList = []
    if (_type === 'all') {
        typeList = CollectorTypeList
    }
    if (_type === 'channel') {
        typeList = CollectorTypeList.filter(i => i.type !== 'channel')
        _terms.push({
            column: 'channelId',
            termType: 'eq',
            value: id,
        })
    }
    if (_type === 'collector') {
        typeList = CollectorTypeList.filter(i => i.type === 'point')
        _terms.push({
            column: 'collectorId',
            termType: 'eq',
            value: id,
        })
    }
    const tasks = typeList.map(async (item) => {
        const [totalRes, stopRes] = await Promise.all([
            queryCount(item.type, {terms: _terms}),
            flag
                ? queryCount(item.type, {
                    terms: [
                        ..._terms,
                        {
                            column: 'runningState',
                            termType: 'not',
                            value: 'running',
                            type: 'and'
                        }
                    ]
                })
                : Promise.resolve(null)
        ])

        return {
            ...item,
            total: totalRes?.result || 0,
            value: stopRes?.result || 0
        }
    })
    return Promise.all(tasks)
}

// 编辑通道信息, 然后保存
export const onChannelSave = async (id: string, data: any, onRefresh) => {
    const res = await updateChannel(id, {id, ...data});
    if (res.success) {
        onlyMessage(i18n.global.t('DataCollect.index.400150-28'));
        onRefresh?.()
    }
}
// 编辑采集器信息, 然后保存
export const onCollectorSave = async (id: string, data: any, onRefresh) => {
    const res = await updateCollector(id, {id, ...data});
    if (res.success) {
        onlyMessage(i18n.global.t('DataCollect.index.400150-28'));
        onRefresh?.()
    }
}
// 编辑点位信息, 然后保存
export const onPointSave = async (id: string, data: any, onRefresh) => {
    const res = await updatePoint(id, {id, ...data});
    if (res.success) {
        onlyMessage(i18n.global.t('DataCollect.index.400150-28'));
        onRefresh?.()
    }
}

// 获取指定采集协议的点位配置属性信息
export const getPointMetadata = (provider: string, configuration: any = {}) => {
    return new Promise((resolve) => {
        queryPointMetadata(provider, configuration).then(resp => {
            if (resp.success) {
                resolve(resp.result)
            } else {
                resolve({})
            }
        })
    })
}

