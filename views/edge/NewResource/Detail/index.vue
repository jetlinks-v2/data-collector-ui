<template>
    <j-page-container
        :tabList="list"
        :showBack="true"
        @tabChange="onTabChange"
    >
        <template #title>
            <a-space>
                <span>{{detailData.name}}</span>
                <j-permission-button
                    style="padding: 0"
                    type="text"
                    hasPermission="device/Product:action"
                    :popConfirm="{
                        title:
                            detailData.state?.value === 'enabled'
                                ? $t('NewResource.index.035355-9', [$t('NewResource.index.035355-6')])
                                : $t('NewResource.index.035355-9', [$t('NewResource.index.035355-5')]),
                        onConfirm: () => {
                            handleEnable(detailData.state?.value === 'enabled')
                        }
                    }"
                >
                    <a-switch :checked="detailData.state?.value === 'enabled'"></a-switch>
                </j-permission-button>
            </a-space>
        </template>
        <FullPage>
            <div style="padding: 24px; height: 100%">
                <component
                    :is="tabs[tabKey]"
                    :data="detailData"
                    v-bind="{ type: 'device' }"
                    @onJump="onTabChange"
                    @refresh="handleRefresh"
                />
            </div>
        </FullPage>
    </j-page-container>
</template>

<script setup lang="ts">
import Info from './Info/index.vue';
import Record from './Record/index.vue';
import { detail, update } from "../../../../api/edge/newResource";
import { useResourceStore } from "../../../../store/resource";
import { useI18n } from 'vue-i18n';
import { onlyMessage } from '@jetlinks-web/utils'

const { t: $t } = useI18n();

const list = ref([
    {
        key: 'Info',
        tab: $t('Detail.index.327603-0'),
    },
    {
        key: 'Record',
        tab: $t('Detail.index.327603-1'),
    }
])

const tabs = {
    Info,
    Record
}

const resourceStore = useResourceStore();
const tabKey = ref('Info');
const onTabChange = (e: string) => {
    tabKey.value = e;
};
const detailData = ref({});

const route = useRoute();

const getDetail = async () => {
    const res = await detail(route.params.id);
    if(res.success) {
        resourceStore.resource = res.result;
        detailData.value = res.result;
    }
}

const handleRefresh = () => {
    getDetail();
}

const handleEnable = (checked: boolean) => {
    const state = !checked ? 'enabled' : 'disabled';
    update(detailData.value?.id, {state}).then(() => {
        onlyMessage($t('NewResource.index.035355-10'));
        getDetail();
    });
}

watch(() => route.params.id, (val) => {
    if(val) {
        getDetail()
    }
}, {immediate: true})
</script>

<style scoped lang="less">

</style>
