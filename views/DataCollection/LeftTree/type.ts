import opcImage from '@collector/assets/DataCollect/device-opcua.png'
import modbusImage from '@collector/assets/DataCollect/device-modbus.png'
import s7Image from '@collector/assets/DataCollect/s7.png'
import gatewayImage from '@collector/assets/DataCollect/gateway.png'
import iecImage from '@collector/assets/DataCollect/IEC104.png'

export const protocolIcon = {
  'BACNetIp': 'icon-BACnetjieru',
  'snap7': 'icon-a-SiemensS7jieru',
  'iec104': 'icon-a-IEC104jieru',
  'MODBUS_RTU': 'icon-a-ModbusRtujieru',
  'MODBUS_TCP': 'icon-a-ModbusTCPjieru',
  'OPC_UA': 'icon-a-OPCUAjieru',
}

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

export const ImageMap = new Map();
ImageMap.set('OPC_UA', opcImage);
ImageMap.set('MODBUS_TCP', modbusImage);
ImageMap.set('MODBUS_RTU', modbusImage);
ImageMap.set('snap7', s7Image);
ImageMap.set('iec104', iecImage);
ImageMap.set('COLLECTOR_GATEWAY', gatewayImage);

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