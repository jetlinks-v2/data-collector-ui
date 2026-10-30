export interface PointValueData {
  parsedData?: unknown
  parseData?: unknown
  dataType?: string
  timestamp?: number
}

/** 只做展示格式化；精确数字字符串不再转换为 Number，结构化值保留 JSON 结构。 */
export const formatPointValue = (value: unknown, emptyText: string): string => {
  if (value === undefined || value === null || value === '') return emptyText
  return typeof value === 'object' ? JSON.stringify(value) : String(value)
}

/** 优先读取当前字段，同时兼容旧版 parseData；零值和 false 均为有效上报。 */
export const formatPointData = (data: PointValueData | undefined, emptyText: string): string => {
  const value = data && ('parsedData' in data ? data.parsedData : data.parseData)
  const text = formatPointValue(value, emptyText)
  return value === undefined || value === null || value === ''
    ? emptyText
    : `${text}${data?.dataType ? `(${data.dataType})` : ''}`
}

/** 图表定位使用近似数值，精确文本随点保留，供提示读取。 */
export const toPointChartValue = (value: unknown) => {
  const number = typeof value === 'number' || (typeof value === 'string' && value.trim())
    ? Number(value)
    : NaN
  return {
    value: Number.isFinite(number) ? number : null,
    exactValue: formatPointValue(value, ''),
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/** ECharts 会将坐标归一化为 Number，提示必须从原始数据项取精确值。 */
export const formatPointChartTooltip = (params: unknown, emptyText: string): string => {
  const point = Array.isArray(params) ? params[0] : params
  if (!isRecord(point)) return ''
  const data = isRecord(point.data) ? point.data : undefined
  return [point.axisValueLabel ?? point.name, formatPointValue(data?.exactValue ?? point.value, emptyText)]
    .filter(value => value !== undefined && value !== null)
    .join('\n')
}
