<template>
  <FullPage flex transparent-background :padding="0" class="cw-page">
  <div ref="root" class="collection-workspace" :class="{ 'cw-collapsed': navigation?.collapsed, 'cw-setup': !!setupProvider }" :style="{ '--cw-controls-height': `${controlsHeight}px` }">
    <ResponsiveSplitter ref="navigation" v-model:collapsed="folded" class="cw-layout" :default-size="navigationContent?.preferredWidth || 272" :min="232" :max="432" :end-min="592" collapse-on-drag :panel-title="$t('collectorWorkspace.navigation')">
      <template #start="{ compact }"><div class="cw-navigation-pane" :class="{ 'is-compact': compact }"><ObjectNavigation ref="navigationContent" :collectors="collectors" :channels="channels" :selected="collector?.id" :selected-channel="selectedChannelId" :total="error && !collectors.length ? undefined : collectors.length" :loading="initializing || loading && !collectors.length" :drawer="compact" :controls="navigation?.startId" @select="select" @select-channel="value => select(undefined, value)" @collapse="folded = true" /></div></template>
      <template #end="{ collapsed, toggle, startId }"><main ref="main" class="cw-main">
        <div v-if="!setupProvider" class="cw-main-controls"><div ref="controlsContent" class="cw-controls-content">
        <header v-if="!setupProvider" class="cw-head">
          <div class="cw-row cw-head-identity">
            <PanelCollapseButton v-if="collapsed" class="cw-nav-trigger" collapsed :aria-controls="startId" :label="$t('collectorWorkspace.expandNavigation')" @toggle="toggle" />
            <button v-if="headingObject && !choosingProvider" type="button" class="cw-scope-back" :title="returnTitle" :aria-label="returnTitle" :disabled="batchBusy || saving || configurationEditor?.saving" @click="returnToList"><AIcon type="ArrowLeftOutlined" /><span>{{ $t(collector ? 'collectorWorkspace.collector' : 'collectorNavigation.all') }}</span><span v-if="collector && returnChannel" class="cw-return-scope">{{ returnChannel.name }}</span></button>
            <div v-if="headingObject" ref="headingAnchor" class="cw-object-anchor"><ObjectIdentity :object="headingObject" surface="header"><template #name><h1 :title="headingObject.name">{{ headingObject.name }}</h1></template><template #status><RuntimeCardMetrics :object="headingObject" :kind="collector ? 'collector' : 'channel'" variant="status" /></template></ObjectIdentity></div>
            <j-permission-button v-if="headingObject && !batchEditor.open.value" class="cw-icon-button" type="text" size="small" hasPermission="data-collect:update" :aria-label="$t(collector ? 'collectorWorkspace.collectorSettings' : 'collectorWorkspace.connection')" :title="$t(collector ? 'collectorWorkspace.collectorSettings' : 'collectorWorkspace.connection')" :aria-expanded="objectForm === (collector ? 'collector' : 'channel')" @click="openSettings(collector ? 'collector' : 'channel', $event)"><AIcon :type="objectForm === (collector ? 'collector' : 'channel') && !objectEditor?.prepared ? 'LoadingOutlined' : 'SettingOutlined'" /></j-permission-button>
            <a-popover v-if="collector && channel" v-model:open="channelPreviewOpen" :trigger="['hover', 'focus', 'click']" placement="bottomLeft" :mouse-enter-delay="0.15" :destroy-tooltip-on-hide="true" overlay-class-name="cw-workspace-popover">
              <button ref="channelAnchor" class="cw-related-channel" type="button" :aria-label="`${$t('collectorWorkspace.channel')} · ${channel.name}`" :title="`${$t('collectorWorkspace.channel')} · ${channel.name}`" :aria-expanded="channelPreviewOpen">{{ $t('collectorWorkspace.channel') }}<AIcon type="DownOutlined" /></button>
              <template #content><div class="collection-workspace cw-related-channel-panel"><ObjectIdentity :object="channel" surface="channel"><template #name><button class="cw-channel-label cw-channel-link" :title="channel.name" @click="channelPreviewOpen = false; select(undefined, channel)">{{ channel.name }}</button></template></ObjectIdentity><div class="cw-related-channel-actions"><RuntimeCardMetrics :object="channel" kind="channel" /><j-permission-button type="text" size="small" hasPermission="data-collect:update" @click="channelPreviewOpen = false; openSettings('channel', $event)"><AIcon type="SettingOutlined" />{{ $t('collectorWorkspace.connection') }}</j-permission-button></div></div></template>
            </a-popover>
            <template v-if="!headingObject"><WorkspaceIcon class="cw-heading-icon" name="grid" :size="25" /><h1>{{ choosingProvider || setupProvider ? $t('collectorWorkspace.newCollection') : $t('collectorWorkspace.allCollectors') }}</h1></template>
          </div>
          <div class="cw-row cw-head-utilities">
            <div v-if="collector && !choosingProvider" v-show="!batchEditor.open.value" class="cw-row cw-head-actions">
              <j-permission-button size="small" type="primary" hasPermission="data-collect:add" :aria-label="$t('collectorWorkspace.newPoint')" :title="$t('collectorWorkspace.newPoint')" @click="addPoint"><AIcon type="PlusOutlined" /><span class="cw-primary-action-label">{{ $t('collectorWorkspace.newPoint') }}</span></j-permission-button>
              <j-permission-button size="small" type="text" hasPermission="data-collect:update" :aria-label="batchEntryLabel" :disabled="batchBusy || saving || pointLoading || ordering || draft.hasCurrentChanges.value" :title="draft.hasCurrentChanges.value ? $t('collectorList.applyDraft') : $t('collectorBatch.entryHint')" @click="enterBatch"><AIcon type="EditOutlined" /><span class="cw-primary-action-label">{{ batchEntryLabel }}</span></j-permission-button>
              <WorkspacePointTools ref="pointTools" :key="collector.id" :collector="collector" compact :disabled="batchBusy || saving" @saved="data.loadPoints" />
            </div>
            <j-permission-button v-if="!collector && !choosingProvider && !setupProvider" hasPermission="data-collect:add" size="small" type="primary" @click="startCollection"><AIcon type="PlusOutlined" />{{ $t('collectorWorkspace.newCollection') }}</j-permission-button>
            <a-popover v-if="!batchEditor.open.value" v-model:open="moreOpen" trigger="click" placement="bottomRight" overlay-class-name="cw-workspace-popover cw-actions-overlay">
              <button ref="moreTrigger" type="button" class="cw-icon-button" :aria-label="$t('collectorWorkspace.more')" :title="$t('collectorWorkspace.more')" :aria-expanded="moreOpen" @keydown.tab="focusMore" @keydown.down="focusMore" @keydown.esc.stop="closeMore"><AIcon type="MoreOutlined" /></button>
              <template #content><div ref="moreActions" class="cw-overflow-actions" role="group" :aria-label="$t('collectorWorkspace.more')" @click="moreOpen = false" @keydown.tab="focusMore" @keydown.esc.stop="closeMore">
                <div v-if="headingObject" class="cw-overflow-context" @click.stop>
            <DiagnosticTrigger :open="diagnosticId === headingObject.id" :label="$t('collectorWorkspace.diagnostics')" @visibility="visible => visible ? diagnose(collector ? 'collector' : 'channel', headingObject!) : closeDiagnostic()"><template #trigger><AIcon type="FileSearchOutlined" /><span>{{ $t('collectorWorkspace.diagnostics') }}</span></template><DiagnosticContent :state="diagnosticState" @close="closeDiagnostic" /></DiagnosticTrigger>
            <a-popconfirm v-if="headingObject && objectState.available.value && !batchEditor.open.value" :title="$t('Channel.index.290640-14', [objectState.label.value])" :description="collector ? headingObject.name : `${headingObject.name} · ${$t('collectorEditing.sharedCount', {count:data.scopedCollectors.value.length})}`" :disabled="objectState.busy.value || batchBusy || saving" @confirm="objectState.toggle">
              <j-permission-button hasPermission="data-collect:update" type="text" size="small" :aria-label="objectState.label.value" :title="objectState.label.value" :loading="objectState.busy.value" :disabled="batchBusy || saving"><AIcon v-if="!objectState.busy.value" :type="objectState.state.value === 'enabled' ? 'StopOutlined' : 'PlayCircleOutlined'" /><span class="cw-action-label">{{ objectState.label.value }}</span></j-permission-button>
            </a-popconfirm>
                </div>
                <a-divider v-if="headingObject" />
                <template v-if="collector">
                  <j-permission-button type="text" hasPermission="data-collect:view" :loading="listReading" :disabled="batchBusy || saving || data.trialState.value.running && !listReading" @click="data.trial()"><span class="collector-config-option"><AIcon v-if="!listReading" type="PlayCircleOutlined" /><span class="collector-config-option-copy">{{ $t('collectorWorkspace.read') }}<small>{{ $t('collectorWorkspace.readVisibleHint') }}</small></span></span></j-permission-button>
                  <j-permission-button v-if="pointTools?.canBrowse" type="text" hasPermission="data-collect:add" :disabled="batchBusy || saving" @click="pointTools?.browse()"><span class="collector-config-option"><AIcon type="ApartmentOutlined" /><span class="collector-config-option-copy">{{ $t('collectorWorkspace.browsePoints') }}<small>{{ $t('collectorWorkspace.browsePointsHint') }}</small></span></span></j-permission-button>
                  <j-permission-button type="text" hasPermission="data-collect:add" :disabled="batchBusy || saving" @click="pointTools?.importPoints()"><span class="collector-config-option"><AIcon type="ImportOutlined" /><span class="collector-config-option-copy">{{ $t('Point.index.400149-2') }}<small>{{ $t('collectorWorkspace.importPointsHint') }}</small></span></span></j-permission-button>
                  <a-divider />
                </template>
                <template v-if="!collector">
                  <j-permission-button type="text" hasPermission="data-collect:add" @click="collectImport?.openImport('importCollector', channel)"><span class="collector-config-option"><AIcon type="ImportOutlined" /><span class="collector-config-option-copy">{{ $t('PointWorkspace.importCollector') }}<small>{{ $t('collectorWorkspace.importCollectorsHint') }}</small></span></span></j-permission-button>
                  <j-permission-button v-if="!channel" type="text" hasPermission="data-collect:add" @click="collectImport?.openImport('importChannel')"><span class="collector-config-option"><AIcon type="ImportOutlined" /><span class="collector-config-option-copy">{{ $t('PointWorkspace.importChannel') }}</span></span></j-permission-button>
                  <a-divider />
                </template>
                <j-permission-button v-if="!choosingProvider" hasPermission="data-collect:view" type="text" :disabled="batchBusy || saving" @click="moreTrigger?.focus(); pointLookup.open.value = true"><span class="collector-config-option"><AIcon type="SearchOutlined" /><span class="collector-config-option-copy">{{ $t('collectorPointLookup.title') }}<small>{{ $t('collectorPointLookup.hint') }}</small></span></span></j-permission-button>
                <a-button type="text" @click="advanced = true"><span class="collector-config-option"><AIcon type="ControlOutlined" /><span class="collector-config-option-copy">{{ $t('collectorWorkspace.advanced') }}<small>{{ $t('collectorOptions.advancedHint') }}</small></span></span></a-button>
                <a-button type="text" @click="refresh"><span class="collector-config-option"><AIcon type="ReloadOutlined" /><span class="collector-config-option-copy">{{ $t('collectorWorkspace.refresh') }}<small>{{ $t('collectorOptions.refreshHint') }}</small></span></span></a-button>
              </div></template>
            </a-popover>
          </div>
        </header>
        <a-alert v-if="objectState.error.value" type="error" show-icon :message="objectState.error.value" />
        <template v-if="!choosingProvider">
        <div v-if="batchEditor.open.value" ref="batchHeading" class="cw-toolbar cw-batch-heading-target" />
        <div v-if="!batchEditor.open.value" class="cw-toolbar" :class="{ 'cw-selecting': selection.selecting }">
          <div v-if="!selection.selecting" class="cw-toolbar-query">
            <strong class="cw-list-total cw-list-title">{{ $t(collector ? 'collectorNavigation.points' : 'collectorNavigation.collectors') }}<span v-if="collector || !loading && !initializing && !error"> · {{ collector ? selection.total : total }}</span></strong>
            <WorkspaceSearch :value="collector ? pointSearch : search" :label="$t(collector ? 'collectorWorkspace.searchPoints' : 'collectorWorkspace.searchCollectors')" :disabled="batchBusy" @update:value="value => { if (collector) pointSearch = value; else search = value }" @search="collector ? data.filterPoints() : data.filterCollectors()" />
            <WorkspaceListControl v-if="collector" v-model:value="pointState" :label="$t('collectorControls.filter')" icon="FilterOutlined" :active="Boolean(pointState)" :disabled="batchBusy" @change="data.filterPoints" @open-change="data.loadStateCounts" :options="stateOptions" />
            <WorkspaceListControl v-else v-model:value="collectorState" :label="$t('collectorControls.filter')" icon="FilterOutlined" :active="Boolean(collectorState)" :options="stateOptions" @change="data.filterCollectors" @open-change="data.loadStateCounts" />
          </div>
          <PointBatchToolbar v-if="collector" :state="selection" @start="startBatch" @all="batch.all" @clear="batch.clear" @run="batch.run" />
          <div v-if="!selection.selecting" class="cw-toolbar-view">
            <WorkspaceListControl v-if="collector" v-model:value="pointSort" :label="$t('collectorControls.sort')" icon="SortAscendingOutlined" :disabled="batchBusy" :options="sortOptions" @change="data.filterPoints" />
            <WorkspaceListControl v-else v-model:value="collectorSort" :label="$t('collectorControls.sort')" icon="SortAscendingOutlined" :options="sortOptions.filter(option => !['pointKey', 'gap'].includes(option.value))" @change="data.filterCollectors" />
            <a-tooltip v-if="indexTime && (runtimeSort(collector ? pointSort : collectorSort) || runtimeFilter(collector ? pointState : collectorState))" :title="$t('collectorList.snapshotHint', { time: new Date(indexTime).toLocaleTimeString() })"><a-button type="text" size="small" :aria-label="$t('collectorList.refreshOrder')" :loading="ordering" @click="collector ? data.filterPoints() : data.filterCollectors()"><AIcon type="ReloadOutlined" /></a-button></a-tooltip>
            <template v-if="collector">
              <button class="cw-icon-button" :aria-label="$t(paused ? 'collectorWorkspace.resume' : 'collectorWorkspace.pause')" :title="$t(paused ? 'collectorWorkspace.resume' : 'collectorWorkspace.pause')" :aria-pressed="paused" @click="paused = !paused"><AIcon :type="paused ? 'PlayCircleOutlined' : 'PauseCircleOutlined'" /></button>
              <a-segmented v-if="!inline" v-model:value="view" size="small" :options="[{value:'cards',payload:{icon:'AppstoreOutlined',title:$t('collectorWorkspace.cards')}},{value:'table',payload:{icon:'UnorderedListOutlined',title:$t('collectorWorkspace.table')}}]"><template #label="{payload}"><span :title="payload.title" :aria-label="payload.title"><AIcon :type="payload.icon" /></span></template></a-segmented>
            </template>
          </div>
        </div>
        </template>
        </div></div>
        <div ref="content" class="cw-main-content" tabindex="-1">
        <ProviderChooser v-if="choosingProvider" :providers="providers" @cancel="choosingProvider = false" @select="provider => { setupProvider = provider; choosingProvider = false }" />
        <CollectionSetup v-else-if="setupProvider" ref="configurationEditor" :key="setupProvider.id" :provider="setupProvider" :channels="channels" :channel-id="selectedChannelId" @cancel="cancelSetup" @navigation="navigation?.toggle()" @saved="onCollectionCreated" />
        <template v-else>
        <PointReadFeedback v-if="data.trialState.value.scope === 'list' && data.trialState.value.total" :state="data.trialState.value" @stop="data.stopTrial" />
        <a-alert v-if="error" :message="error" type="error" show-icon><template #action><a-button size="small" @click="refresh">{{ $t('collectorWorkspace.retry') }}</a-button></template></a-alert>
        <a-alert v-if="(valueError || paused) && (collector ? points.length : collectors.length)" class="cw-stream-feedback" :message="$t(valueError ? 'collectorWorkspace.streamDisconnected' : 'collectorWorkspace.paused')" :type="valueError ? 'warning' : 'info'" show-icon><template #action><a-button type="link" size="small" @click="valueError ? refresh() : paused = false">{{ $t(valueError ? 'collectorWorkspace.retry' : 'collectorWorkspace.resume') }}</a-button></template></a-alert>
        <PointBatchEditor v-if="collector && batchEditor.open.value" ref="configurationEditor" :state="batchEditor" :heading-target="batchHeading" />
        <WorkspaceSkeleton v-else-if="collector ? pointLoading && !points.length : (loading || initializing) && !collectors.length" :kind="collector ? view === 'table' && !inline ? 'table' : 'points' : 'collectors'" />
        <a-spin v-else :spinning="loading || ordering">
          <template v-if="collector">
            <PointCollection ref="pointCollection" :points="filteredPoints" :selected="objectForm ? undefined : editingId" :editor="{ready: mountedEditor === model && !selectedLoading ? model?.id : undefined, error: selectedError}" :inline="inline" :view="view" :selection="selection" @check="batch.toggle" @checks="batch.check" @select="selectPoint" @diagnostic-visibility="diagnosticVisibility" @visible="visiblePoints" @editor-target="editorTarget = $event" @close-editor="closePoint">
              <template #diagnostic><DiagnosticContent :state="diagnosticState" embedded /></template>
              <template #empty><WorkspaceEmpty v-if="!error" kind="point" :filtered="Boolean(points.length && (pointSearch.trim() || pointState))">
                <a-button v-if="points.length && (pointSearch.trim() || pointState)" @click="clearListFilters">{{ $t('collectorWorkspace.empty.clear') }}</a-button>
                <template v-else><j-permission-button type="primary" hasPermission="data-collect:add" @click="addPoint"><AIcon type="PlusOutlined" />{{ $t('collectorWorkspace.newPoint') }}</j-permission-button><j-permission-button v-if="pointTools?.canBrowse" hasPermission="data-collect:add" @click="pointTools.browse()">{{ $t('collectorWorkspace.browsePoints') }}</j-permission-button><j-permission-button hasPermission="data-collect:add" @click="enterBatch">{{ $t('collectorWorkspace.empty.batchAdd') }}</j-permission-button></template>
              </WorkspaceEmpty></template>
            </PointCollection>
          </template>
          <template v-else><CollectorOverview :collectors="filteredCollectors" :providers="providers" @select="select" @edit="(value, anchor, trigger) => editObject({kind:'collector',object:value,anchor,trigger,surface:'card'})" /><WorkspaceEmpty v-if="!filteredCollectors.length && !loading && !error" kind="collector" :filtered="Boolean(data.scopedCollectors.value.length && (search.trim() || collectorState))"><a-button v-if="data.scopedCollectors.value.length && (search.trim() || collectorState)" @click="clearListFilters">{{ $t('collectorWorkspace.empty.clear') }}</a-button><j-permission-button v-else type="primary" hasPermission="data-collect:add" @click="choosingProvider = true"><AIcon type="PlusOutlined" />{{ $t('collectorWorkspace.newCollection') }}</j-permission-button></WorkspaceEmpty></template>
        </a-spin>
        </template>
        </div>
      </main></template>
    </ResponsiveSplitter>
    <WorkspacePointLookup :state="pointLookup" />
    <PointHistoryPanel :state="history" />
    <ObjectEditorOverlay v-if="objectTarget && objectValue" :open="!!objectForm" :ready="!!objectEditor?.prepared" :kind="objectTarget.kind" :identity="objectKey" :anchor="objectTarget.anchor" :trigger="objectTarget.trigger" :viewport="main" :surface="objectTarget.surface" @close="restoreFocus => editObject(undefined, restoreFocus)"><ObjectConfiguration ref="objectEditor" :key="objectKey" :kind="objectTarget.kind" :value="objectValue" :channels="channels" :providers="providers" :surface="objectTarget.surface" :draft="objectDraft" :shared-count="sharedCount" @close="editObject()" @saved="objectSaved" /></ObjectEditorOverlay>
    <Teleport v-if="collector && (editingId || model)" :to="objectForm ? '#cw-editor-parking' : editorTarget || '#cw-editor-parking'">
      <PointEditorError v-if="selectedError && editingSummary" :point="editingSummary" :error="selectedError" @close="closePoint" @retry="data.loadPointDetails" />
      <PointEditor v-else-if="model && !selectedLoading" :key="`${collector.id}:${model.id}:${revision}`" :model="model" :collector="collector" :resolved="selectedPoint" :dirty="dirty" :saving="saving" :error="draftError" :read-state="data.trialState.value.scope === 'point' && data.trialState.value.ids.includes(model.id) ? data.trialState.value : undefined" @apply="draft.apply" @restore="draft.restore" @trial="data.trial(model)" @stop-trial="data.stopTrial" @close="closePoint" @ready="mountedEditor=$event" @diagnostic-visibility="diagnosticVisibility(selectedPoint || model, $event)"><template #diagnostic><DiagnosticContent :state="diagnosticState" embedded /></template></PointEditor>
    </Teleport>
    <div id="cw-editor-parking" hidden />
    <a-drawer v-model:open="advanced" :width="'min(1200px, 100vw)'" :title="$t('collectorWorkspace.advanced')" destroy-on-close><LegacyWorkspace v-if="advanced" /></a-drawer>
    <CollectImport ref="collectImport" :channel-list="channels" :providers="providers" />
  </div>
  </FullPage>
