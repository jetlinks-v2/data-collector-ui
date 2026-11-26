import type { PointDataType } from '../types/workspace'
import type { PointHistorySample, StoredPointData } from '../types/pointHistory'
import { formatPointValue, toPointChartValue, formatPointChartTooltip } from './pointValue'

export type PointHistoryKind = 'number' | 'state' | 'array-number' | 'array-state' | 'table'
const numbers = new Set(['number','byte','ubyte','uint8','short','ushort','uint16','int','uint','uint32','long','ulong','uint64','float','double','decimal','bigdecimal','bigint'])
const typeId = (type?: PointDataType) => (type?.type || type?.id || '').toLowerCase()
const scalar = (value: unknown) => ['string','number','boolean'].includes(typeof value)
const stateValue = (value: unknown, type: string) => ['boolean', 'bool'].includes(type) ? typeof value === 'boolean' : scalar(value)
const numeric = (value: unknown) => (typeof value === 'number' || typeof value === 'string' && value.trim() !== '') && Number.isFinite(Number(value))
const historyTooltip = (value: unknown) => formatPointChartTooltip(value, '—')

export function pointHistoryKind(type: PointDataType | undefined, samples: PointHistorySample[]): PointHistoryKind {
  const values = samples.map(sample => sample.value).filter(value => value != null), id = typeId(type)
  if (id === 'array' || !id && values.length && values.every(Array.isArray)) {
    if (values.some(value => !Array.isArray(value))) return 'table'
    const items = values.flatMap(value => value as unknown[]).filter(value => value != null), element = typeId(type?.elementType)
    if ((numbers.has(element) || !element && items.length > 0 && items.every(value => typeof value === 'number')) && items.every(numeric)) return 'array-number'
    if ((['boolean','bool','enum'].includes(element) || !element && items.length > 0 && items.every(value => typeof value === 'boolean')) && items.every(value => stateValue(value, element))) return 'array-state'
    return 'table'
  }
  if ((numbers.has(id) || !id && values.length > 0 && values.every(value => typeof value === 'number')) && values.every(numeric)) return 'number'
  if ((['boolean','bool','enum'].includes(id) || !id && values.length > 0 && values.every(value => typeof value === 'boolean')) && values.every(value => stateValue(value, id))) return 'state'
  return 'table'
}

export function storedPointSamples(rows: StoredPointData[], type?: PointDataType, parse?: (text: string) => unknown): PointHistorySample[] {
  return rows.filter(row => Number.isFinite(Number(row.timestamp))).map((row, index) => ({
    id: row.id || `stored:${row.timestamp}:${index}`, timestamp: Number(row.timestamp), value: decodeStoredValue(row.value, type, parse), reason: row.reason,
  }))
}

function decodeStoredValue(value: unknown, type?: PointDataType, parse?: (text: string) => unknown): unknown {
  if (typeof value !== 'string' || !parse) return value
  const id = typeId(type)
  if (!['array','object','boolean','bool'].includes(id)) return value
  try {
    const parsed = parse(value)
    if (id === 'array' && Array.isArray(parsed) || id === 'object' && parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed) || ['boolean','bool'].includes(id) && typeof parsed === 'boolean') return parsed
  } catch { /* 已存数据不符合当前类型时保留原值，交给明细展示。 */ }
  return value
}

/** 图表与明细使用同一份精确值；空值和观测分段不连线。 */
export function pointHistoryChart(samples: PointHistorySample[], type: PointDataType | undefined, indices: number[], empty: string) {
  const kind = pointHistoryKind(type, samples), array = kind.startsWith('array-'), state = kind === 'state' || kind === 'array-state'
  const selected = array ? indices : [-1], metadata = array ? type?.elementType : type
  const categories: unknown[] = (metadata?.elements || []).map(item => item.value)
  if (['boolean','bool'].includes(typeId(metadata)) || !categories.length && samples.some(sample => typeof (array ? (sample.value as unknown[])?.[selected[0]] : sample.value) === 'boolean')) categories.push(false, true)
  // 时序存储会将枚举标量序列化为字符串，标签仍使用元数据中的相同值。
  const categoryKey = (value: unknown) => String(value)
  const category = (value: unknown) => {
    let index = categories.findIndex(item => categoryKey(item) === categoryKey(value))
    if (index < 0) { index = categories.length; categories.push(value) }
    return index
  }
  const series = selected.map(index => {
    let previous: PointHistorySample | undefined
    const data: Array<{ value: [number, number | null]; exactValue: string }> = []
    for (const sample of samples) {
      if (previous && (sample.segment !== previous.segment || sample.origin !== previous.origin)) data.push({ value: [sample.timestamp, null], exactValue: '' })
      const value = index < 0 ? sample.value : Array.isArray(sample.value) ? sample.value[index] : undefined
      const plotted = value == null ? null : state ? category(value) : toPointChartValue(value).value
      data.push({ value: [sample.timestamp, plotted], exactValue: formatPointValue(value, empty) }); previous = sample
    }
    return { id: String(index), name: index < 0 ? type?.unit || '' : `[${index}]`, type: 'line' as const, connectNulls: false, smooth: false, showSymbol: state || samples.length === 1, symbolSize: state ? 7 : 3,
      ...(state ? { lineStyle: { opacity: 0 } } : {}), data }
  })
  const labels = categories.map(value => metadata?.elements?.find(item => categoryKey(item.value) === categoryKey(value))?.text
    || (typeof value === 'boolean' ? value ? metadata?.trueText : metadata?.falseText : undefined) || formatPointValue(value, empty))
  return {
    option: {
      animation: false, grid: { left: 48, right: 24, top: array ? 42 : 24, bottom: 60, containLabel: true },
      tooltip: { trigger: 'axis', renderMode: 'richText', formatter: historyTooltip },
      legend: { show: array }, dataZoom: [{ id: 'inside', type: 'inside', zoomOnMouseWheel: 'ctrl' }, { id: 'window', type: 'slider', height: 18, bottom: 8, realtime: false }],
      xAxis: { id: 'time', type: 'time', boundaryGap: false },
      yAxis: state ? { id: 'value', type: 'category', data: labels } : { id: 'value', type: 'value', scale: true, name: type?.unit || '' },
      series: series.map(({ data: _data, ...configuration }) => configuration),
    },
    data: { series: series.map(({ id, data }) => ({ id, data })), ...(state ? { yAxis: { id: 'value', data: labels } } : {}) },
  }
}
