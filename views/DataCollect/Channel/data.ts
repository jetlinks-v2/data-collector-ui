import { validateField } from '../../../api/data-collect/channel';
import { FormDataType } from './type.d';
import type { Rule } from 'ant-design-vue/lib/form';
import opcImage from '../../../assets/DataCollect/device-opcua.png'
import modbusImage from '../../../assets/DataCollect/channel-modbus.png'
import s7Image from '../../../assets/DataCollect/s7.png'
import gatewayImage from '../../../assets/DataCollect/gateway.png'
import iecImage from '../../../assets/DataCollect/IEC104.png'
import i18n from '@/locales'

export const FormState: FormDataType = {
    name: '',
    provider: undefined,
    configuration: {
        host: '',
        port: '502',
        endpoint: '',
        securityPolicy: 'None',
        securityMode: undefined,
        certId: undefined,
        authType: 'anonymous',
        username: '',
        password: '',
        deviceId: undefined,
        deviceName: undefined,
        connect:false,
        instanceNumber: undefined,
        overIp: {
            localBindAddress: '0.0.0.0',
            port: 47808
        }
    },
    description: '',
};

export const StatusColorEnum = {
    running: 'success',
    disabled: 'error',
    partialError: 'processing',
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
};

export const regOnlyNumber = new RegExp(/^\d+$/);

