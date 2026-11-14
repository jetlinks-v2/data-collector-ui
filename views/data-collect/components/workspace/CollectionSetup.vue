<template>
  <section class="cw-setup">
    <header class="cw-head">
      <div class="cw-row cw-setup-title"><button class="cw-icon-button cw-nav-trigger" :aria-label="$t('collectorWorkspace.navigation')" @click="$emit('navigation')"><WorkspaceIcon name="menu" :size="21" /></button><WorkspaceIcon class="cw-heading-icon" :object="initialCollector" :size="25" /><a-input v-model:value="collectorName" :bordered="false" :maxlength="64" class="cw-title-input" :aria-label="$t('collectorWorkspace.name')" /><span class="cw-badge gray">{{ $t('collectorWorkspace.unsaved') }}</span></div>
      <a-button type="text" :disabled="saving" @click="$emit('cancel')"><AIcon type="ArrowLeftOutlined" />{{ $t('collectorWorkspace.selectPlugin') }}</a-button>
    </header>
    <div class="cw-channel">
      <div class="cw-row cw-setup-connection"><AIcon type="ApiOutlined" />
        <ConfigSelect v-if="availableChannels.length" v-model:value="existingChannelId" :disabled="saving || !!createdChannelId" :bordered="false" :aria-label="$t('collectorWorkspace.channel')" :options="[{value:'',label:channelName,icon:'PlusOutlined',description:$t('collectorOptions.create')},...availableChannels.map(item => ({value:item.id,label:item.name,icon:'ApiOutlined',description:$t('collectorOptions.reuse')}))]" />
        <a-input v-else v-model:value="channelName" :disabled="saving || !!createdChannelId" :bordered="false" :maxlength="64" :aria-label="$t('collectorWorkspace.channel')" />
        <button class="cw-icon-button" :aria-label="$t('collectorWorkspace.connection')" :aria-expanded="expanded" @click="expanded = !expanded"><AIcon type="SettingOutlined" /></button>
      </div>
      <small class="cw-muted">{{ provider.name || provider.id }}</small>
    </div>
    <section v-show="expanded" class="cw-connection-editor">
      <div class="cw-between cw-section-heading"><h2>{{ $t('collectorWorkspace.connectionAndCollection') }}</h2><small v-if="createdChannelId" class="cw-muted"><AIcon type="CheckCircleOutlined" />{{ $t('collectorWorkspace.connectionSaved') }}</small></div>
      <template v-if="!existingChannelId">
        <fieldset :disabled="saving || !!createdChannelId"><ObjectConfiguration ref="channelForm" kind="channel" :value="initialChannel" :channels="channels" :providers="[provider]" form-only /></fieldset>
      </template>
      <ObjectConfiguration ref="collectorForm" kind="collector" :value="initialCollector" :channels="channels" :providers="[provider]" :connection="connection" form-only />
      <a-alert v-if="error" type="error" :message="error" show-icon />
      <div class="cw-between cw-connection-actions"><small class="cw-muted">{{ $t('collectorWorkspace.unsaved') }}</small><j-permission-button type="primary" has-permission="data-collect:add" :loading="saving" @click="apply"><AIcon type="CheckOutlined" />{{ $t('collectorWorkspace.applyConnection') }}</j-permission-button></div>
    </section>
    <div class="cw-toolbar"><span class="cw-muted">{{ $t('collectorWorkspace.pointCount', { count: 0 }) }}</span><a-tooltip :title="$t('collectorWorkspace.applyFirst')"><a-button disabled><AIcon type="PlusOutlined" />{{ $t('collectorWorkspace.newPoint') }}</a-button></a-tooltip></div>
    <div class="cw-points-empty"><WorkspaceIcon name="grid" :size="28" /><span>{{ $t('collectorWorkspace.applyFirst') }}</span></div>
  </section>
</template>
<script setup lang="ts">
import { toRef } from 'vue'
import type { CollectorObject, ProviderDescriptor } from '../../../../types/workspace'
import { useCollectionSetup } from '../../hook/useCollectionSetup'
import ObjectConfiguration from './ObjectConfiguration.vue'
import WorkspaceIcon from './WorkspaceIcon.vue'
import ConfigSelect from '../../../../components/ConfigSelect.vue'
const props = defineProps<{ provider: ProviderDescriptor; channels: CollectorObject[] }>()
const emit = defineEmits<{ cancel: []; navigation: []; saved: [value: CollectorObject] }>()
const { channelForm, collectorForm, existingChannelId, createdChannelId, availableChannels, connection, dirty, expanded, collectorName, channelName, saving, error, initialChannel, initialCollector, apply } = useCollectionSetup(props.provider, toRef(props, 'channels'), value => emit('saved', value))
defineExpose({ dirty, saving })
</script>
