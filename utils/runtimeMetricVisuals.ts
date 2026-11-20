import { groupRuntimeMetricRows, type runtimeMetricRows } from './runtimePresentation'

export type RuntimeMetricRow = ReturnType<typeof runtimeMetricRows>[number]
export interface MetricTrend {
  instanceId: string; sampledAt: number; raw: number; kind?: string
  points: Array<{ time: number; value: number | null }>
}
export type MetricTrends = Map<string, MetricTrend>
export interface MetricNode { serverId: string; available: boolean; rows: RuntimeMetricRow[] }

export const metricTrendKey = (serverId: string, id: string) => `${serverId}\0${id}`

/** 搜索与节点过滤保持一致，默认聚焦可读指标；缺项可一次展开而非逐项占位。 */
export function runtimeMetricSections(nodes: MetricNode[], query = '', serverId = '', showMissing = false) {
  let missing = 0
  const sections = nodes.filter(node => !serverId || node.serverId === serverId).map(node => {
    const matches = groupRuntimeMetricRows(node.rows, query).flatMap(group => group.rows)
    missing += matches.filter(row => !node.available || !row.available).length
    return { ...node, groups: groupRuntimeMetricRows(matches.filter(row => showMissing || (node.available && row.available))) }
  }).filter(node => node.groups.length || !node.available)
  return { sections, missing }
}

/** 仅解释明确的瞬时/累计语义；未知插件字段保留原始展示，不猜测速率。 */
export function supportsMetricTrend(row: RuntimeMetricRow) {
  const metric = row.definition?.expands?.metric
  return metric?.semantic !== 'timestamp' && metric?.statistic !== 'distribution'
    && (metric?.kind === 'counter' || metric?.kind === 'gauge')
    && typeof row.value === 'number' && Number.isFinite(row.value)
}

/** 只保留当前节点的30帧。实例切换、离线与计数回退后重新建立基线。 */
export function updateMetricTrends(previous: MetricTrends, nodes: MetricNode[]): MetricTrends {
  const next: MetricTrends = new Map()
  for (const node of nodes) {
    if (!node.available) continue
    for (const row of node.rows) {
      if (!row.available || !row.instanceId || !Number.isFinite(row.sampledAt) || !supportsMetricTrend(row)) continue
      const key = metricTrendKey(node.serverId, row.id)
      const time = row.sampledAt!, raw = row.value as number, kind = row.definition?.expands?.metric?.kind
      let last = previous.get(key)
      if (last && (last.instanceId !== row.instanceId || last.kind !== kind || time < last.sampledAt
        || (kind === 'counter' && raw < last.raw))) last = undefined
      if (last && time === last.sampledAt) { next.set(key, last); continue }
      const value = kind === 'counter' ? last && Math.abs(raw) <= Number.MAX_SAFE_INTEGER
        ? (raw - last.raw) * 1000 / (time - last.sampledAt) : null : raw
      next.set(key, { instanceId: row.instanceId, sampledAt: time, raw, kind,
        points: [...(last?.points || []), { time, value }].slice(-30) })
    }
  }
  return next
}

/** 横轴为实际采样时间；零和常量保持水平线，缺失值断线，不补点或平滑。 */
export function metricSparkline(trend?: MetricTrend) {
  const points = trend?.points || []
  const valid = points.filter((point): point is { time: number; value: number } => point.value != null && Number.isFinite(point.value))
  if (valid.length < 2) return undefined
  const min = Math.min(...valid.map(point => point.value)), max = Math.max(...valid.map(point => point.value))
  const start = points[0].time, end = points.at(-1)!.time
  if (end <= start) return undefined
  let connected = false
  const path = points.map(point => {
    if (point.value == null || !Number.isFinite(point.value)) { connected = false; return '' }
    const x = 2 + (point.time - start) / (end - start) * 116
    const y = max === min ? 15 : 27 - (point.value - min) / (max - min) * 24
    const command = `${connected ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`
    connected = true
    return command
  }).join(' ')
  return { path, min, max, start, end, latest: valid.at(-1)!.value }
}

/** core 的 HistogramBuckets 是独立桶；未知桶模式和无效边界不能伪装为分布。 */
export function metricHistogram(row: RuntimeMetricRow) {
  const metric = row.definition?.expands?.metric
  if (!row.available || metric?.statistic !== 'distribution' || metric.bucketMode !== 'independent'
    || metric.boundary !== 'inclusiveUpper' || !Array.isArray(row.value) || !Array.isArray(row.bounds)) return undefined
  const bounds: unknown[] = row.bounds, counts: unknown[] = row.value
  const overflow = metric.overflowBucket === true
  if (!bounds.length || counts.length !== bounds.length + (overflow ? 1 : 0)
    || bounds.some((value, index) => typeof value !== 'number' || !Number.isFinite(value) || (index > 0 && value <= (bounds[index - 1] as number)))
    || counts.some(value => typeof value !== 'number' || !Number.isFinite(value) || value < 0)) return undefined
  const total = (counts as number[]).reduce((sum, count) => sum + count, 0)
  const maximum = Math.max(...counts as number[])
  return { total, bins: (counts as number[]).map((count, index) => ({ count,
    lower: index === 0 ? undefined : bounds[index - 1] as number,
    upper: index < bounds.length ? bounds[index] as number : undefined,
    share: total ? count / total : 0, height: maximum ? count / maximum * 100 : 0 })) }
}

/** 使用服务端采样时间而非逐指标计时器；0时间戳不代表曾发生过事件。 */
export function metricRelativeTime(row: RuntimeMetricRow) {
  if (!row.available || row.definition?.expands?.metric?.semantic !== 'timestamp'
    || typeof row.value !== 'number' || !row.sampledAt || row.value <= 0) return undefined
  const seconds = (row.value - row.sampledAt) / 1000, absolute = Math.abs(seconds)
  const unit = absolute < 60 ? 'second' : absolute < 3600 ? 'minute' : absolute < 86400 ? 'hour' : 'day'
  const scale = { second: 1, minute: 60, hour: 3600, day: 86400 }[unit]
  return { value: Math.sign(seconds) * Math.round(absolute / scale), unit, future: seconds > 0 } as const
}