export const regIP = new RegExp(
    /^([0-9]|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.([0-9]|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.([0-9]|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.([0-9]|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])$/,
);
export const regIPv6 = new RegExp(
    /^\s*((([0-9A-Fa-f]{1,4}:){7}([0-9A-Fa-f]{1,4}|:))|(([0-9A-Fa-f]{1,4}:){6}(:[0-9A-Fa-f]{1,4}|((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){5}(((:[0-9A-Fa-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){4}(((:[0-9A-Fa-f]{1,4}){1,3})|((:[0-9A-Fa-f]{1,4})?:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){3}(((:[0-9A-Fa-f]{1,4}){1,4})|((:[0-9A-Fa-f]{1,4}){0,2}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){2}(((:[0-9A-Fa-f]{1,4}){1,5})|((:[0-9A-Fa-f]{1,4}){0,3}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){1}(((:[0-9A-Fa-f]{1,4}){1,6})|((:[0-9A-Fa-f]{1,4}){0,4}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(:(((:[0-9A-Fa-f]{1,4}){1,7})|((:[0-9A-Fa-f]{1,4}){0,5}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))(%.+)?\s*$/,
);
export const regDomain = new RegExp(
    /([0-9a-z-]{2,}\.[0-9a-z-]{2,3}\.[0-9a-z-]{2,3}|[0-9a-z-]{2,}\.[0-9a-z-]{2,3})$/i,
);
export const checkEndpoint = (_rule: Rule, value: string): Promise<any> =>
    new Promise(async (resolve, reject) => {
        if(!value) return resolve('');
        const res: any = await validateField(value);
        return res.result.passed ? resolve('') : reject(res.result.reason);
    });

export const checkHost = (_rule: Rule, value: string): Promise<any> =>
    new Promise(async (resolve, reject) => {
        if(!value) return resolve('');
        if(!(regIP.test(value) || regIPv6.test(value) || regDomain.test(value))) {
            return reject(i18n.global.t('Channel.data.290641-0'))
        }
        return resolve('')
    });
export const FormValidate = {
    name: [
        { required: true, message: i18n.global.t('Channel.data.290641-1'), trigger: 'blur' },
        { max: 64, message: i18n.global.t('Channel.data.290641-2') },
    ],
    provider: [{ required: true, message: i18n.global.t('Channel.data.290641-3') }],
    host: [
        {
            required: true,
            message: i18n.global.t('Channel.data.290641-4'),
        },
        {
            validator: checkHost,
            trigger: 'blur',
            // message: i18n.global.t('Channel.data.290641-0'),
        },
    ],
    port: [
        {
            required: true,
            message: i18n.global.t('Channel.data.290641-5'),
        },
        {
            pattern: regOnlyNumber,
            message: i18n.global.t('Channel.data.290641-6'),
        },
    ],

    endpoint: [
        {
            required: true,
            message: i18n.global.t('Channel.data.290641-7'),
        },
        {
            validator: checkEndpoint,
            trigger: 'blur',
        },
    ],

    securityPolicy: [
        {
            required: true,
            message: i18n.global.t('Channel.data.290641-8'),
        },
    ],
    securityMode: [
        {
            required: true,
            message: i18n.global.t('Channel.data.290641-9'),
        },
    ],
    certId: [
        {
            required: true,
            message: i18n.global.t('Channel.data.290641-10'),
        },
    ],
    authType: [
        {
            required: true,
            message: i18n.global.t('Channel.data.290641-11'),
        },
    ],
    username: [
        { required: true, message: i18n.global.t('Channel.data.290641-12'), trigger: 'blur' },
        { max: 64, message: i18n.global.t('Channel.data.290641-2') },
    ],
    password: [
        { required: true, message: i18n.global.t('Channel.data.290641-13'), trigger: 'blur' },
        { max: 64, message: i18n.global.t('Channel.data.290641-2') },
    ],

    description: [{ max: 200, message: i18n.global.t('Channel.data.290641-14') }],
};
export const columns = [
    {
        title: i18n.global.t('Channel.data.290641-15'),
        dataIndex: 'name',
        key: 'name',
        ellipsis: true,
        fixed: 'left',
        search: {
            type: 'string',
        },
    },
    {
        title: i18n.global.t('Channel.data.290641-16'),
        dataIndex: 'provider',
        key: 'provider',
        ellipsis: true,
        search: {
            type: 'select',
            options: [
                { label: 'OPC_UA', value: 'OPC_UA' },
                { label: 'MODBUS_TCP', value: 'MODBUS_TCP' },
            ],
        },
    },
    {
        title: i18n.global.t('Channel.data.290641-17'),
        dataIndex: 'state',
        key: 'state',
        ellipsis: true,
        scopedSlots: true,
        search: {
            type: 'select',
            options: [
                { label: i18n.global.t('Channel.data.290641-18'), value: 'enabled' },
                { label: i18n.global.t('Channel.data.290641-19'), value: 'disabled' },
            ],
        },
    },
    {
        title: i18n.global.t('Channel.data.290641-20'),
        dataIndex: 'runningState',
        key: 'runningState',
        ellipsis: true,
        scopedSlots: true,
        search: {
            type: 'select',
            options: [
                { label: i18n.global.t('Channel.data.290641-21'), value: 'running' },
                { label: i18n.global.t('Channel.data.290641-22'), value: 'partialError' },
                { label: i18n.global.t('Channel.data.290641-23'), value: 'failed' },
            ],
        },
    },
    {
        title: i18n.global.t('Channel.data.290641-24'),
        dataIndex: 'description',
        key: 'description',
        ellipsis: true,
    },
    {
        title: i18n.global.t('Channel.data.290641-25'),
        key: 'action',
        fixed: 'right',
        width: 200,
        scopedSlots: true,
    },
];

/**协议列表 */
export const protocolList = [
    { label: 'OPC_UA', value: 'OPC_UA', alias: 'opc-ua' },
    { label: 'MODBUS_TCP', value: 'MODBUS_TCP', alias: 'Modbus/TCP' },
    { label: 'COLLECTOR_GATEWAY', value: 'COLLECTOR_GATEWAY', alias: 'GATEWAY' },
    { label: 'S7', value: 'snap7', alias: 'snap7' },
    { label: 'IEC104', value: 'iec104', alias: 'IEC104' },
    { label: 'BACNetIp', value: 'BACNetIp', alias: 'BACNet/IP' }
]

export const imgUrl = {
    opcImage:opcImage,
    modbusImage:modbusImage,
    s7Image:s7Image,
    gatewayImage:gatewayImage,
    iecImage:iecImage
}

