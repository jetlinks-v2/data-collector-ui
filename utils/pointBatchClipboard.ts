import type { BatchCellKey, BatchField, PointBatchGridColumn } from '../types/pointBatch'
import { batchFields } from './pointBatchDraft'
import { codecOption } from './configOptions'

/** Excel TSV allows quoted tabs/newlines, escaped quotes, and significant leading zeroes. */
export function readPointClipboard(text: string, delimiter = '\t'): string[][] {
  const rows: string[][] = [], row: string[] = []
  let value = '', quoted = false
  const source = text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n')
  for (let index = 0; index < source.length; index++) {
    const char = source[index]
    if (char === '"' && quoted && source[index + 1] === '"') { value += '"'; index++ }
    else if (char === '"' && (quoted || !value)) quoted = !quoted
    else if (!quoted && (char === delimiter || char === '\n')) {
      row.push(value); value = ''
      if (char === '\n') { rows.push([...row]); row.length = 0 }
    } else value += char
  }
  if (quoted) throw new Error('clipboardQuotes')
  if (value || row.length || !source.endsWith('\n')) { row.push(value); rows.push([...row]) }
  return rows
}
export function writePointClipboard(rows: string[][]): string {
  return rows.map(row => row.map(value => /[\t\n"]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value).join('\t')).join('\n')
}
const aliases: Record<BatchField, string[]> = {
  name: ['name', 'pointname', '名称', '点位名称', '点位名'],
  pointKey: ['key', 'pointkey', 'identifier', '标识', '点位标识'],
  address: ['address', 'nodeid', '地址', '点位地址', '寄存器地址'],
  codec: ['type', 'datatype', 'codec', '类型', '数据类型'],
  byteLayout: ['bytelayout','byteorder','字节序','位元組順序'],
  accessModes: ['mode', 'access', 'accessmodes', '采集方式', '访问方式', '访问模式'],
  interval: ['interval', 'intervalms', 'interval(ms)', '周期', '周期(ms)', '采集周期', '采集周期(ms)', '采集间隔', '采集间隔(ms)'],
}
const normalizeHeader = (text: string) => text.toLowerCase().trim().replace(/[\s_\-]/g, '').replace(/（/g, '(').replace(/）/g, ')')
export function mapPointClipboard(text: string, start: BatchCellKey = 'name', columns?: PointBatchGridColumn[]): { fields: BatchCellKey[]; rows: string[][]; header: boolean } {
  const rows = readPointClipboard(text)
  if (!rows.length) return { fields: [], rows: [], header: false }
  const available:PointBatchGridColumn[] = columns || batchFields.map(field=>({key:field,field,title:field,width:0}))
  const mapped = rows[0].map(value => {
    const name=normalizeHeader(value)
    const exact=available.find(column=>[column.title,column.plugin?.dataIndex,column.key].some(label=>label && normalizeHeader(label)===name))
    return exact?.key || available.find(column=>column.field && aliases[column.field].includes(name))?.key
  })
  const count = mapped.filter(Boolean).length
  const header = rows.length > 1 && (count >= 2 || count > 0 && count === rows[0].length)
  if (header) {
    if (mapped.some(field => !field) || new Set(mapped).size !== mapped.length) throw new Error('clipboardColumns')
    return { fields: mapped.filter((field):field is BatchCellKey=>!!field), rows: rows.slice(1), header: true }
  }
  const position=available.findIndex(column=>column.key===start)
  const fields = available.slice(position < 0 ? 0 : position).map(column=>column.key)
  if (rows.some(row => row.length > fields.length)) throw new Error('clipboardColumns')
  return { fields, rows, header: false }
}
export function normalizeClipboardValue(field: BatchCellKey, input: string, codecs: Array<{ id: string; name?: string }>): string {
  if(field === 'byteLayout')return input.trim().replace(/\s+/g,'_')
  if (field === 'codec') return codecs.find(codec => [codec.id, codec.name, codecOption(codec, key => key).label].some(value => value?.toLowerCase() === input.trim().toLowerCase()))?.id || input
  if (field === 'accessModes') {
    const values: Record<string, string> = { '读': 'read', '读取': 'read', '定时读取': 'read', '写': 'write', '写入': 'write', '读写': 'read,write', '订阅': 'subscribe', '变化订阅': 'subscribe' }
    return values[input.trim()] || input.toLowerCase()
  }
  if (field === 'interval') {
    const matched = /^([\d.]+)\s*(ms|s|毫秒|秒)?$/i.exec(input.trim())
    if (matched) return String(Number(matched[1]) * (/^(s|秒)$/i.test(matched[2] || '') ? 1000 : 1))
  }
  return input
}
