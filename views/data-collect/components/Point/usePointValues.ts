import { onActivated, onDeactivated, onScopeDispose, ref, watch, type Ref } from 'vue'
import { observePointValues } from '../../../../api/data-collect/workspace'
import type { PointRow } from '../../../../types/workspace'
import type { PointValueData } from '@data-collector-ui/utils/pointValue'
import type { CollectRecord } from '../../hook/context'

export interface PointSample extends PointValueData { pointId?: string; hex?: unknown }
/** 仅订阅当前显示的点位，切页立即清空旧值；失活和迟到事件均受版本保护。 */
export function usePointValues(rows: Ref<CollectRecord[]>, includeRawData = false) {
  const values = ref(new Map<string, PointSample>())
  let subscription: { unsubscribe: () => void } | undefined
  let revision = 0
  let active = true
  function stop() { revision++; subscription?.unsubscribe(); subscription = undefined; values.value.clear() }
  function subscribe() {
    stop()
    if (!active || !rows.value.length) return
    const version = revision
    const ids = rows.value.map(row => row.id).filter((id): id is string => Boolean(id))
    subscription = observePointValues(rows.value as PointRow[], 2000, includeRawData).subscribe({
      next: samples => {
        if (version !== revision) return
        for (const payload of samples) if (payload.pointId && ids.includes(payload.pointId)) values.value.set(payload.pointId, payload)
      },
      error: () => { if (version === revision) values.value.clear() },
    })
  }
  // 名称或配置保存不改变订阅范围，保留当前采样值直到下一条数据到达。
  watch(() => JSON.stringify(rows.value.map(({ id, channelId, collectorId }) => [id, channelId, collectorId])), subscribe, { immediate: true })
  onDeactivated(() => { active = false; stop() })
  onActivated(() => { active = true; subscribe() })
  onScopeDispose(stop)
  return values
}
