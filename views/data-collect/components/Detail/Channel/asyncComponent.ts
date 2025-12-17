export const tabs = {
    Info: defineAsyncComponent(() => import('./Info/index.vue')),
    ChannelLogs: defineAsyncComponent(() => import('./ChannelLogs/index.vue')),
};
