import { testIpv4_6 } from '@/utils/validate';
import opcImage from '../../../assets/DataCollect/device-opcua.png'
import modbusImage from '../../../assets/DataCollect/channel-modbus.png'
import s7Image from '../../../assets/DataCollect/s7.png'
import gatewayImage from '../../../assets/DataCollect/gateway.png'
import iecImage from '../../../assets/DataCollect/IEC104.png'
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

export const regOnlyNumber = new RegExp(/^\d+$/);
export const regular = {
    // IPV4 IPV6 域名
    IP_Domain: /^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$|^(([a-zA-Z]|[a-zA-Z][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z]|[A-Za-z][A-Za-z0-9\-]*[A-Za-z0-9])$|^(?:(?:(?:(?:(?:(?:(?:[0-9a-fA-F]{1,4})):){6})(?:(?:(?:(?:(?:[0-9a-fA-F]{1,4})):(?:(?:[0-9a-fA-F]{1,4})))|(?:(?:(?:(?:(?:25[0-5]|(?:[1-9]|1[0-9]|2[0-4])?[0-9]))\.){3}(?:(?:25[0-5]|(?:[1-9]|1[0-9]|2[0-4])?[0-9])))))))|(?:(?:::(?:(?:(?:[0-9a-fA-F]{1,4})):){5})(?:(?:(?:(?:(?:[0-9a-fA-F]{1,4})):(?:(?:[0-9a-fA-F]{1,4})))|(?:(?:(?:(?:(?:25[0-5]|(?:[1-9]|1[0-9]|2[0-4])?[0-9]))\.){3}(?:(?:25[0-5]|(?:[1-9]|1[0-9]|2[0-4])?[0-9])))))))|(?:(?:(?:(?:(?:[0-9a-fA-F]{1,4})))?::(?:(?:(?:[0-9a-fA-F]{1,4})):){4})(?:(?:(?:(?:(?:[0-9a-fA-F]{1,4})):(?:(?:[0-9a-fA-F]{1,4})))|(?:(?:(?:(?:(?:25[0-5]|(?:[1-9]|1[0-9]|2[0-4])?[0-9]))\.){3}(?:(?:25[0-5]|(?:[1-9]|1[0-9]|2[0-4])?[0-9])))))))|(?:(?:(?:(?:(?:(?:[0-9a-fA-F]{1,4})):){0,1}(?:(?:[0-9a-fA-F]{1,4})))?::(?:(?:(?:[0-9a-fA-F]{1,4})):){3})(?:(?:(?:(?:(?:[0-9a-fA-F]{1,4})):(?:(?:[0-9a-fA-F]{1,4})))|(?:(?:(?:(?:(?:25[0-5]|(?:[1-9]|1[0-9]|2[0-4])?[0-9]))\.){3}(?:(?:25[0-5]|(?:[1-9]|1[0-9]|2[0-4])?[0-9])))))))|(?:(?:(?:(?:(?:(?:[0-9a-fA-F]{1,4})):){0,2}(?:(?:[0-9a-fA-F]{1,4})))?::(?:(?:(?:[0-9a-fA-F]{1,4})):){2})(?:(?:(?:(?:(?:[0-9a-fA-F]{1,4})):(?:(?:[0-9a-fA-F]{1,4})))|(?:(?:(?:(?:(?:25[0-5]|(?:[1-9]|1[0-9]|2[0-4])?[0-9]))\.){3}(?:(?:25[0-5]|(?:[1-9]|1[0-9]|2[0-4])?[0-9])))))))|(?:(?:(?:(?:(?:(?:[0-9a-fA-F]{1,4})):){0,3}(?:(?:[0-9a-fA-F]{1,4})))?::(?:(?:[0-9a-fA-F]{1,4})):)(?:(?:(?:(?:(?:[0-9a-fA-F]{1,4})):(?:(?:[0-9a-fA-F]{1,4})))|(?:(?:(?:(?:(?:25[0-5]|(?:[1-9]|1[0-9]|2[0-4])?[0-9]))\.){3}(?:(?:25[0-5]|(?:[1-9]|1[0-9]|2[0-4])?[0-9])))))))|(?:(?:(?:(?:(?:(?:[0-9a-fA-F]{1,4})):){0,4}(?:(?:[0-9a-fA-F]{1,4})))?::)(?:(?:(?:(?:(?:[0-9a-fA-F]{1,4})):(?:(?:[0-9a-fA-F]{1,4})))|(?:(?:(?:(?:(?:25[0-5]|(?:[1-9]|1[0-9]|2[0-4])?[0-9]))\.){3}(?:(?:25[0-5]|(?:[1-9]|1[0-9]|2[0-4])?[0-9])))))))|(?:(?:(?:(?:(?:(?:[0-9a-fA-F]{1,4})):){0,5}(?:(?:[0-9a-fA-F]{1,4})))?::)(?:(?:[0-9a-fA-F]{1,4})))|(?:(?:(?:(?:(?:(?:[0-9a-fA-F]{1,4})):){0,6}(?:(?:[0-9a-fA-F]{1,4})))?::))))$/,
    // IP地址
    IP_URL: /^((2((5[0-5])|([0-4]\d)))|([0-1]?\d{1,2}))(\.((2((5[0-5])|([0-4]\d)))|([0-1]?\d{1,2}))){3}$/,
    // 英文或者数字或者-或者_
    EN_NUMBER: /^[A-Za-z0-9_-]+$/,
    // 服务器地址
    HTTP_URL: /^http:|https:\/\/([\w-]+\.)+[\w-]+(\/[\w-./?%&=]*)?$/,
    // 域名
    DOMAIN_NAME: /^(?:(?:(?:[a-zA-z\-]+)\:\/{1,3})?(?:[a-zA-Z0-9])(?:[a-zA-Z0-9-\.]){1,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+|\[(?:(?:(?:[a-fA-F0-9]){1,4})(?::(?:[a-fA-F0-9]){1,4}){7}|::1|::)\]|(?:(?:[0-9]{1,3})(?:\.[0-9]{1,3}){3}))(?:\:[0-9]{1,5})?$/,
    // 数字
    // NUMBER: /^[0-9]*[1-9][0-9]*$/,
    NUMBER: /^([1-9]\d*|[0]{1,1})$/,
    // 正数、负数、小数
    ASSIGNMENT: /^(\-)?\d+(\.\d+)?$/,
    //密码验证
    PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[^]{8,}$/,
    //IP子网掩码
    IP_MASK: /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(\/\d{1,2})?$/,
    CronRegEx: new RegExp('^\\s*($|#|\\w+\\s*=|(\\?|\\*|(?:[0-5]?\\d)(?:(?:-|\\/|\\,)(?:[0-5]?\\d))?(?:,(?:[0-5]?\\d)(?:(?:-|\\/|\\,)(?:[0-5]?\\d))?)*)\\s+(\\?|\\*|(?:[0-5]?\\d)(?:(?:-|\\/|\\,)(?:[0-5]?\\d))?(?:,(?:[0-5]?\\d)(?:(?:-|\\/|\\,)(?:[0-5]?\\d))?)*)\\s+(\\?|\\*|(?:[01]?\\d|2[0-3])(?:(?:-|\\/|\\,)(?:[01]?\\d|2[0-3]))?(?:,(?:[01]?\\d|2[0-3])(?:(?:-|\\/|\\,)(?:[01]?\\d|2[0-3]))?)*)\\s+(\\?|\\*|(?:0?[1-9]|[12]\\d|3[01])(?:(?:-|\\/|\\,)(?:0?[1-9]|[12]\\d|3[01]))?(?:,(?:0?[1-9]|[12]\\d|3[01])(?:(?:-|\\/|\\,)(?:0?[1-9]|[12]\\d|3[01]))?)*)\\s+(\\?|\\*|(?:[1-9]|1[012])(?:(?:-|\\/|\\,)(?:[1-9]|1[012]))?(?:L|W)?(?:,(?:[1-9]|1[012])(?:(?:-|\\/|\\,)(?:[1-9]|1[012]))?(?:L|W)?)*|\\?|\\*|(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)(?:(?:-)(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC))?(?:,(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)(?:(?:-)(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC))?)*)\\s+(\\?|\\*|(?:[0-6])(?:(?:-|\\/|\\,|#)(?:[0-6]))?(?:L)?(?:,(?:[0-6])(?:(?:-|\\/|\\,|#)(?:[0-6]))?(?:L)?)*|\\?|\\*|(?:MON|TUE|WED|THU|FRI|SAT|SUN)(?:(?:-)(?:MON|TUE|WED|THU|FRI|SAT|SUN))?(?:,(?:MON|TUE|WED|THU|FRI|SAT|SUN)(?:(?:-)(?:MON|TUE|WED|THU|FRI|SAT|SUN))?)*)(|\\s)+(\\?|\\*|(?:|\\d{4})(?:(?:-|\\/|\\,)(?:|\\d{4}))?(?:,(?:|\\d{4})(?:(?:-|\\/|\\,)(?:|\\d{4}))?)*))$',)
  }

export const checkProviderData = {
    int8: 1,
    int16: 2,
    int32: 4,
    int64: 8,
    ieee754_float: 4,
    ieee754_double: 8,
    hex: 1,
};

export const ModBusRules = {
    name: [
        {
            required: true,
            message: i18n.global.t('Collector.data.400141-1'),
        },
        {
            max: 64,
            message: i18n.global.t('Collector.data.400141-2'),
        },
    ],
    function: [
        {
            required: true,
            message: i18n.global.t('Collector.data.400141-3'),
        },
    ],
    pointKey: [
        {
            required: true,
            message: i18n.global.t('Collector.data.400141-4'),
        },
        {
            pattern: regOnlyNumber,
            message: i18n.global.t('Collector.data.400141-5'),
        },
    ],
    quantity: [
        {
            required: true,
            message: i18n.global.t('Collector.data.400141-6'),
        },
        {
            pattern: regOnlyNumber,
            message: i18n.global.t('Collector.data.400141-7'),
        },
    ],
    provider: [
        {
            required: true,
            message: i18n.global.t('Collector.data.400141-8'),
        },
    ],
    scaleFactor: [
        {
            required: true,
            message: i18n.global.t('Collector.data.400141-9'),
        },
    ],
    accessModes: [
        {
            required: true,
            message: i18n.global.t('Collector.data.400141-10'),
        },
    ],
    writeByteCount: [
        {
            required: true,
            message: i18n.global.t('Collector.data.400141-11'),
        },
    ],
    byteCount: [
        {
            required: true,
            message: '请输入自定义数据区长度(byte)',
        },
    ],
    interval: [
        {
            required: true,
            message: i18n.global.t('Collector.data.400141-13'),
        },
        {
            pattern: regOnlyNumber,
            message: i18n.global.t('Collector.data.400141-14'),
        },
    ],

    description: [{ max: 200, message: i18n.global.t('Collector.data.400141-15') }],
};

export const OPCUARules = {
    name: [
        {
            required: true,
            message: i18n.global.t('Collector.data.400141-1'),
        },
        {
            max: 64,
            message: i18n.global.t('Collector.data.400141-2'),
        },
    ],
    type: [
        {
            required: true,
            message: i18n.global.t('Collector.data.400141-8'),
        },
    ],
    accessModes: [
        {
            required: true,
            message: i18n.global.t('Collector.data.400141-10'),
        },
    ],
    interval: [
        {
            required: true,
            message: i18n.global.t('Collector.data.400141-13'),
        },
        {
            pattern: regOnlyNumber,
            message: i18n.global.t('Collector.data.400141-14'),
        },
    ],
    description: [{ max: 200, message: i18n.global.t('Collector.data.400141-15') }],
};

const validatorUrl = (rule:any, value:any, callback:any)  => {
    const reg = regular.DOMAIN_NAME
    const reg1 = regular.IP_URL
    if(value === undefined || value === '' || value === null) {
      return Promise.reject(i18n.global.t('Collector.data.400141-16'))
    } else {
      if(reg.test(value) === false && reg1.test(value) === false) {
        return Promise.reject(i18n.global.t('Collector.data.400141-17'))
      }
      return Promise.resolve()
    }
  }
  /**
 * 校验通道端口
 */
const validator1 = (rule:any, value:any, callback:any)  => {
    if(value === undefined || value === '' || value === null) {
      return Promise.reject(i18n.global.t('Collector.data.400141-18'))
    } else {
      if(value < 1 || value > 65535) {
        return Promise.reject(i18n.global.t('Collector.data.400141-19'))
      }
      return Promise.resolve()
    }
  }
  
  /**
   * 校验机架号
   */
  const validator2 = (rule:any, value:any, callback:any)  => {
    if(value === undefined || value === '' || value === null) {
      return Promise.reject(i18n.global.t('Collector.data.400141-20'))
    } else {
      if(value < 0 || value > 65535) {
        return Promise.reject(i18n.global.t('Collector.data.400141-21'))
      }
      return Promise.resolve()
    }
  }
  
  /**
   *  校验槽位
   */
  const validator3 = (rule:any, value:any, callback:any)  => {
    if(value === undefined || value === '' || value === null) {
      return Promise.reject(i18n.global.t('Collector.data.400141-22'))
    } else {
      if(value < 0 || value > 65535) {
        return Promise.reject(i18n.global.t('Collector.data.400141-21'))
      }
      return Promise.resolve()
    }
  }
  
  /**
   *  校验超时时间
   */
  const validator4 = (rule:any, value:any, callback:any)  => {
    if(value === undefined || value === '' || value === null) {
      return Promise.reject(i18n.global.t('Collector.data.400141-23'))
    } else {
      if(value < 0 || value > 65535) {
        return Promise.reject(i18n.global.t('Collector.data.400141-21'))
      }
      return Promise.resolve()
    }
  }
  /**
 * 校验官网地址
 */
const validateUrl = async (_rule: any, value: string) => {
    if (!value) {
        return Promise.resolve();
    } else {
        if (!testIpv4_6(value)) {
            return Promise.reject(i18n.global.t('Collector.data.400141-24'));
        }
        return Promise.resolve();
    }
};
export const LeftTreeRules = {
    channelId: [{ required: true, message: i18n.global.t('Collector.data.400141-25'), trigger: 'blur' }],
    name: [
        { required: true, message: i18n.global.t('Collector.data.400141-26'), trigger: 'blur' },
        { max: 64, message: i18n.global.t('Collector.data.400141-2') },
    ],
    unitId: [
        { required: true, message: i18n.global.t('Collector.data.400141-27'), trigger: 'blur' },
        {
            pattern: regOnlyNumber,
            message: i18n.global.t('Collector.data.400141-28'),
        },
    ],
    // type: [{ required: true, message: '请选择处理方式', trigger: 'blur' }],
    endian: [
        { required: true, message: i18n.global.t('Collector.data.400141-29'), trigger: 'blur' },
    ],
    endianIn: [
        { required: true, message: i18n.global.t('Collector.data.400141-30'), trigger: 'blur' },
    ],
    requestTimeout:[
        { pattern: /^\d+$/, message:i18n.global.t('Collector.data.400141-31'),trigger: 'change'}
    ],
    host: [
        { required: true, trigger: 'blur', validator: validatorUrl, },
    ],
    port: [{ required: true, trigger: 'blur' , validator: validator1}],
    rack: [{ required: true, trigger: 'blur', validator: validator2 }],
    slot: [{ required: true, trigger: 'blur', validator: validator3 }],
    timeout: [{ required: true, trigger: 'blur', validator: validator4 }],
    type: [{required: true, trigger: 'change', message: i18n.global.t('Collector.data.400141-32')}],
    serializable: [{required: true, trigger: 'change', message: i18n.global.t('Collector.data.400141-32')}],
    terminnalAddress: [{required: true, trigger: 'blur', message: i18n.global.t('Collector.data.400141-33')}],
    frameAmountMax: [{required: true, message: i18n.global.t('Collector.data.400141-34'), trigger: 'blur'}],
    address: [{ trigger: 'blur',validator: validateUrl,message: i18n.global.t('Collector.data.400141-35')}],
};

export const FormTableColumns = [
    {
        title: i18n.global.t('Collector.data.400141-36'),
        dataIndex: 'name',
        key: 'name',
        width: 140,
        fixed: 'left',
    },
    {
        title: 'nodeId',
        dataIndex: 'id',
        key: 'id',
        width: 200,
        ellipsis: true,
    },
    {
        title: i18n.global.t('Collector.data.400141-37'),
        dataIndex: 'accessModes',
        key: 'accessModes',
        width: 260,
    },
    {
        title: i18n.global.t('Collector.data.400141-38'),
        key: 'interval',
        dataIndex: 'interval',
        width: 200,
    },
    {
        title: i18n.global.t('Collector.data.400141-39'),
        key: 'features',
        dataIndex: 'features',
        width: 140,
    },
    {
        title: i18n.global.t('Collector.data.400141-40'),
        key: 'action',
        dataIndex: 'action',
        fixed: 'right',
        width: 50,
    },
];

export const BacnetFormTableColumns = [
    {
        title: i18n.global.t('Collector.data.400141-36'),
        dataIndex: 'name',
        key: 'name',
        width: 140,
        fixed: 'left',
        form:{
            required: true
        }
    },
    {
        title: i18n.global.t('Collector.data.400141-41'),
        dataIndex: 'type',
        key: 'type',
        form:{
            required: true
        }
    },
    {
        title: i18n.global.t('Collector.data.400141-42'),
        dataIndex: 'instanceNumber',
        key: 'instanceNumber',
        form:{
            required: true
        }
    },
    {
        title: i18n.global.t('Collector.data.400141-43'),
        dataIndex: 'propertyId',
        key: 'propertyId',
         form:{
            required: true
        },
        width: 200,
    },
    {
        title: i18n.global.t('Collector.data.400141-44'),
        dataIndex: 'valueType',
        key: 'valueType',
        form:{
            required: true
        },
        width: 200,
    },
    {
        title: i18n.global.t('Collector.data.400141-37'),
        dataIndex: 'accessModes',
        key: 'accessModes',
        form:{
            required: true
        },
        width: 260,
    },
    {
        title: i18n.global.t('Collector.data.400141-38'),
        key: 'interval',
        dataIndex: 'interval',
        form:{
            required: true
        },
        width: 200,
    },
    {
        title: i18n.global.t('Collector.data.400141-39'),
        key: 'features',
        dataIndex: 'features',
        form:{
            required: true
        },
        width: 150,
    },
    {
        title: i18n.global.t('Collector.data.400141-40'),
        key: 'action',
        dataIndex: 'action',
        fixed: 'right',
        width: 70,
    },
]
