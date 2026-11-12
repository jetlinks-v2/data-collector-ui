import { onScopeDispose, provide, ref, watch, type Ref } from 'vue'
import { devGetProtocol } from '@data-collector-ui/utils/utils'
import { getPointMetadata } from '../../../utils'
import type { CollectRecord } from '../../../hook/context'
/** 协议资源与物模型响应均绑定当前点位，切换或卸载后忽略旧结果。 */
export function usePointDetailMetadata(info: Ref<CollectRecord>) {
  const jsonData = ref('')
  const configuration = ref<Record<string, any>>({})
  let version = 0
  let metadataVersion = 0
  watch(() => [info.value.id, info.value.provider], async () => {
    const token = ++version
    jsonData.value = ''
    if (!info.value.provider) return
    try {
      const resource = await devGetProtocol(info.value.provider, 'pointDetail')
      if (token === version) jsonData.value = resource
    } catch { if (token === version) jsonData.value = '' }
  }, { immediate: true })
  provide('metadata-configuration', configuration)
  provide('point-metadata-events', {
    pointMetadataEvents: async (provider: string, config: Record<string, unknown>) => {
      const token = ++metadataVersion
      const pointId = info.value.id
      const result = config ? await getPointMetadata(provider, config) : {}
      if (token === metadataVersion && pointId === info.value.id) configuration.value = result as Record<string, any>
    },
  })
  onScopeDispose(() => { version++; metadataVersion++ })
  return { jsonData, configuration }
}
