<template>
  <PageChrome>
    <a-button class="point-detail__back" type="text" @click="backToList"><AIcon type="LeftOutlined" /> {{ $t('PointWorkspace.back') }}</a-button>
  </PageChrome>
  <div v-if="loading" class="point-detail__state"><a-spin /></div>
  <a-result v-else-if="error" :status="error" :title="$t(error === '404' ? 'PointWorkspace.notFound' : error === '403' ? 'PointWorkspace.forbidden' : 'PointWorkspace.loadFailed')">
    <template #extra><a-button @click="load">{{ $t('PointWorkspace.retry') }}</a-button></template>
  </a-result>
  <main v-else-if="info.id" class="point-detail">
    <PageChrome flush>
      <PointSummary :key="summaryRevision" :info="info" :editing="editing" :on-delete="remove" @save-field="saveField" @edit="edit" />
      <SlantedTabs :active-key="activeKey" :options="tabOptions" @change="key => changeTab(String(key))" />
    </PageChrome>
    <a-alert v-if="saveFailed" type="error" show-icon :message="$t('PointWorkspace.saveFailed')">
      <template #action><a-button type="link" @click="retry">{{ $t('PointWorkspace.retry') }}</a-button></template>
    </a-alert>
    <span v-if="saving" class="point-detail__saving" role="status"><a-spin size="small" /> {{ $t('PointWorkspace.saving') }}</span>
    <div class="point-detail__content">
      <component :is="tabs[activeKey]" :key="info.id + activeKey" ref="editor" />
    </div>
  </main>
  <Save v-if="editOpen" ref="modalEditor" :data="info" :collector="collector" @close="editOpen = false" @save="refresh" />
</template>
<script setup lang="ts">
import SlantedTabs from '@jetlinks-web-core/components/SlantedTabs'
import PointSummary from './PointSummary.vue'
import Save from '../Save/index.vue'
import { tabs } from './asyncComponent'
import { usePointDetail } from './usePointDetail'
const { $t, info, collector, loading, error, saving, saveFailed, editing, editOpen, editor, modalEditor, summaryRevision, activeKey, tabs: tabOptions,
  load, saveField, retry, changeTab, backToList, remove, edit, refresh } = usePointDetail()
</script>
<style scoped>
.point-detail { display: flex; flex-direction: column; min-width: 0; min-height: 0; height: 100%; gap: var(--space-3); }
.point-detail__back { padding-inline: 0; }
.point-detail__state { display: grid; place-items: center; min-height: 20rem; }
.point-detail__content { flex: 1; min-height: 0; overflow: auto; }
.point-detail__saving { color: var(--jet-theme-text-secondary); font-size: var(--fs-13); }
</style>
