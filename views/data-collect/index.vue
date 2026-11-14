<template>
  <FullPage flex transparent-background class="cw-page">
  <div ref="root" class="collection-workspace" :class="{ 'cw-collapsed': folded || narrow }">
    <EqualHeightColumns class="cw-layout" left-width="15rem" :collapsible="false" :show-left="!folded && !narrow">
      <template #left><aside class="cw-sidebar"><div ref="sidebar" /></aside></template>
      <template #right><main ref="main" class="cw-main">
        <header v-if="!setupProvider" class="cw-head">
          <div class="cw-row">
            <button class="cw-icon-button cw-nav-trigger" :aria-label="$t('collectorWorkspace.navigation')" :title="$t('collectorWorkspace.navigation')" @click="drawerOpen = true"><WorkspaceIcon name="menu" :size="21" /></button>
            <button v-if="collector" class="cw-icon-button" :aria-label="$t('collectorWorkspace.allCollectors')" :title="$t('collectorWorkspace.allCollectors')" @click="select()"><AIcon type="ArrowLeftOutlined" /></button>
            <WorkspaceIcon class="cw-heading-icon" :object="collector" :name="collector ? undefined : 'grid'" :size="25" />
            <h1>{{ choosingProvider || setupProvider ? $t('collectorWorkspace.newCollection') : collector?.name || $t('collectorWorkspace.allCollectors') }}</h1>
            <WorkspaceStatus v-if="collector" :object="collector" />
            <RuntimeCardMetrics v-if="collector" :object="collector" kind="collector" />
            <DiagnosticTrigger v-if="collector" :open="diagnosticId === collector.id" :label="$t('collectorWorkspace.diagnostics')" @visibility="visible => visible ? diagnose('collector', collector!) : closeDiagnostic()"><DiagnosticContent :state="diagnosticState" @close="closeDiagnostic" /></DiagnosticTrigger>
          </div>
          <div class="cw-row">
            <j-permission-button v-if="collector" hasPermission="data-collect:view" @click="data.trial()"><AIcon type="PlayCircleOutlined" />{{ $t('collectorWorkspace.read') }}</j-permission-button>
            <j-permission-button v-if="collector" type="primary" hasPermission="data-collect:add" @click="addPoint"><AIcon type="PlusOutlined" />{{ $t('collectorWorkspace.newPoint') }}</j-permission-button>
            <WorkspacePointTools v-if="collector" :key="collector.id" :collector="collector" :disabled="batchBusy || saving" @saved="data.loadPoints" />
            <j-permission-button v-else-if="!choosingProvider && !setupProvider" hasPermission="data-collect:add" type="primary" @click="choosingProvider = true"><AIcon type="PlusOutlined" />{{ $t('collectorWorkspace.newCollection') }}</j-permission-button>
            <a-dropdown :trigger="['click']"><button class="cw-icon-button" :aria-label="$t('collectorWorkspace.more')"><AIcon type="MoreOutlined" /></button><template #overlay><a-menu>
              <a-menu-item v-if="collector" @click="editObject('collector')"><span class="collector-config-option"><AIcon type="SettingOutlined" /><span class="collector-config-option-copy">{{ $t('collectorWorkspace.collectorSettings') }}<small>{{ $t('collectorOptions.settingsHint') }}</small></span></span></a-menu-item>
              <a-menu-item @click="advanced = true"><span class="collector-config-option"><AIcon type="ControlOutlined" /><span class="collector-config-option-copy">{{ $t('collectorWorkspace.advanced') }}<small>{{ $t('collectorOptions.advancedHint') }}</small></span></span></a-menu-item>
              <a-menu-item @click="refresh"><span class="collector-config-option"><AIcon type="ReloadOutlined" /><span class="collector-config-option-copy">{{ $t('collectorWorkspace.refresh') }}<small>{{ $t('collectorOptions.refreshHint') }}</small></span></span></a-menu-item>
            </a-menu></template></a-dropdown>
          </div>
        </header>
        <ProviderChooser v-if="choosingProvider" :providers="providers" @cancel="choosingProvider = false" @select="provider => { setupProvider = provider; choosingProvider = false }" />
        <CollectionSetup v-else-if="setupProvider" ref="configurationEditor" :key="setupProvider.id" :provider="setupProvider" :channels="channels" @cancel="cancelSetup" @navigation="drawerOpen = true" @saved="onCollectionCreated" />
        <template v-else>
        <div v-if="collector" class="cw-channel">
          <span class="cw-row cw-channel-name"><AIcon type="ApiOutlined" /><span class="cw-channel-label" :title="channel?.name || collector.channelName">{{ channel?.name || collector.channelName || '—' }}</span><WorkspaceStatus v-if="channel" :object="channel" /></span>
          <RuntimeCardMetrics v-if="channel" :object="channel" kind="channel" />
          <j-permission-button v-if="channel" type="link" class="cw-channel-action" :aria-label="$t('collectorWorkspace.connection')" :title="$t('collectorWorkspace.connection')" hasPermission="data-collect:update" @click="editObject(objectForm === 'channel' ? undefined : 'channel')"><AIcon type="SettingOutlined" /><span class="cw-channel-action-label">{{ $t('collectorWorkspace.connection') }}</span></j-permission-button>
        </div>
        <ObjectConfiguration v-if="objectForm" ref="configurationEditor" :key="objectForm" :kind="objectForm" :value="objectForm === 'channel' ? channel : collector" :channels="channels" :providers="providers" @close="editObject()" @saved="onObjectSaved" />
        <div class="cw-toolbar">
          <a-input-search v-if="collector" v-model:value="pointSearch" class="cw-search" allow-clear :disabled="batchBusy" :placeholder="$t('collectorWorkspace.searchPoints')" @search="data.filterPoints" />
          <a-input-search v-else v-model:value="search" class="cw-search" allow-clear :placeholder="$t('collectorWorkspace.searchCollectors')" @search="data.filterCollectors" />
          <div v-if="collector" class="cw-row">
            <ConfigSelect v-model:value="pointSort" style="width:128px" :disabled="batchBusy" :options="sortOptions" @change="data.filterPoints" />
            <ConfigSelect v-model:value="pointState" style="width:120px" :disabled="batchBusy" @change="data.filterPoints" :options="stateOptions" />
            <button class="cw-icon-button" :aria-label="$t(paused ? 'collectorWorkspace.resume' : 'collectorWorkspace.pause')" :aria-pressed="paused" @click="paused = !paused"><AIcon :type="paused ? 'PlayCircleOutlined' : 'PauseCircleOutlined'" /></button>
            <a-segmented v-if="!inline" v-model:value="view" :options="[{value:'cards',payload:{icon:'AppstoreOutlined',title:$t('collectorWorkspace.cards')}},{value:'table',payload:{icon:'UnorderedListOutlined',title:$t('collectorWorkspace.table')}}]"> <template #label="{payload}"><span :title="payload.title" :aria-label="payload.title"><AIcon :type="payload.icon" /></span></template></a-segmented>
          </div>
          <div v-else class="cw-row"><small v-if="!loading && !initializing && !error" class="cw-muted">{{ $t('collectorWorkspace.collectorCount', { count: total }) }}</small><ConfigSelect v-model:value="collectorSort" style="width:128px" :options="sortOptions.filter(option => !['pointKey', 'gap'].includes(option.value))" @change="data.filterCollectors" /><ConfigSelect v-model:value="collectorState" style="width:120px" :options="stateOptions" @change="data.filterCollectors" /></div>
          <a-tooltip v-if="indexTime && (runtimeSort(collector ? pointSort : collectorSort) || runtimeFilter(collector ? pointState : collectorState))" :title="$t('collectorList.snapshotHint', { time: new Date(indexTime).toLocaleTimeString() })"><a-button type="text" size="small" :loading="ordering" @click="collector ? data.filterPoints() : data.filterCollectors()"><AIcon type="ReloadOutlined" />{{ $t('collectorList.refreshOrder') }}</a-button></a-tooltip>
        </div>
        <a-alert v-if="error" :message="error" type="error" show-icon><template #action><a-button size="small" @click="refresh">{{ $t('collectorWorkspace.retry') }}</a-button></template></a-alert>
        <WorkspaceSkeleton v-if="collector ? pointLoading && !points.length : (loading || initializing) && !collectors.length" :kind="collector ? view === 'table' && !inline ? 'table' : 'points' : 'collectors'" />
        <a-spin v-else :spinning="loading || pointLoading || ordering">
          <template v-if="collector">
            <PointBatchToolbar :state="selection" @all="batch.all" @clear="batch.clear" @run="batch.run" />
            <PointCollection :points="filteredPoints" :selected="editingId" :inline="inline" :view="view" :diagnostic-id="diagnosticId" :selection="selection" @check="batch.toggle" @checks="batch.check" @select="selectPoint" @diagnostic-visibility="diagnosticVisibility" @visible="visiblePoints">
              <template #editor><div ref="editorHost" /></template>
              <template #diagnostic><DiagnosticContent :state="diagnosticState" @close="closeDiagnostic" /></template>
            </PointCollection>
            <div class="cw-update-status"><i class="cw-dot" :class="valueError ? 'warn' : paused ? 'gray' : 'ok'" />{{ $t(valueError ? 'collectorWorkspace.streamDisconnected' : paused ? 'collectorWorkspace.paused' : 'collectorWorkspace.live') }}<span v-if="valueError" :title="valueError">· {{ $t('collectorWorkspace.lastValue') }}</span></div>
          </template>
          <template v-else><CollectorOverview :collectors="filteredCollectors" :providers="providers" @select="select" /><a-empty v-if="!filteredCollectors.length && !loading && !error" :description="$t('collectorWorkspace.noCollectors')" /><div v-if="collectors.length" class="cw-update-status"><i class="cw-dot" :class="valueError ? 'warn' : 'ok'" />{{ $t(valueError ? 'collectorWorkspace.streamDisconnected' : 'collectorWorkspace.live') }}<a-button v-if="valueError" type="link" size="small" @click="refresh">{{ $t('collectorWorkspace.retry') }}</a-button></div></template>
        </a-spin>
        </template>
      </main></template>
    </EqualHeightColumns>
    <a-drawer v-model:open="drawerOpen" placement="left" :width="240" :closable="false" :force-render="true" root-class-name="cw-navigation-drawer"><div class="collection-workspace"><div ref="drawerHost" /></div></a-drawer>
    <Teleport v-if="navigationTarget" :to="navigationTarget"><ObjectNavigation :collectors="collectors" :channels="channels" :selected="collector?.id" :total="error && !collectors.length ? undefined : collectors.length" :loading="initializing || loading && !collectors.length" :drawer="narrow || folded" :expandable="folded && !narrow" @select="select" @close="drawerOpen = false" @collapse="folded = true" @expand="folded = false; drawerOpen = false" /></Teleport>
    <Teleport v-if="model && collector && editingId" :to="editorTarget || '#cw-editor-parking'"><PointEditor :key="`${collector.id}:${model.id}:${revision}`" :model="model" :collector="collector" :dirty="dirty" :saving="saving" :error="draftError" @apply="draft.apply" @restore="draft.restore" @trial="data.trial(selectedPoint)" @close="closePoint" /></Teleport>
    <div id="cw-editor-parking" hidden />
    <a-drawer v-model:open="advanced" :width="'min(1200px, 100vw)'" :title="$t('collectorWorkspace.advanced')" destroy-on-close><LegacyWorkspace v-if="advanced" /></a-drawer>
  </div>
  </FullPage>