</template>
<script setup lang="ts">
import { computed, defineAsyncComponent, nextTick, ref, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useElementSize } from '@vueuse/core'
import { PanelCollapseButton, ResponsiveSplitter } from '@jetlinks-web-core/components'
import { useCollectionWorkspace } from './hook/useCollectionWorkspace'
import { usePointBatchEditor } from './hook/usePointBatchEditor'
import { useWorkspacePointLookup } from './hook/useWorkspacePointLookup'
import { usePointHistory } from './hook/usePointHistory'
import { useObjectState } from './hook/useObjectState'
import ObjectNavigation from './components/workspace/ObjectNavigation.vue'
import CollectorOverview from './components/workspace/CollectorOverview.vue'
import RuntimeCardMetrics from './components/workspace/RuntimeCardMetrics.vue'
import WorkspaceIcon from './components/workspace/WorkspaceIcon.vue'
import WorkspaceListControl from './components/workspace/WorkspaceListControl.vue'
import ObjectIdentity from './components/workspace/ObjectIdentity.vue'
import ObjectEditorOverlay from './components/workspace/ObjectEditorOverlay.vue'
import PointCollection from './components/workspace/PointCollection.vue'
import PointEditorError from './components/workspace/PointEditorError.vue'
import PointBatchToolbar from './components/workspace/PointBatchToolbar.vue'
import PointReadFeedback from './components/workspace/PointReadFeedback.vue'
import WorkspacePointTools from './components/workspace/WorkspacePointTools.vue'
import WorkspaceSearch from './components/workspace/WorkspaceSearch.vue'
import CollectImport from './Left/components/CollectImport.vue'
import WorkspaceSkeleton from './components/workspace/WorkspaceSkeleton.vue'
import WorkspaceEmpty from './components/workspace/WorkspaceEmpty.vue'
import WorkspacePointLookup from './components/workspace/WorkspacePointLookup.vue'
import DiagnosticTrigger from './components/workspace/DiagnosticTrigger.vue'
import type { CollectorObject } from '../../types/workspace'
import { runtimeSort, runtimeFilter } from '../../utils/workspaceList'
import './components/workspace/workspace.less'
import './components/workspace/configuration.less'
const LegacyWorkspace = defineAsyncComponent(() => import('./LegacyWorkspace.vue'))
const ObjectConfiguration = defineAsyncComponent(() => import('./components/workspace/ObjectConfiguration.vue'))
const CollectionSetup = defineAsyncComponent(() => import('./components/workspace/CollectionSetup.vue'))
const PointEditor = defineAsyncComponent(() => import('./components/workspace/PointEditor.vue'))
const DiagnosticContent = defineAsyncComponent(() => import('./components/workspace/DiagnosticContent.vue'))
const ProviderChooser = defineAsyncComponent(() => import('./components/workspace/ProviderChooser.vue'))
const PointBatchEditor = defineAsyncComponent(() => import('./components/workspace/PointBatchEditor.vue'))
const PointHistoryPanel = defineAsyncComponent(() => import('./components/workspace/PointHistoryPanel.vue'))
const { data, runtime, draft, batch, root, main, content, navigation, editorTarget, configurationEditor, objectTarget, objectKey, objectValue, objectDraft, objectEditor, sharedCount, objectSaved, folded, inline, view, editingId, advanced, objectForm, choosingProvider, setupProvider, startCollection, diagnosticId, diagnosticState, refresh, select, returnChannel, returnToList, cancelSetup, editObject, selectPoint, startBatch, closePoint, addPoint, diagnose, diagnosticVisibility, closeDiagnostic, visiblePoints } = useCollectionWorkspace()
const navigationContent = ref<InstanceType<typeof ObjectNavigation>>()
const history = usePointHistory(data, point => selectPoint(point.id))
const controlsContent = ref<HTMLElement>()
const { height: mainControlsHeight } = useElementSize(controlsContent)
const controlsHeight = computed(() => navigation.value?.compact || navigation.value?.collapsed ? mainControlsHeight.value : Math.max(navigationContent.value?.controlsHeight || 0, mainControlsHeight.value))
const { collector, channel, selectedChannelId, collectors, filteredCollectors, channels, providers, points, filteredPoints, selectedPoint, selectedLoading, selectedError, initializing, loading, pointLoading, ordering, indexTime, error, valueError, paused, total, search, pointSearch, pointState, collectorState, pointSort, collectorSort } = data
const headingAnchor=ref<HTMLElement>(),channelAnchor=ref<HTMLElement>(),channelPreviewOpen=ref(false)
const pointCollection=ref<InstanceType<typeof PointCollection>>()
const pointLookup=useWorkspacePointLookup(data,select,pointCollection)
const headingObject=computed(()=>collector.value || (selectedChannelId.value ? channel.value : undefined))
const returnTitle=computed(()=>collector.value ? `${t('collectorNavigation.backCollectors')} · ${returnChannel.value?.name || t('collectorWorkspace.allCollectors')}` : t('collectorNavigation.backAll'))
const objectState=useObjectState(data)
function openSettings(kind:'channel'|'collector',event:MouseEvent) {
  const object=kind === 'collector' ? collector.value : channel.value,anchor=kind === 'channel' && collector.value ? channelAnchor.value : headingAnchor.value
  if(!object || !anchor)return
  if(objectForm.value === kind && objectValue.value?.id === object.id)editObject()
  else editObject({kind,object,anchor,trigger:kind === 'channel' && collector.value ? anchor : event.currentTarget as HTMLElement,surface:kind === 'channel' && collector.value ? 'channel' : 'header'})
}
const mountedEditor = shallowRef<CollectorObject>()
const editingSummary = computed(() => points.value.find(point => point.id === editingId.value))
watch(() => collector.value?.id, () => { mountedEditor.value=undefined;channelPreviewOpen.value=false })
const { state: selection, busy: batchBusy } = batch
const listReading = computed(() => data.trialState.value.scope === 'list' && data.trialState.value.running)
const { t } = useI18n()
const batchEntryLabel = computed(() => t(selection.value.keys.length ? 'collectorBatch.editSelected' : pointSearch.value.trim() || pointState.value ? 'collectorBatch.editFiltered' : 'collectorBatch.editAll', { count: selection.value.keys.length || filteredPoints.value.length }))
const pointTools = ref<InstanceType<typeof WorkspacePointTools>>()
const collectImport = ref<InstanceType<typeof CollectImport>>()
function clearListFilters() {
  if(collector.value) { pointSearch.value='';pointState.value='';data.filterPoints() }
  else { search.value='';collectorState.value='';data.filterCollectors() }
}
const batchEditor = usePointBatchEditor(collector, points, computed(() => pointTools.value?.batchAdapter), data.loadPoints)
const batchHeading = ref<HTMLElement>()
let pointScroll = 0, pointScrollCollector = '', pointPosition:ReturnType<InstanceType<typeof PointCollection>['getPosition']> | undefined
async function enterBatch() {
  if (draft.hasCurrentChanges.value || batchBusy.value || saving.value) return
  pointScroll = content.value?.scrollTop || 0
  pointPosition = pointCollection.value?.getPosition()
  pointScrollCollector = collector.value?.id || ''
  // The current filtered directory includes offscreen points, unlike the rendered row window.
  const ids = selection.value.keys.length ? [...selection.value.keys] : filteredPoints.value.filter(point => !point.id.startsWith('_new:')).map(point => point.id)
  const scope = batchEntryLabel.value
  closePoint(); closeDiagnostic(); objectForm.value = undefined; await batchEditor.start(ids,scope); batch.clear(); data.setVisiblePoints([])
}
watch(batchEditor.open, async open => { if (!open) { await nextTick(); if (content.value && collector.value?.id === pointScrollCollector) { content.value.scrollTop = pointScroll; if(pointPosition)await pointCollection.value?.restorePosition(pointPosition) } } })
const moreOpen = ref(false)
const moreTrigger = ref<HTMLButtonElement>(), moreActions = ref<HTMLElement>()
// 浮层挂载在页面末尾；Tab 从入口进入首个可用操作，Shift+Tab 返回入口。
function focusMore(event: KeyboardEvent) {
  if (!moreOpen.value) return
  const first = moreActions.value?.querySelector<HTMLButtonElement>('button:not(:disabled)')
  if (event.shiftKey && event.target === first) { event.preventDefault(); moreTrigger.value?.focus({ preventScroll: true }) }
  else if (!event.shiftKey && event.currentTarget === moreTrigger.value && first) { event.preventDefault(); first.focus({ preventScroll: true }) }
}
function closeMore() { moreOpen.value = false; moreTrigger.value?.focus({ preventScroll: true }) }
watch(moreOpen, open => { if (!open && diagnosticId.value === headingObject.value?.id) closeDiagnostic() })
const sortOptions = computed(() => [
  { value: 'attention', label: t('collectorList.attentionFirst'), icon: 'WarningOutlined', description: t('collectorList.attentionHint') },
  { value: 'duration', label: t('collectorList.slowestFirst'), icon: 'FieldTimeOutlined', description: t('collectorList.slowestHint') },
  { value: 'gap', label: t('collectorList.gapFirst'), icon: 'HistoryOutlined', description: t('collectorList.gapHint') },
  { value: 'filtered', label: t('collectorList.filteredFirst'), icon: 'FilterOutlined', description: t('collectorList.filteredHint') },
  { value: 'newest', label: t('collectorList.newest'), icon: 'ClockCircleOutlined', description: t('collectorList.newestHint') },
  { value: 'name', label: t('collectorList.byName'), icon: 'SortAscendingOutlined', description: t('collectorList.nameHint') },
  { value: 'pointKey', label: t('collectorList.byKey'), icon: 'NumberOutlined', description: t('collectorList.keyHint') },
])
const stateOptions = computed(() => [
  {value:'', label:t('collectorWorkspace.allStates'), icon:'AppstoreOutlined', description:t('collectorList.allHint')},
  {value:'attention', label:t('collectorList.needsAttention'), icon:'WarningOutlined', description:t('collectorList.attentionHint')},
  {value:'running', label:t('collectorRuntime.states.running'), icon:'CheckCircleOutlined', description:t('collectorList.runningHint')},
  {value:'protection', label:t('collectorList.protected'), icon:'SafetyOutlined', description:t('collectorList.protectedHint')},
  {value:'unavailable', label:t('collectorWorkspace.unavailable'), icon:'QuestionCircleOutlined', description:t('collectorList.unavailableHint')},
  {value:'enabled', label:t('collectorWorkspace.enabled'), icon:'PlayCircleOutlined', description:t('collectorList.enabledHint')},
  {value:'disabled', label:t('collectorWorkspace.disabled'), icon:'PauseCircleOutlined', description:t('collectorList.disabledHint')},
].map(option=>({...option,count:data.stateCounts.value[option.value]})))
const { model, dirty, saving, error: draftError, revision } = draft
async function onCollectionCreated(value: CollectorObject) { setupProvider.value = undefined; configurationEditor.value = undefined; await refresh(); select(value) }
</script>
