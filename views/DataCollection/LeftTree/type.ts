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