</template>
<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue'
import { useI18n } from 'vue-i18n'
import { useCollectionWorkspace } from './hook/useCollectionWorkspace'
import ObjectNavigation from './components/workspace/ObjectNavigation.vue'
import CollectorOverview from './components/workspace/CollectorOverview.vue'
import RuntimeCardMetrics from './components/workspace/RuntimeCardMetrics.vue'
import WorkspaceIcon from './components/workspace/WorkspaceIcon.vue'
import ConfigSelect from '../../components/ConfigSelect.vue'
import WorkspaceStatus from './components/workspace/WorkspaceStatus.vue'
import PointCollection from './components/workspace/PointCollection.vue'
import PointBatchToolbar from './components/workspace/PointBatchToolbar.vue'
import WorkspacePointTools from './components/workspace/WorkspacePointTools.vue'
import WorkspaceSkeleton from './components/workspace/WorkspaceSkeleton.vue'
import PointEditor from './components/workspace/PointEditor.vue'
import DiagnosticContent from './components/workspace/DiagnosticContent.vue'
import DiagnosticTrigger from './components/workspace/DiagnosticTrigger.vue'
import ProviderChooser from './components/workspace/ProviderChooser.vue'
import type { CollectorObject } from '../../types/workspace'
import { runtimeSort, runtimeFilter } from '../../utils/workspaceList'
import './components/workspace/workspace.less'
const LegacyWorkspace = defineAsyncComponent(() => import('./LegacyWorkspace.vue'))
const ObjectConfiguration = defineAsyncComponent(() => import('./components/workspace/ObjectConfiguration.vue'))
const CollectionSetup = defineAsyncComponent(() => import('./components/workspace/CollectionSetup.vue'))
const { data, runtime, draft, batch, root, main, sidebar, drawerHost, editorHost, navigationTarget, editorTarget, configurationEditor, drawerOpen, folded, narrow, inline, view, editingId, advanced, objectForm, choosingProvider, setupProvider, diagnosticId, diagnosticState, refresh, select, cancelSetup, editObject, selectPoint, closePoint, addPoint, diagnose, diagnosticVisibility, closeDiagnostic, visiblePoints } = useCollectionWorkspace()
const { collector, channel, collectors, filteredCollectors, channels, providers, points, filteredPoints, selectedPoint, initializing, loading, pointLoading, ordering, indexTime, error, valueError, paused, total, search, pointSearch, pointState, collectorState, pointSort, collectorSort } = data
const { state: selection, busy: batchBusy } = batch
const { t } = useI18n()
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
])
const { model, dirty, saving, error: draftError, revision } = draft
function onObjectSaved() { objectForm.value = undefined; void refresh() }
async function onCollectionCreated(value: CollectorObject) { setupProvider.value = undefined; configurationEditor.value = undefined; await refresh(); select(value) }
</script>
