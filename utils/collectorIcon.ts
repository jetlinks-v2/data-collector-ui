import modbusTcpIcon from '../assets/DataCollect/channel-modbus.png';
import modbusRtuIcon from '../assets/DataCollect/device-modbus.png';
import opcUaIcon from '../assets/DataCollect/channel-opcua.png';
import s7Icon from '../assets/DataCollect/s7.png';
import iec104Icon from '../assets/DataCollect/IEC104.png';
import bacnetIcon from '../assets/DataCollect/BACnet.png';
import gatewayIcon from '../assets/DataCollect/gateway.png';

const providerIcons = new Map<string, string>([
    ['modbus_tcp', modbusTcpIcon],
    ['modbus_rtu', modbusRtuIcon],
    ['opc_ua', opcUaIcon],
    ['s7', s7Icon],
    ['snap7', s7Icon],
    ['iec104', iec104Icon],
    ['bacnetip', bacnetIcon],
    ['collector_gateway', gatewayIcon],
]);

// 内置采集协议使用随模块打包的图片，大小写不同的 ID 共用映射；扩展协议保留原资源路径。
export const getCollectorProviderIcon = (provider: string = ''): string =>
    providerIcons.get(provider.toLowerCase()) ?? `/protocol/${provider}/icon.png`;
