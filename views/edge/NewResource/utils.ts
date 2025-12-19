import i18n from "@/locales";
export const TargetTypeOriginOptions = [
    {
        label: i18n.global.t('NewResource.utils.262184-1'),
        value: 'PluginDriver'
    },
    {
        label: i18n.global.t('NewResource.utils.262184-2'),
        value: 'entityTemplate:Collector'
    }
]

export const ServiceIdOriginEnum = {
    'PluginDriver': 'pluginService:driver',
    'entityTemplate:Collector': 'commonService:entityTemplate'
}

export const JobTypeOriginEnum = {
    'PluginDriver': 'plugin',
    'entityTemplate:Collector': 'CollectorTemplate'
}