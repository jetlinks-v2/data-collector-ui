export default {
    components: {
        DataCollectChannel: defineAsyncComponent(() => import('./views/DataCollect/Channel/index.vue')),
        DataCollectCollector: defineAsyncComponent(() => import('./views/DataCollect/Collector/index.vue')),
        SaveGatewayDevice: defineAsyncComponent(() => import('./views/edge/Device/Save/index.vue')),
        ResourcePage: defineAsyncComponent(() => import('./views/edge/NewResource/index.vue')),
        ResourceDetailPage: defineAsyncComponent(() => import('./views/edge/NewResource/Detail/index.vue')),
    }
}
