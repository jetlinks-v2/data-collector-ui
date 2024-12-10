import i18n from "@/locales";
export const TargetTypeOptions = [
    {
        label: i18n.global.t('NewResource.utils.262184-0'),
        value: 'AiModel'
    },
    {
        label: i18n.global.t('NewResource.utils.262184-1'),
        value: 'PluginDriver'
    },
    {
        label: i18n.global.t('NewResource.utils.262184-2'),
        value: 'entityTemplate:Collector'
    }
]

export const ServiceIdEnum = {
    'AiModel': 'aiService:modelManager',
    'PluginDriver': 'pluginService:driver',
    'entityTemplate:Collector': 'commonService:entityTemplate'
}

export const JobTypeEnum = {
    'AiModel': 'AiModel',
    'PluginDriver': 'plugin',
    'entityTemplate:Collector': 'CollectorTemplate'
}