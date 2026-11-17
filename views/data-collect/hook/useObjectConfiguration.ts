import { computed, onBeforeUnmount, provide, reactive, ref, watch } from 'vue'
import { cloneDeep, isEqual, omit, pick } from 'lodash-es'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import { save as saveChannel, update as updateChannel } from '../../../api/data-collect/channel'
import { save as saveCollector, update as updateCollector } from '../../../api/data-collect/collector'
import { devGetProtocol } from '../../../utils/utils'
import { DATA_COLLECTOR_SAVE_TYPE } from '../data'
import { queryPointMetadata } from '../../../api/data-collect/collector'
import type { CollectorObject, EntityKind, PointCapabilities, ProviderDescriptor } from '../../../types/workspace'

export interface ObjectConfigurationDraft { model: CollectorObject; baseline: CollectorObject }
interface Options { kind: Exclude<EntityKind, 'point'>; value?: CollectorObject; channels: CollectorObject[]; providers: ProviderDescriptor[]; connection?: Partial<CollectorObject>; draft?: ObjectConfigurationDraft }
const templateKeys = ['accessModes', 'features', 'interval', 'managedConfiguration']

/** Host the existing plugin Vue form; dependent fields and validation stay with the plugin. */
export function useObjectConfiguration(props: Options, saved: (value: CollectorObject) => void) {
  const { t } = useI18n()
  const model = reactive(Object.assign({ configuration: {}, managedConfiguration: {}, features: [], accessModes: ['read'], interval: 1000 }, cloneDeep(props.draft?.model || omit(props.value, ['runtime', 'monitoring'])))) as CollectorObject
  const channel = reactive<Partial<CollectorObject>>({})
  const capabilities = ref<PointCapabilities>({}), source = ref(''), loading = ref(false), saving = ref(false), error = ref(''), saveError = ref(''), formRevision = ref(0), pluginReady = ref(false), prepared = ref(false)
  let revision = 0, metadataRevision = 0
  provide('plugin-form', model)
  provide('plugin-form-channel', channel)
  provide('point-form-collector', {})
  provide('metadata-configuration', capabilities)
  provide('old-collector', ref({}))
  provide(DATA_COLLECTOR_SAVE_TYPE, props.kind)
  const selectedChannel = computed(() => props.channels.find(item => item.id === model.channelId))
  const providerLabel = computed(() => props.providers.find(item => item.id === model.provider)?.name || model.provider)
  if (props.kind === 'collector' && !props.draft) Object.assign(model, cloneDeep(model.configuration.template || {}))
  const baseline = ref(cloneDeep(props.draft?.baseline || model))
  const dirty = computed(() => !isEqual(omit(model, ['channelName']), omit(baseline.value, ['channelName'])))
  let initialized = !!props.draft
  function ready() { if (!initialized) { baseline.value = cloneDeep(model); initialized = true }; pluginReady.value = true; prepared.value = true }
  watch(error, value => { if (value) prepared.value = true })
  const connectionChanged = computed(() => !isEqual(model.configuration, baseline.value.configuration) || !isEqual(model.managedConfiguration, baseline.value.managedConfiguration))
  const snapshot = (): ObjectConfigurationDraft => ({ model: cloneDeep(model), baseline: cloneDeep(baseline.value) })
  // Recreate plugin-local field references after restoring the complete configuration draft.
  function restore() {
    if (saving.value || loading.value) return
    for (const key of Object.keys(model)) Reflect.deleteProperty(model, key)
    Object.assign(model, cloneDeep(baseline.value))
    saveError.value = ''; pluginReady.value = false; ++formRevision.value
  }
  watch(() => props.connection || selectedChannel.value, value => {
    // Cached editors observe configuration changes, not each incoming monitoring frame.
    const next = omit(value || {}, ['runtime', 'monitoring'])
    if (isEqual(channel, next)) return
    for (const key of Object.keys(channel)) delete channel[key as keyof CollectorObject]
    Object.assign(channel, cloneDeep(next))
    if (value?.provider) { model.provider = value.provider; model.channelName = value.name }
  }, { immediate: true })
  async function loadMetadata(provider: string, configuration?: Record<string, unknown>) {
    const identity = ++metadataRevision
    if (!configuration) return
    const response = await queryPointMetadata(provider, configuration).catch(() => undefined)
    if (identity === metadataRevision && response?.success) capabilities.value = response.result || {}
  }
  provide('point-metadata-events', { pointMetadataEvents: loadMetadata })
  async function loadPlugin() {
    const current = ++revision
    source.value = ''; error.value = ''; pluginReady.value = false
    if (!model.provider) return
    loading.value = true
    try {
      const value = await devGetProtocol(model.provider, props.kind)
      if (current !== revision) return
      if (typeof value !== 'string' || !/<(template|script)[\s>]/.test(value)) throw new Error(t('collectorWorkspace.pluginUnavailable'))
      source.value = value
    } catch (cause) { if (current === revision) error.value = cause instanceof Error ? cause.message : String(cause) }
    finally { if (current === revision) loading.value = false }
  }
  watch(() => model.provider, (provider, old) => {
    if (old && provider !== old && !props.value?.id) model.configuration = {}
    void loadPlugin()
  }, { immediate: true })
  async function save(validate: () => Promise<unknown>) {
    if (saving.value || loading.value || error.value || !pluginReady.value) return
    saveError.value = ''; saving.value = true
    try {
      await validate()
      const value = cloneDeep(model)
      const payload = props.kind === 'collector' ? {
        ...omit(value, templateKeys),
        configuration: { ...value.configuration, template: pick(value, templateKeys) },
      } : value
      const response = props.kind === 'channel'
        ? value.id ? await updateChannel(value.id, payload) : await saveChannel(payload)
        : value.id ? await updateCollector(value.id, payload) : await saveCollector(payload)
      if (!response.success) throw new Error(response.message || t('collectorWorkspace.saveFailed'))
      baseline.value = value
      onlyMessage(t('collectorWorkspace.saved')); saved(payload as CollectorObject)
    } catch (cause) { if (cause instanceof Error) saveError.value = cause.message }
    finally { saving.value = false }
  }
  onBeforeUnmount(() => { ++revision; ++metadataRevision })
  return { model, channel, capabilities, source, loading, saving, error, saveError, dirty, ready, loadPlugin, save, restore, formRevision, providerLabel, snapshot, pluginReady, prepared, connectionChanged }
}
