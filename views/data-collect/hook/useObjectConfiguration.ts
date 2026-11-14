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

interface Options { kind: Exclude<EntityKind, 'point'>; value?: CollectorObject; channels: CollectorObject[]; providers: ProviderDescriptor[]; connection?: Partial<CollectorObject> }
const templateKeys = ['accessModes', 'features', 'interval', 'managedConfiguration']

/** Host the existing plugin Vue form; dependent fields and validation stay with the plugin. */
export function useObjectConfiguration(props: Options, saved: () => void) {
  const { t } = useI18n()
  const model = reactive({ configuration: {}, managedConfiguration: {}, features: [], accessModes: ['read'], interval: 1000, ...cloneDeep(props.value) }) as CollectorObject
  const channel = reactive<Partial<CollectorObject>>({})
  const capabilities = ref<PointCapabilities>({}), source = ref(''), loading = ref(false), saving = ref(false), error = ref(''), saveError = ref('')
  let revision = 0, metadataRevision = 0
  provide('plugin-form', model)
  provide('plugin-form-channel', channel)
  provide('point-form-collector', {})
  provide('metadata-configuration', capabilities)
  provide('old-collector', ref({}))
  provide(DATA_COLLECTOR_SAVE_TYPE, props.kind)
  const selectedChannel = computed(() => props.channels.find(item => item.id === model.channelId))
  if (props.kind === 'collector') Object.assign(model, cloneDeep(model.configuration.template || {}))
  const baseline = ref(cloneDeep(model))
  const dirty = computed(() => !isEqual(omit(model, ['channelName']), omit(baseline.value, ['channelName'])))
  function ready() { baseline.value = cloneDeep(model) }
  watch(() => props.connection || selectedChannel.value, value => {
    for (const key of Object.keys(channel)) delete channel[key as keyof CollectorObject]
    Object.assign(channel, value || {})
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
    source.value = ''; error.value = ''
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
    if (saving.value || loading.value || error.value) return
    saveError.value = ''
    try {
      await validate(); saving.value = true
      const value = cloneDeep(model)
      const payload = props.kind === 'collector' ? {
        ...omit(value, templateKeys),
        configuration: { ...value.configuration, template: pick(value, templateKeys) },
      } : value
      const response = props.kind === 'channel'
        ? value.id ? await updateChannel(value.id, payload) : await saveChannel(payload)
        : value.id ? await updateCollector(value.id, payload) : await saveCollector(payload)
      if (!response.success) throw new Error(response.message || t('collectorWorkspace.saveFailed'))
      onlyMessage(t('collectorWorkspace.saved')); saved()
    } catch (cause) { if (cause instanceof Error) saveError.value = cause.message }
    finally { saving.value = false }
  }
  onBeforeUnmount(() => { ++revision; ++metadataRevision })
  return { model, channel, capabilities, source, loading, saving, error, saveError, dirty, ready, loadPlugin, save }
}
