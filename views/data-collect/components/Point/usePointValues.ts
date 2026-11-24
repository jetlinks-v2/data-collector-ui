import { computed, onActivated, onDeactivated, onScopeDispose, ref, watch, type Ref } from 'vue'
import { wsClient } from '@jetlinks-web/core'
import type { PointValueData } from '@data-collector-ui/utils/pointValue'
import type { CollectRecord } from '../../hook/context'
import { isPointStopped } from './data'

export interface PointSample extends PointValueData { pointId?: string; hex?: unknown }
/** 仅订阅当前显示的点位，切页立即清空旧值；失活和迟到事件均受版本保护。 */
export function usePointValues(rows: Ref<CollectRecord[]>) {
  const values = ref(new Map<string, PointSample>())
  const runningRows = computed(() => rows.value.filter(row => !isPointStopped(row)))
  let subscription: { unsubscribe: () => void } | undefined
  let revision = 0
  let active = true
  function stop() { revision++; subscription?.unsubscribe(); subscription = undefined; values.value.clear() }
  function subscribe() {
    stop()
    const points = runningRows.value
    if (!active || !points.length) return
    const version = revision
    const ids = points.map(row => row.id).filter((id): id is string => Boolean(id))
    if (!ids.length) return
    const channel = points.every(row => row.channelId === points[0].channelId) ? points[0].channelId || '*' : '*'
    const collector = points.every(row => row.collectorId === points[0].collectorId) ? points[0].collectorId || '*' : '*'
    subscription = wsClient.getWebSocket('point-page-' + ids.join('-'), '/collector/' + channel + '/' + collector + '/data', {
      pointId: ids.join(','),
    }).subscribe((event: unknown) => {
      const payload = (event as { payload: PointSample }).payload
      if (version === revision && payload.pointId && ids.includes(payload.pointId)) values.value.set(payload.pointId, payload)
    })
  }
  // 名称或配置保存不改变订阅范围，保留当前采样值直到下一条数据到达。
  watch(() => JSON.stringify(runningRows.value.map(({ id, channelId, collectorId }) => [id, channelId, collectorId])), subscribe, { immediate: true })
  onDeactivated(() => { active = false; stop() })
  onActivated(() => { active = true; subscribe() })
  onScopeDispose(stop)
  return values
}
