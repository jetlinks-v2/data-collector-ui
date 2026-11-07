import { ref, watch } from 'vue'
import { cloneDeep } from 'lodash-es'
import { buildQueryFilter, type ConditionFilterTerm } from '@jetlinks-web-core/components/ConditionFilter'
import { pointSearchFields } from './columns'
import type { CollectListState } from '../../hook/context'

/** 编辑态回传不触发查询；只在有效条件变化时翻回首页，路由恢复保留原页码。 */
export function usePointSearch(state: CollectListState) {
  const searchTerms = ref<ConditionFilterTerm[]>(cloneDeep(state.terms))
  const queryKey = (terms: ConditionFilterTerm[]) => JSON.stringify(buildQueryFilter(terms, pointSearchFields).terms)
  watch(() => state.terms, terms => {
    if (queryKey(terms) !== queryKey(searchTerms.value)) searchTerms.value = cloneDeep(terms)
  })
  function search() {
    if (queryKey(searchTerms.value) === queryKey(state.terms)) return
    state.terms = cloneDeep(searchTerms.value)
    state.page = 1
  }
  return { searchTerms, search }
}
