import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { update as updateChannel } from '../../../api/data-collect/channel'
import { update as updateCollector } from '../../../api/data-collect/collector'
import { stateValue } from '../../../types/workspace'
import type { useWorkspaceData } from './useWorkspaceData'

/** Changes persisted enablement without replacing runtime observations or open drafts. */
export function useObjectState(data: ReturnType<typeof useWorkspaceData>) {
  const { t } = useI18n()
  const busy = ref(false), error = ref('')
  const object = computed(() => data.collector.value || data.channel.value)
  const state = computed(() => stateValue(object.value?.state))
  const available = computed(() => ['enabled', 'disabled'].includes(state.value))
  const label = computed(() => t(state.value === 'enabled' ? 'Channel.index.290640-7' : 'Channel.index.290640-12'))
  watch(() => object.value?.id, () => { error.value = '' })
  async function toggle() {
    if (busy.value || !object.value || !available.value) return
    const target = object.value, kind = data.collector.value ? 'collector' : 'channel'
    const next = state.value === 'enabled' ? 'disabled' : 'enabled'
    busy.value = true; error.value = ''
    try {
      const response = await (kind === 'collector' ? updateCollector : updateChannel)(target.id, {
        state: next, runningState: next === 'enabled' ? 'running' : 'stopped',
      })
      if (!response.success) throw new Error(response.message || t('collectorWorkspace.saveFailed'))
      const current = (kind === 'collector' ? data.collectors : data.channels).value.find(item => item.id === target.id)
      if (current) data.applyObject(kind, { ...current, state: next })
    } catch (cause) {
      if (object.value?.id === target.id) error.value = cause instanceof Error ? cause.message : String(cause)
    } finally { busy.value = false }
  }
  return { busy, error, available, state, label, toggle }
}
