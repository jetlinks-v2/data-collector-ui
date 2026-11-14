/** Presentation only: decoder IDs and values always come from the backend. */
export function codecOption(codec: { id: string; name?: string; length?: number }, t: (key: string, values?: Record<string, unknown>) => string) {
  const id = codec.id.toLowerCase()
  const family = /bool/.test(id) ? 'boolean' : /float|double/.test(id) ? 'float' : /unsigned|^uint|^byte$/.test(id) ? 'unsigned' : /^int|^sbyte$/.test(id) ? 'integer' : /ascii|string|char/.test(id) ? 'text' : /hex/.test(id) ? 'hex' : /bcd/.test(id) ? 'bcd' : /^q\d|fix_scaled/.test(id) ? 'fixed' : 'custom'
  const icon = { boolean:'CheckSquareOutlined', float:'FieldNumberOutlined', unsigned:'NumberOutlined', integer:'NumberOutlined', text:'FontSizeOutlined', hex:'CodeOutlined', bcd:'FieldBinaryOutlined', fixed:'CalculatorOutlined', custom:'CodeOutlined' }[family]
  const base = id.replace(/_array$/, '')
  const integer = /^(unsigned_)?(u?int)(\d+)$/.exec(base)
  const shortName = integer ? `${integer[1] || integer[2] === 'uint' ? 'U' : ''}Int${integer[3]}` : ({ieee754_float32:'Float32',ieee754_float64:'Float64',float:'Float32',double:'Float64',bool:'Boolean',boolean:'Boolean',ascii:'ASCII',string:'String',hex:'HEX'} as Record<string,string>)[base]
  return { value:codec.id, label:shortName ? shortName + (id.endsWith('_array') ? '[]' : '') : codec.name || codec.id, icon, description:(id.endsWith('_array') ? t('collectorOptions.array') + ' · ' : '') + t(`collectorOptions.${family}`) }
}

/** Put common scalar formats first without introducing unsupported decoders. */
export function sortCodecOptions<T extends { value?: unknown }>(options: T[]): T[] {
  const common = ['int16','unsigned_int16','int32','unsigned_int32','ieee754_float32','ieee754_float64','bool','ascii','hex']
  const rank = (value: T) => { const id = String(value.value); const index = common.indexOf(id); return index >= 0 ? index : id.endsWith('_array') ? 100 : 50 }
  return [...options].sort((a,b) => rank(a) - rank(b))
}

export function byteOrderOption(value: string, t: (key: string) => string) {
  const family = value.startsWith('AB') ? 'bigEndian' : value.startsWith('BA') ? 'byteSwap' : value.startsWith('CD') || value.startsWith('GH') ? 'wordSwap' : 'littleEndian'
  return { value, label:value.replaceAll('_', ' '), icon:'SwapOutlined', description:t(`collectorOptions.${family}`) }
}

export function accessOption(value: string, text: string | undefined, t: (key: string) => string) {
  const known = value === 'read' || value === 'write' || value === 'subscribe'
  return { value, label:known ? t(`collectorOptions.${value}`) : text || value, icon:value === 'write' ? 'EditOutlined' : value === 'subscribe' ? 'ThunderboltOutlined' : 'EyeOutlined', description:known ? t(`collectorOptions.${value}Hint`) : text || value }
}
