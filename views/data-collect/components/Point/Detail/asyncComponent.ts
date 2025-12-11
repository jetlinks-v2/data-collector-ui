export const tabs = {
    Info: defineAsyncComponent(() => import('./Info/index.vue')),
    AdvancedConfiguration: defineAsyncComponent(() => import('./AdvancedConfiguration/index.vue')),
    HistoryData: defineAsyncComponent(() => import('./HistoryData/index.vue')),
    RelatedDevice: defineAsyncComponent(() => import('./RelatedDevice/index.vue')),
    PointLogs: defineAsyncComponent(() => import('./PointLogs/index.vue')),
    Alarm: defineAsyncComponent(() => import('./Alarm/index.vue'))
};
