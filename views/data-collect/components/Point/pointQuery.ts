import { buildQueryFilter } from '@jetlinks-web-core/components/ConditionFilter'
import { buildAllChannelTerm, buildPointQueryFilterTerms } from '../../utils'
import { pointSearchFields } from './columns'
import type { CollectListState } from '../../hook/context'

/** 表格、计数和条件批量操作共用查询范围，防止“全部选择”遗漏通道或状态条件。 */
export async function buildPointListQuery(state: CollectListState, includeStatus = true) {
  const terms: any[] = [
    ...buildQueryFilter(state.terms, pointSearchFields).terms,
    ...buildPointQueryFilterTerms(state.filters, { skipChannel: state.scopeType === 'all' }),
  ]
  if (state.scopeType === 'all') {
    const channel = await buildAllChannelTerm(state.filters)
    if (!channel) return undefined
    terms.push(channel)
  } else {
    if (!state.scopeId) return undefined
    terms.push({ column: state.scopeType === 'channel' ? 'channelId' : 'collectorId', value: state.scopeId, type: 'and' })
  }
  if (includeStatus && state.pointType !== 'total') {
    terms.push({ column: 'runningState', value: 'running', termType: state.pointType === 'running' ? 'eq' : 'not', type: 'and' })
  }
  return {
    terms,
    sorts: [
      { name: state.sort || 'createTime', order: state.sort ? state.order : 'desc' },
      { name: 'id', order: 'asc' },
    ],
  }
}
