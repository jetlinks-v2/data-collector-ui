import { onBeforeUnmount, provide, ref } from 'vue'
import { cloneDeep } from 'lodash-es'
import { useI18n } from 'vue-i18n'
import { devGetProtocol } from '../../../utils/utils'
import { queryPointMetadata } from '../../../api/data-collect/collector'
import { DATA_COLLECTOR_SAVE_TYPE } from '../data'
import type { CollectorObject, PluginConfiguration, PointCapabilities } from '../../../types/workspace'

const resources = new Map<string, Promise<string | undefined>>()
/** Preserve plugin injection and validation contracts while changing only its host. */
export function usePointPlugin(model: CollectorObject, collector: CollectorObject) {
  const { t } = useI18n()
  const source = ref(''), capabilities = ref<PointCapabilities>({}), error = ref(''), loading = ref(true)
  let disposed = false, metadataRevision = 0
  model.configuration ||= {}; model.managedConfiguration ||= {}; model.features ||= []
  const template = { ...collector, ...cloneDeep(collector.configuration?.template || {}) }
  provide('plugin-form', model)
  provide('point-form-collector', template)
  provide(DATA_COLLECTOR_SAVE_TYPE, 'point')
  provide('metadata-configuration', capabilities)
  async function loadMetadata(provider: string, configuration?: PluginConfiguration) {
    const revision = ++metadataRevision
    if (!configuration) { capabilities.value = {}; return }
    try {
      const response = await queryPointMetadata(provider, configuration)
      if (!disposed && revision === metadataRevision && response.success) {
        const metadata: PointCapabilities = response.result || {}
        // Keep a valid decoder when notation changes; discard one the new point cannot use.
        if (metadata.autoCodec === false && Array.isArray(metadata.supportCodecs)
          && !metadata.supportCodecs.some(codec => codec.id === model.managedConfiguration?.codec)) {
          model.managedConfiguration!.codec = undefined
        }
        capabilities.value = metadata
      }
    } catch (cause) { if (!disposed && revision === metadataRevision) error.value = cause instanceof Error ? cause.message : String(cause) }
  }
  provide('point-metadata-events', { pointMetadataEvents: loadMetadata })
  async function load() {
    loading.value = true; error.value = ''
    if (!resources.has(model.provider)) resources.set(model.provider, devGetProtocol(model.provider, 'point'))
    try {
      const value = await resources.get(model.provider)
      if (disposed) return
      if (typeof value !== 'string' || !value.trim() || !/<(template|script)[\s>]/.test(value)) { resources.delete(model.provider); throw new Error(t('collectorWorkspace.pluginUnavailable')) }
      source.value = value; void loadMetadata(model.provider, { configuration: model.configuration })
    } catch (cause) { if (!disposed) error.value = cause instanceof Error ? cause.message : String(cause) }
    finally { if (!disposed) loading.value = false }
  }
  void load()
  onBeforeUnmount(() => { disposed = true; ++metadataRevision })
  return { source, capabilities, loading, error, retry: load }
}
