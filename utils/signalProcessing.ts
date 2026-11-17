export type SignalAlgorithm = 'ema' | 'median' | 'moving-average' | 'trimmed-mean' | 'hampel' | 'slew-rate' | 'debounce' | 'stable' | 'hysteresis' | 'max-step' | 'max-rate' | 'difference' | 'rate' | 'spike' | 'integral'
export interface SignalConfiguration {
  algorithm: SignalAlgorithm
  timeMillis?: number
  resetAfterMillis?: number
  window?: number
  lower?: number
  upper?: number
  limit?: string | number
  confirmation?: 'time' | 'samples'
  samples?: number
  decrease?: 'allow' | 'restart' | 'rollover'
  modulus?: string | number
  trim?: number
  sigma?: number
  tolerance?: number
  rise?: number
  fall?: number
  action?: 'ignore' | 'replace'
  unitMillis?: number
  method?: 'trapezoid' | 'left'
}
export const signalAlgorithms: Array<{ value:SignalAlgorithm; icon:string; key:string }> = [
  { value:'spike', icon:'SafetyOutlined', key:'spike' },
  { value:'integral', icon:'AreaChartOutlined', key:'integral' },
  { value:'ema', icon:'LineChartOutlined', key:'ema' },
  { value:'median', icon:'SafetyOutlined', key:'median' },
  { value:'moving-average', icon:'BarChartOutlined', key:'movingAverage' },
  { value:'trimmed-mean', icon:'FilterOutlined', key:'trimmedMean' },
  { value:'hampel', icon:'SafetyOutlined', key:'hampel' },
  { value:'slew-rate', icon:'DashboardOutlined', key:'slewRate' },
  { value:'debounce', icon:'ClockCircleOutlined', key:'debounce' },
  { value:'stable', icon:'CheckCircleOutlined', key:'stable' },
  { value:'hysteresis', icon:'SwapOutlined', key:'hysteresis' },
  { value:'max-step', icon:'VerticalAlignMiddleOutlined', key:'maxStep' },
  { value:'max-rate', icon:'DashboardOutlined', key:'maxRate' },
  { value:'difference', icon:'MinusOutlined', key:'difference' },
  { value:'rate', icon:'DashboardOutlined', key:'rate' },
]
export const cleaningSignalAlgorithms:SignalAlgorithm[]=['hampel','max-step','max-rate','spike']

/** 参数只在显式操作时初始化；不根据读数猜测物理阈值。 */
export function signalDefaults(algorithm: SignalAlgorithm): SignalConfiguration {
  if (algorithm === 'spike') return {algorithm,limit:1,samples:3,resetAfterMillis:60000}
  if (algorithm === 'integral') return {algorithm,unitMillis:1000,method:'trapezoid',resetAfterMillis:60000}
  if (algorithm === 'hampel') return {algorithm,window:7,sigma:3,tolerance:0,action:'ignore',resetAfterMillis:60000}
  if (algorithm === 'trimmed-mean') return {algorithm,window:7,trim:1,resetAfterMillis:60000}
  if (algorithm === 'ema' || algorithm === 'debounce' || algorithm === 'stable') return { algorithm, timeMillis:1000, ...(algorithm === 'debounce' ? {} : {resetAfterMillis:60000}) }
  if (algorithm === 'median' || algorithm === 'moving-average') return { algorithm, window:algorithm === 'median' ? 3 : 8, resetAfterMillis:60000 }
  return { algorithm, ...(algorithm !== 'hysteresis' ? {resetAfterMillis:60000} : {}) }
}

/** 保留十进制文本，不先降为double来验证阈值或故障标记。 */
export function validDecimal(value:unknown): boolean {
  return (typeof value === 'string' || typeof value === 'number') && /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(String(value))
}

/** 输入约束由提供者说明声明；具体数值类型归一为number。 */
export function supportsSignalInput(type:string, accepted?:string[]): boolean {
  if (type === 'unknown' || !accepted?.length) return true
  const normalized=['number','byte','short','int','long','float','double','decimal'].includes(type) ? 'number' : type
  return accepted.includes(normalized)
}

export function validSignal(config: SignalConfiguration): boolean {
  const positive=(value:unknown,zero=false)=>{
    if (!validDecimal(value)) return false
    const text=String(value),nonzero=/[1-9]/.test(text.split(/[eE]/)[0])
    return (!text.startsWith('-') || !nonzero) && (zero || nonzero)
  }
  const duration=(value:unknown,zero=false)=>positive(value,zero) && Number.isSafeInteger(Number(value)) && Number(value)<=9223372036854
  const reset=()=>config.resetAfterMillis === undefined || duration(config.resetAfterMillis,true)
  const confirmation=()=>[undefined,'time','samples'].includes(config.confirmation) && (config.confirmation === 'samples'
    ? Number.isSafeInteger(config.samples) && config.samples!>=1 && config.samples!<=1000000
    : duration(config.timeMillis,true))
  switch(config.algorithm) {
    case 'spike': return positive(config.limit,true) && Number.isSafeInteger(config.samples) && config.samples!>=2 && config.samples!<=1000000 && reset()
    case 'integral': return [undefined,1000,60000,3600000].includes(config.unitMillis) && [undefined,'trapezoid','left'].includes(config.method) && reset()
    case 'ema': return duration(config.timeMillis) && reset()
    case 'median': return [3,5].includes(config.window!) && reset()
    case 'moving-average': return Number.isInteger(config.window) && config.window!>=2 && config.window!<=64 && reset()
    case 'hampel': return Number.isInteger(config.window) && config.window!>=3 && config.window!<=31 && config.window!%2===1 && Number.isFinite(config.sigma) && config.sigma!>0 && Number.isFinite(config.tolerance) && config.tolerance!>=0 && [undefined,'ignore','replace'].includes(config.action) && reset()
    case 'trimmed-mean': return Number.isInteger(config.window) && config.window!>=3 && config.window!<=31 && Number.isInteger(config.trim) && config.trim!>=1 && config.trim!<config.window!/2 && reset()
    case 'slew-rate': return Number.isFinite(config.rise) && config.rise!>=0 && Number.isFinite(config.fall) && config.fall!>=0 && reset()
    case 'debounce': return confirmation() && reset()
    case 'stable': return confirmation() && positive(config.limit,true) && reset()
    case 'hysteresis': return Number.isFinite(config.lower) && Number.isFinite(config.upper) && config.lower! < config.upper!
    case 'max-step': case 'max-rate': return positive(config.limit,true) && reset()
    case 'difference': case 'rate': return [undefined,'allow','restart','rollover'].includes(config.decrease) && (config.decrease !== 'rollover' || positive(config.modulus)) && reset()
    default: return false
  }
}
