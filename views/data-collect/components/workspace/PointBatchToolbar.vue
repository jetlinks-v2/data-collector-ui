<template>
  <div class="cw-batch-toolbar" role="group" :aria-label="$t('collectorList.batch')" :aria-busy="state.busy">
    <template v-if="!state.selecting">
      <a-tooltip :title="state.blocked ? $t('collectorList.applyDraft') : undefined"><span><a-button size="small" type="text" :disabled="state.busy || state.blocked || !state.total" @click="$emit('start')"><AIcon type="CheckSquareOutlined" />{{ $t('collectorWorkspace.selectMultiple') }}</a-button></span></a-tooltip>
    </template>
    <a-checkbox v-else class="cw-batch-summary" :checked="state.total > 0 && state.keys.length === state.total" :indeterminate="state.keys.length > 0 && state.keys.length < state.total" :disabled="state.busy || !state.total" :aria-label="$t('collectorList.filteredSelection', { count: state.total })" :title="$t('collectorList.filteredSelection', { count: state.total })" @change="$emit('all')">{{ $t('collectorList.selected', { count: state.keys.length }) }}<small class="cw-muted"> / {{ state.total }}</small></a-checkbox>
    <template v-if="state.selecting">
      <a-tooltip :title="state.blocked ? $t('collectorList.applyDraft') : undefined">
        <span class="cw-batch-actions">
          <j-permission-button size="small" hasPermission="data-collect:action" :disabled="state.busy || state.blocked || !state.keys.length" @click="$emit('run', 'enable')"><AIcon type="PlayCircleOutlined" />{{ $t('collectorListActions.enable') }}</j-permission-button>
          <j-permission-button size="small" hasPermission="data-collect:action" :disabled="state.busy || state.blocked || !state.keys.length" @click="$emit('run', 'disable')"><AIcon type="PauseCircleOutlined" />{{ $t('collectorListActions.disable') }}</j-permission-button>
          <j-permission-button size="small" hasPermission="data-collect:view" :disabled="state.busy || state.blocked || !state.keys.length" @click="$emit('run', 'read')"><AIcon type="ExperimentOutlined" />{{ $t('collectorWorkspace.read') }}</j-permission-button>
        </span>
      </a-tooltip>
    </template>
    <a-button v-if="state.selecting" class="cw-batch-exit" size="small" type="text" :disabled="state.busy" @click="$emit('clear')"><AIcon type="CloseOutlined" />{{ $t('collectorWorkspace.exitSelection') }}</a-button>
    <span v-if="state.busy && state.selecting" class="cw-muted" role="status"><AIcon type="LoadingOutlined" /> {{ $t('collectorList.working') }}</span>
    <span v-else-if="state.feedback" class="cw-batch-feedback" :class="{failed: state.failed}" role="status"><AIcon :type="state.failed ? 'ExclamationCircleOutlined' : 'CheckCircleOutlined'" />{{ state.feedback }}</span>
  </div>
</template>
<script setup lang="ts">
import type { PointBatchAction, PointSelection } from '../../../../utils/workspaceList'
defineProps<{ state: PointSelection }>()
defineEmits<{ start: []; all: []; clear: []; run: [action: PointBatchAction] }>()
</script>
