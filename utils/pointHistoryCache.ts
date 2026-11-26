import type { PointHistoryBuffer, PointHistoryCapture, PointHistorySample } from '../types/pointHistory'

export const pointHistoryLimits = { age: 10 * 60_000, perPoint: 2000, total: 20_000, bytes: 5 * 1024 * 1024, points: 10 } as const
type Entry = PointHistoryBuffer & { sizes: number[]; touched: number }

/** 页面观测样本缓冲；只记录显式打开的点位，预算按序列化后的数据量计算。 */
export function createPointHistoryCache() {
  const entries = new Map<string, Entry>()
  let active = '', paused = false, segment = 0, sequence = 0, count = 0, bytes = 0, revision = 0
  const key = (collectorId: string, pointId: string) => `${collectorId}/${pointId}`
  function removeFirst(entry: Entry) {
    entry.samples.shift(); bytes -= entry.sizes.shift() || 0; --count; ++entry.evicted
  }
  function removeEntry(id: string) {
    const entry = entries.get(id)
    if (!entry) return
    bytes -= entry.sizes.reduce((sum, size) => sum + size, 0); count -= entry.samples.length
    entries.delete(id)
  }
  function prune(now: number) {
    for (const entry of entries.values()) {
      while (entry.samples.length && (entry.samples[0].receivedAt! < now - pointHistoryLimits.age || entry.samples.length > pointHistoryLimits.perPoint)) removeFirst(entry)
    }
    while (count > pointHistoryLimits.total || bytes > pointHistoryLimits.bytes) {
      const oldest = [...entries.values()].filter(entry => entry.samples.length).sort((a, b) => a.samples[0].receivedAt! - b.samples[0].receivedAt!)[0]
      if (!oldest) break
      removeFirst(oldest)
    }
  }
  function start(collectorId: string, pointId: string, now = Date.now()) {
    active = key(collectorId, pointId); paused = false; ++segment
    let entry = entries.get(active)
    if (!entry) {
      while (entries.size >= pointHistoryLimits.points) {
        const oldest = [...entries].sort((a, b) => a[1].touched - b[1].touched)[0]
        removeEntry(oldest[0])
      }
      entry = { samples: [], sizes: [], startedAt: now, skipped: 0, evicted: 0, touched: now }
      entries.set(active, entry)
    }
    entry.touched = now; prune(now); ++revision
  }
  function append(capture: PointHistoryCapture, now = Date.now()): boolean {
    const id = key(capture.collectorId, capture.pointId), entry = entries.get(id), data = capture.data
    if (!entry || id !== active || paused) return false
    if (!Number.isFinite(data.timestamp) || !('parsedData' in data || 'parseData' in data)) { ++entry.skipped; ++revision; return true }
    const value = 'parsedData' in data ? data.parsedData : data.parseData
    let serialized: string | undefined
    try { serialized = JSON.stringify(value, (_key, item) => typeof item === 'bigint' ? item.toString() : item) } catch { /* 不支持的值不影响实时链路。 */ }
    if (serialized === undefined) { ++entry.skipped; ++revision; return true }
    const size = new TextEncoder().encode(serialized).length + 160 + capture.origin.length
    if (size > pointHistoryLimits.bytes) { ++entry.skipped; ++revision; return true }
    const previous = entry.samples.at(-1)
    if (previous?.origin !== capture.origin) ++segment
    // 重连首帧可能重复最新样本；不同值或不同实例的同一时间戳仍保留。
    if (previous && previous.timestamp === data.timestamp && previous.origin === capture.origin && JSON.stringify(previous.value) === serialized) return false
    entry.samples.push({ id: `local:${++sequence}`, timestamp: data.timestamp!, receivedAt: now, value: JSON.parse(serialized), origin: capture.origin, segment, dataType: data.dataType })
    entry.sizes.push(size); entry.touched = now; ++count; bytes += size
    prune(now); ++revision
    return true
  }
  function read(collectorId: string, pointId: string, now = Date.now()): PointHistoryBuffer | undefined {
    prune(now)
    const entry = entries.get(key(collectorId, pointId))
    if (!entry) return
    entry.touched = now
    return { samples: entry.samples.slice().sort((a, b) => a.timestamp - b.timestamp), startedAt: entry.startedAt, skipped: entry.skipped, evicted: entry.evicted }
  }
  return {
    start, append, read,
    stop() { active = ''; ++segment; ++revision },
    pause(value: boolean) { paused = value; ++segment; ++revision },
    interrupt() { ++segment; ++revision },
    clear() { entries.clear(); active = ''; count = 0; bytes = 0; ++segment; ++revision },
    get revision() { return revision },
    get size() { return { points: entries.size, samples: count, bytes } },
  }
}
