import type { LocationQuery } from 'vue-router'
import type { ScopeType } from './context'

export interface CollectScope { scopeType: ScopeType; scopeId: string }

/** 工作区与旧列表共用范围参数，链接不依赖页面布局。 */
export function readCollectScope(query: LocationQuery): CollectScope {
  const scopeId = typeof query.scopeId === 'string' ? query.scopeId : ''
  const scopeType = query.scopeType === 'collector' || query.scopeType === 'channel' ? query.scopeType : 'all'
  return scopeId && scopeType !== 'all' ? { scopeType, scopeId } : { scopeType: 'all', scopeId: '' }
}

export function collectScopeQuery(scope: CollectScope) {
  return {
    scopeType: scope.scopeType === 'all' ? undefined : scope.scopeType,
    scopeId: scope.scopeType === 'all' ? undefined : scope.scopeId,
  }
}
