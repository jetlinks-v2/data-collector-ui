import { computed, ref, watch } from 'vue'
import { onBeforeRouteUpdate, useRoute, useRouter } from 'vue-router'
import { collectScopeQuery, readCollectScope, type CollectScope } from './collectScopeRoute'
import type { useWorkspaceData } from './useWorkspaceData'
import type { CollectorObject } from '../../../types/workspace'

const sameScope = (a: CollectScope, b: CollectScope) => a.scopeType === b.scopeType && a.scopeId === b.scopeId

/** URL 持有已保存对象的浏览范围；编辑、草稿与观测仍由工作区持有。 */
export function useWorkspaceRoute(
  data: ReturnType<typeof useWorkspaceData>,
  apply: (collector?: CollectorObject, channel?: CollectorObject) => void,
  canSelect: () => boolean | Promise<boolean>,
) {
  const route = useRoute(), router = useRouter(), path = route.path
  const origin = ref<CollectScope>()
  const parentScope = computed<CollectScope>(() => {
    const collector = data.collector.value
    const channelId = origin.value?.scopeType === 'all' ? '' : origin.value?.scopeId || collector?.channelId
    return collector && channelId && data.channels.value.some(item => item.id === channelId)
      ? { scopeType: 'channel', scopeId: channelId } : { scopeType: 'all', scopeId: '' }
  })
  function readOrigin(collector: CollectorObject): CollectScope {
    const state = router.options.history.state
    if (state.collectorReturnType === 'all') return { scopeType: 'all', scopeId: '' }
    const channelId = state.collectorReturnType === 'channel' && typeof state.collectorReturnId === 'string' && state.collectorReturnId === collector.channelId ? state.collectorReturnId : collector.channelId
    return channelId && data.channels.value.some(item => item.id === channelId)
      ? { scopeType: 'channel', scopeId: channelId } : { scopeType: 'all', scopeId: '' }
  }
  const current = (): CollectScope => data.collector.value
    ? { scopeType: 'collector', scopeId: data.collector.value.id }
    : data.selectedChannelId.value
      ? { scopeType: 'channel', scopeId: data.selectedChannelId.value }
      : { scopeType: 'all', scopeId: '' }

  onBeforeRouteUpdate(to => {
    if (to.path !== path || data.initializing.value || sameScope(readCollectScope(to.query), current())) return
    return canSelect()
  })

  // 只监听范围和目录就绪信号，实时值变化不参与导航，也不重复加载点位。
  watch([() => route.path, () => route.query.scopeType, () => route.query.scopeId, data.initializing], () => {
    if (route.path !== path || data.initializing.value) return
    const requested = readCollectScope(route.query)
    const collector = requested.scopeType === 'collector' ? data.collectors.value.find(item => item.id === requested.scopeId) : undefined
    const channel = requested.scopeType === 'channel' ? data.channels.value.find(item => item.id === requested.scopeId) : undefined
    // 查询失败时保留链接，重试目录加载后仍可恢复；成功查询中不存在的对象返回全部范围。
    if (requested.scopeType !== 'all' && !collector && !channel && data.error.value) return
    const resolved: CollectScope = collector || channel ? requested : { scopeType: 'all', scopeId: '' }
    if (!sameScope(resolved, current())) {
      origin.value = collector ? readOrigin(collector) : undefined
      apply(collector, channel)
    } else if (collector && !origin.value) origin.value = readOrigin(collector)
    const query = { ...route.query, ...collectScopeQuery(resolved) }
    if (router.resolve({ path, query }).fullPath !== route.fullPath) void router.replace({ path, query })
  }, { immediate: true, flush: 'sync' })

  function select(collector?: CollectorObject, channel?: CollectorObject) {
    const scope: CollectScope = collector ? { scopeType: 'collector', scopeId: collector.id }
      : channel ? { scopeType: 'channel', scopeId: channel.id } : { scopeType: 'all', scopeId: '' }
    let parent = data.collector.value ? parentScope.value : current()
    if (parent.scopeType === 'channel' && parent.scopeId !== collector?.channelId) parent = { scopeType: 'all', scopeId: '' }
    return router.push({ path, query: { ...route.query, ...collectScopeQuery(scope) }, state: collector ? { collectorReturnType: parent.scopeType, collectorReturnId: parent.scopeId } : {} })
  }
  return { select, parentScope }
}
