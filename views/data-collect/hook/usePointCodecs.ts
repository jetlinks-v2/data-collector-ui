import { computed, onBeforeUnmount, ref, shallowRef, watch, type Ref } from 'vue'
import { queryCodecProvider } from '../../../api/data-collect/collector'
import type { PointCapabilities } from '../../../types/workspace'

type Codecs = NonNullable<PointCapabilities['supportCodecs']>
const platformCodecs = shallowRef<Codecs>([])
let pending: Promise<void> | undefined

/** An omitted codec restriction uses the shared catalog; an explicit empty list stays empty. */
export function usePointCodecs(capabilities: Ref<PointCapabilities>) {
  const loading = ref(false), failed = ref(false)
  let disposed = false
  async function load() {
    if (capabilities.value.supportCodecs != null) return
    loading.value = true; failed.value = false
    try {
      pending ||= queryCodecProvider().then((response: { success: boolean; result?: Codecs }) => {
        if (!response.success) throw new Error('Codec catalog request failed')
        platformCodecs.value = response.result || []
      }).catch((error: unknown) => { pending = undefined; throw error })
      await pending
    } catch { if (!disposed) failed.value = true }
    finally { if (!disposed) loading.value = false }
  }
  watch(() => capabilities.value.supportCodecs, load, { immediate: true })
  onBeforeUnmount(() => { disposed = true })
  return { codecs: computed(() => capabilities.value.supportCodecs ?? platformCodecs.value), loading, failed, retry: load }
}
