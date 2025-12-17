export const tabs = {
    Info: defineAsyncComponent(() => import('./Info/index.vue')),
    PointTemplate: defineAsyncComponent(() => import('./PointTemplate/index.vue')),
    CollectorLogs: defineAsyncComponent(() => import('./CollectorLogs/index.vue')),
};
