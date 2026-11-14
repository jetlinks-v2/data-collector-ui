import { onScopeDispose, provide, reactive, ref, watch, type Ref } from 'vue'
import { devGetProtocol } from '../../../utils/utils'
import { exportTemplate, pointImport } from '../../../api/data-collect/collector'
import type { CollectorObject } from '../../../types/workspace'

/** Capability discovery stays inside the current collector's plugin context. */
export function useWorkspacePointTools(collector: Ref<CollectorObject>) {
  const actions = reactive({ add: false, scan: false, batchAdd: false })
  const source = ref(''), scanOpen = ref(false), importOpen = ref(false)
  let revision = 0
  provide('point-actions', actions)
  watch([() => collector.value.id, () => collector.value.provider], async () => {
    const token = ++revision
    source.value = ''; scanOpen.value = false; importOpen.value = false
    Object.assign(actions, { add: false, scan: false, batchAdd: false })
    const value = await devGetProtocol(collector.value.provider, 'pointActions')
    if (token === revision) source.value = value || ''
  }, { immediate: true })
  onScopeDispose(() => { revision++ })
  return {
    actions, source, scanOpen, importOpen,
    template: (format: string) => exportTemplate(collector.value.provider, format),
    importRequest: () => pointImport(collector.value.id, collector.value.provider),
  }
}
