import type { ExpressionNode, StructuredExpression } from '@jetlinks-web-core/components/Expression'

export const currentValue:Extract<ExpressionNode,{type:'reference'}> = { type:'reference', id:'currentValue', path:[] }
export const lastValue:ExpressionNode = { type:'reference', id:'lastValue', path:[] }
export const expression = (root:ExpressionNode):StructuredExpression => ({ version:1, root })
// 数值文本保留十进制精度；MathLive 的整数投影要求整数类型，不能全部标为 double。
const literal = (value:unknown):ExpressionNode => {
  if (typeof value === 'boolean') return { type:'literal',valueType:'boolean',value }
  if (value == null) return { type:'literal',valueType:'null',value:null }
  const text=String(value)
  if (/^[+-]?\d+$/.test(text)) {
    const integer=BigInt(text)
    return { type:'literal',valueType:integer >= -2147483648n && integer <= 2147483647n ? 'int' : integer >= -9223372036854775808n && integer <= 9223372036854775807n ? 'long' : 'bigint',value:text }
  }
  return /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(text) ? {type:'literal',valueType:'decimal',value:text} : {type:'literal',valueType:'string',value}
}
const binary = (operator:string,left:ExpressionNode,right:ExpressionNode):ExpressionNode => ({ type:'binary', operator,left,right })
interface Term { terms?:Term[]; column?:string; termType?:string; type?:string; value?:unknown }
const comparisons:Record<string,string> = { eq:'eq', neq:'ne', gt:'gt', gte:'ge', lt:'lt', lte:'le' }

/** 仅把已有配置投影为公共表达式；未识别的扩展保留原样，不在读取时改写。 */
export function readProcessingExpression(rule:string, value:any):StructuredExpression|undefined {
  if (value?.provider === 'expression') return value.configuration?.expression?.version === 1 ? value.configuration.expression : undefined
  const configuration = value?.configuration || {}
  if (rule === 'converter' && value?.provider === 'scale') {
    const result = binary('multiply', currentValue, literal(configuration.factor ?? 1))
    return expression((configuration.scale ?? 3) > 0 ? { type:'call', function:'math.round', arguments:[result,literal(configuration.scale ?? 3)] } : result)
  }
  if (rule === 'outlier' && value?.provider === 'range') {
    if (configuration.action === 'clamp') return
    return expression({ type:'logical',operator:'and',operands:[binary(configuration.action ? 'ge' : 'gt',currentValue,literal(configuration.min)),binary(configuration.action ? 'le' : 'lt',currentValue,literal(configuration.max))] })
  }
  if (rule !== 'deadband' || value?.provider !== 'term') return
  function leaf(term:Term):ExpressionNode|undefined {
    if (term.terms) return list(term.terms)
    const column = term.column === 'currentValue' ? currentValue : term.column === "this['currentValue'] - this['lastValue']" ? binary('subtract',currentValue,lastValue) : undefined
    return column && comparisons[term.termType || ''] && term.value != null ? binary(comparisons[term.termType!],column,literal(term.value)) : undefined
  }
  function list(terms:Term[]):ExpressionNode|undefined {
    if (!terms.length) return { type:'literal',valueType:'boolean',value:true }
    const groups:ExpressionNode[][] = []
    for (let i=0;i<terms.length;i++) {
      const node = leaf(terms[i]); if (!node) return
      if (!i || terms[i].type === 'or') groups.push([])
      groups[groups.length-1].push(node)
    }
    const ands = groups.map(nodes => nodes.length === 1 ? nodes[0] : { type:'logical' as const,operator:'and' as const,operands:nodes })
    return ands.length === 1 ? ands[0] : { type:'logical',operator:'or',operands:ands }
  }
  const root = list(configuration.terms || [])
  return root && expression(root)
}
