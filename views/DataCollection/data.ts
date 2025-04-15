import opcImage from '@collector/assets/DataCollect/device-opcua.png'
import modbusImage from '@collector/assets/DataCollect/channel-modbus.png'
import s7Image from '@collector/assets/DataCollect/s7.png'
import gatewayImage from '@collector/assets/DataCollect/gateway.png'
import iecImage from '@collector/assets/DataCollect/IEC104.png'
import i18n from '@/locales';

export const imgUrl = {
    opcImage:opcImage,
    modbusImage:modbusImage,
    s7Image:s7Image,
    gatewayImage:gatewayImage,
    iecImage:iecImage
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

export const getState = (record: any) => {
    const enabled = record?.state?.value === 'enabled';
    if (record) {
        return {
            value: enabled ? record?.runningState?.value : 'processing',
            text: enabled ? record?.runningState?.text : i18n.global.t('Collector.data.400141-0'),
        };
    } else {
        return {};
    }
};
