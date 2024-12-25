import i18n from '@/locales'
export const PROVIDER_OPTIONS = [
    { label: 'GB/T28181', value: 'gb28181-2016' },
    { label: i18n.global.t('SaveProduct.const.911927-0'), value: 'fixed-media' },
    { label: 'Onvif', value: 'onvif'},
    { label: i18n.global.t('SaveProduct.const.911927-1'), value: 'media-plugin'}
]
export const streamMode = [
    { label: 'UDP', value: 'UDP' },
    { label: i18n.global.t('SaveProduct.const.911927-2'), value: 'TCP_PASSIVE' },
]

export const providerType = {
    'gb28181-2016': 'GB/T28181',
    'fixed-media': i18n.global.t('SaveProduct.const.911927-0'),
    'onvif': 'Onvif',
    'media-plugin': i18n.global.t('SaveProduct.const.911927-1')
};