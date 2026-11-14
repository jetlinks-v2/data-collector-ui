<template>
  <div class="cw-batch-toolbar" role="group" :aria-label="$t('collectorList.batch')" :aria-busy="state.busy">
    <a-checkbox :checked="state.total > 0 && state.keys.length === state.total" :indeterminate="state.keys.length > 0 && state.keys.length < state.total" :disabled="state.busy || !state.total" @change="$emit('all')">{{ $t('collectorList.thisPage') }}</a-checkbox>
    <template v-if="state.keys.length">
      <small class="cw-muted">{{ $t('collectorList.selected', { count: state.keys.length }) }}</small>
      <a-tooltip :title="state.blocked ? $t('collectorList.applyDraft') : undefined">
        <span class="cw-batch-actions">
          <j-permission-button size="small" hasPermission="data-collect:action" :disabled="state.busy || state.blocked" @click="$emit('run', 'enable')"><AIcon type="PlayCircleOutlined" />{{ $t('collectorListActions.enable') }}</j-permission-button>
          <j-permission-button size="small" hasPermission="data-collect:action" :disabled="state.busy || state.blocked" @click="$emit('run', 'disable')"><AIcon type="PauseCircleOutlined" />{{ $t('collectorListActions.disable') }}</j-permission-button>
          <j-permission-button size="small" hasPermission="data-collect:view" :disabled="state.busy || state.blocked" @click="$emit('run', 'read')"><AIcon type="ExperimentOutlined" />{{ $t('collectorWorkspace.read') }}</j-permission-button>
        </span>
      </a-tooltip>
      <a-button size="small" type="text" :disabled="state.busy" @click="$emit('clear')">{{ $t('collectorList.clear') }}</a-button>
    </template>
    <span v-if="state.busy" class="cw-muted" role="status"><AIcon type="LoadingOutlined" /> {{ $t('collectorList.working') }}</span>
    <span v-else-if="state.feedback" class="cw-batch-feedback" :class="{failed: state.failed}" role="status"><AIcon :type="state.failed ? 'ExclamationCircleOutlined' : 'CheckCircleOutlined'" />{{ state.feedback }}</span>
  </div>
</template>
<script setup lang="ts">
import type { PointBatchAction, PointSelection } from '../../../../utils/workspaceList'
defineProps<{ state: PointSelection }>()
defineEmits<{ all: []; clear: []; run: [action: PointBatchAction] }>()
</script>
