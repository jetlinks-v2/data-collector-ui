import i18n from '@jetlinks-web-core/locales'
import opcImage from '@data-collector-ui/assets/DataCollect/device-opcua.png'
import modbusImage from '@data-collector-ui/assets/DataCollect/channel-modbus.png'
import s7Image from '@data-collector-ui/assets/DataCollect/s7.png'
import gatewayImage from '@data-collector-ui/assets/DataCollect/gateway.png'
import iecImage from '@data-collector-ui/assets/DataCollect/IEC104.png'
import protocolImage from "@data-collector-ui/assets/DataCollect/protocol.png";

export const pointImgUrl = {
    opcImage: opcImage,
    modbusImage: modbusImage,
    s7Image: s7Image,
    gatewayImage: gatewayImage,
    iecImage: iecImage,
    protocolImage: protocolImage,
}

export const COLLECTOR_TYPE = Symbol('data-collector-type')
export const COLLECTOR_DATA = Symbol('data-collector-data')
export const DATA_COLLECTOR_SAVE_TYPE = Symbol('plugin-form')
export const FOLD_TREE = Symbol('fold-tree')

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
