import { onScopeDispose, reactive, watch } from 'vue'
import { cloneDeep } from 'lodash-es'
import { queryCount } from '@data-collector-ui/api/data-collect/dashboard'
import { buildPointListQuery, pointStateTerm } from './pointQuery'
import { useCollectContext } from '../../hook/context'

export function usePointCounts() {
  const { state } = useCollectContext()
  const counts = reactive<{ total?: number; running?: number; stopped?: number }>({})
  let revision = 0
  async function loadData() {
    const version = ++revision
    try {
      const query = await buildPointListQuery(cloneDeep(state), false)
      if (!query) { if (version === revision) Object.assign(counts, { total: 0, running: 0, stopped: 0 }); return }
      const results = await Promise.all((['total', 'running', 'stopped'] as const).map(key => queryCount('point', {
        terms: [...query.terms, ...(key === 'total' ? [] : [pointStateTerm(key)])],
      })))
      if (version !== revision) return
      if (results.some(item => !item.success)) throw new Error('Point counts unavailable')
      const [total, running, stopped] = results.map(item => item.result)
      if (running + stopped > total) throw new Error('Point state counts inconsistent')
      Object.assign(counts, { total, running, stopped })
    } catch { if (version === revision) Object.assign(counts, { total: undefined, running: undefined, stopped: undefined }) }
  }
  watch(() => [state.scopeType, state.scopeId, state.filters, state.terms], loadData, { immediate: true, deep: true })
  onScopeDispose(() => { revision++ })
  return { counts, state, loadData }
}
