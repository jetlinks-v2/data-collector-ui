import { inject, onScopeDispose, provide, reactive, ref, watch, type Ref } from 'vue'
import { cloneDeep } from 'lodash-es'
import { DATA_COLLECTOR_CONFIG_TYPE, PLUGIN_DETAIL_SAVE_EVENTS } from '../../../data'
import { POINT_PERSISTENCE } from './detailContext'
import type { CollectRecord } from '../../../hook/context'

/** 表单保持本地草稿；服务端刷新不能覆盖尚未保存或保存失败的输入。 */
export function usePointDetailForm(options: { syncInterval?: boolean } = {}) {
  const info = inject<Ref<CollectRecord>>('point-info', ref({}))
  const errors = inject<Ref<unknown[]>>('point-info-error-list', ref([]))
  const persistence = inject(POINT_PERSISTENCE)
  const formData = reactive<Omit<CollectRecord, 'accessModes' | 'features'> & { accessModes?: string[]; features?: string[] }>({})
  const formRef = ref<any>()
  const dirty = ref(false)
  let baseline = ''
  let syncing = false
  let revision = 0
  const normalize = (value: CollectRecord) => ({
    ...cloneDeep(value),
    accessModes: (value.accessModes || []).map(item => typeof item === 'string' ? item : item.value),
    features: (value.features || []).map(item => typeof item === 'string' ? item : item.value),
  })
  function discard() {
    syncing = true
    Object.keys(formData).forEach(key => delete formData[key])
    Object.assign(formData, normalize(info.value))
    baseline = JSON.stringify(formData)
    dirty.value = false
    errors.value = []
    syncing = false
  }
  watch(info, () => {
    if (!dirty.value) discard()
  }, { immediate: true })
  watch(formData, () => { if (syncing) return; dirty.value = JSON.stringify(formData) !== baseline }, { deep: true, flush: 'sync' })
  async function flush() {
    const token = ++revision
    try {
      await formRef.value?.validate()
      errors.value = []
    } catch (error: any) {
      errors.value = error?.errorFields || [error]
      return false
    }
    if (!dirty.value) return true
    if (options.syncInterval) {
      formData.configuration = { ...formData.configuration, interval: formData.interval }
    }
    const snapshot = cloneDeep(formData)
    const serialized = JSON.stringify(snapshot)
    const saved = await persistence?.save(snapshot as Partial<CollectRecord>)
    if (token !== revision) return false
    if (saved) {
      baseline = serialized
      dirty.value = JSON.stringify(formData) !== baseline
    }
    return Boolean(saved)
  }
  provide('plugin-form', formData)
  provide(PLUGIN_DETAIL_SAVE_EVENTS, { onValueChange: flush })
  provide(DATA_COLLECTOR_CONFIG_TYPE, true)
  onScopeDispose(() => { revision++ })
  return { info, formData, formRef, dirty, flush, discard, isDirty: () => dirty.value }
}
