import { computed, ref, type Ref } from 'vue'
import { cloneDeep, omit, pick } from 'lodash-es'
import { useI18n } from 'vue-i18n'
import { save as saveChannel } from '../../../api/data-collect/channel'
import { save as saveCollector } from '../../../api/data-collect/collector'
import type { CollectorObject, ProviderDescriptor } from '../../../types/workspace'

export interface SetupForm { model: CollectorObject; dirty: boolean; validate(): Promise<unknown> }

/** One apply creates the connection first, then its collector; a retry reuses a saved connection. */
export function useCollectionSetup(provider: ProviderDescriptor, channels: Ref<CollectorObject[]>, saved: (value: CollectorObject) => void) {
  const { t } = useI18n()
  const channelForm = ref<SetupForm>(), collectorForm = ref<SetupForm>()
  const existingChannelId = ref(''), createdChannelId = ref(''), saving = ref(false), error = ref('')
  const availableChannels = computed(() => channels.value.filter(item => item.provider === provider.id))
  const connection = computed(() => existingChannelId.value ? availableChannels.value.find(item => item.id === existingChannelId.value) : channelForm.value?.model)
  const dirty = computed(() => !!createdChannelId.value || !!existingChannelId.value || !!channelForm.value?.dirty || !!collectorForm.value?.dirty)
  const expanded = ref(true)
  const initialChannel: CollectorObject = { id: '', name: `${provider.name || provider.id} ${t('collectorWorkspace.channel')}`, provider: provider.id, configuration: {} }
  const initialCollector: CollectorObject = { ...initialChannel, configuration: {} }
  initialCollector.name = provider.name || provider.id
  const collectorName = computed({ get: () => collectorForm.value?.model.name ?? initialCollector.name, set: value => { if (collectorForm.value) collectorForm.value.model.name = value; else initialCollector.name = value } })
  const channelName = computed({ get: () => channelForm.value?.model.name ?? initialChannel.name, set: value => { if (channelForm.value) channelForm.value.model.name = value; else initialChannel.name = value } })
  async function apply() {
    if (saving.value || !collectorForm.value) return
    error.value = ''
    try {
      await collectorForm.value.validate()
      if (!collectorForm.value.model.name.trim()) throw new Error(t('collectorWorkspace.nameRequired'))
      if (!existingChannelId.value && !createdChannelId.value) await channelForm.value?.validate()
      saving.value = true
      let channelId = existingChannelId.value || createdChannelId.value
      if (!channelId) {
        if (!channelForm.value) return
        const response = await saveChannel(omit(cloneDeep(channelForm.value.model), ['id', 'accessModes', 'features', 'interval', 'managedConfiguration']))
        if (!response.success || !response.result?.id) throw new Error(response.message || t('collectorWorkspace.saveFailed'))
        channelId = createdChannelId.value = response.result.id
      }
      const model = cloneDeep(collectorForm.value.model), keys = ['accessModes', 'features', 'interval', 'managedConfiguration']
      const response = await saveCollector({ ...omit(model, ['id', ...keys]), channelId, configuration: { ...model.configuration, template: pick(model, keys) } })
      if (!response.success || !response.result?.id) throw new Error(response.message || t('collectorWorkspace.saveFailed'))
      saved({ ...model, ...response.result, channelId })
    } catch (cause) { if (cause instanceof Error) error.value = cause.message }
    finally { saving.value = false }
  }
  return { channelForm, collectorForm, existingChannelId, createdChannelId, availableChannels, connection, dirty, expanded, collectorName, channelName, saving, error, initialChannel, initialCollector, apply }
}
