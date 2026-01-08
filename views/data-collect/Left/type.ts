export const colorMap = new Map();
colorMap.set('running', 'success');
colorMap.set('partialError', 'warning');
colorMap.set('partError', 'warning'); // 部分错误
colorMap.set('failed', 'error');
colorMap.set('allError', 'error'); // 全部错误
colorMap.set('stopped', 'default');
colorMap.set('processing', '#cccccc');
colorMap.set('enabled', 'processing');
colorMap.set('disabled', 'error');


export const updateStatus = {
  disabled: {
      state: 'enabled',
      runningState: 'running',
  },
  enabled: {
      state: 'disabled',
      runningState: 'stopped',
  },
};

type state = {
  text: string;
  value: string;
}

export type ChannelEntity = {
  id?: string;
  name?: string;
  configuration?: Record<string, any>;
  collectorNumber?: number;
  provider?: string;
  runningState?: state;
  state?: state;
  description?: string;
  children?: CollectorEntity[];
}

export type CollectorEntity = {
  id?: string;
  name?: string;
  channelName?: string;
  channelId?: string;
  configuration?: Record<string, any>;
  pointNumber?: number;
  provider?: string;
  runningState?: state;
  state?: state;
  description?: string;
}
