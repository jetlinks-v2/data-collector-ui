export type TermLogic = 'and' | 'or'

export interface DeadbandTerm {
  column?: string
  termType?: string
  type?: TermLogic
  value?: number | string | null
  key?: string
}

export interface DeadbandConfiguration {
  terms?: Array<{ type?: TermLogic; terms?: DeadbandTerm[] }>
}

const reverseLogic = (type: TermLogic = 'and'): TermLogic => type === 'and' ? 'or' : 'and'

/**
 * 比较符已由选项映射取反，此处将页面死区表达式转换为后端的正常通过条件。
 * 先按 OR 拆出 AND 条件组，再将组间 OR 及组内 AND 分别取反，保留混合条件的优先级。
 */
export const toPassConfiguration = (terms: DeadbandTerm[]): DeadbandConfiguration => {
  const groups: DeadbandTerm[][] = []
  terms.forEach((term, index) => {
    if (index === 0 || term.type === 'or') groups.push([])
    groups[groups.length - 1].push(term)
  })
  return {
    terms: groups.map(group => ({
      type: 'and',
      terms: group.map((term, index) => ({
        column: 'currentValue',
        termType: term.termType || 'neq',
        type: index === 0 ? 'and' : 'or',
        value: term.value,
        key: term.key,
      })),
    })),
  }
}

/** 将正常通过条件还原为页面死区条件，回填和继承展示均使用相同的连接关系。 */
export const toDisplayTerms = (configuration?: DeadbandConfiguration): DeadbandTerm[] => {
  return (configuration?.terms || []).flatMap((group, groupIndex) =>
    (group.terms || []).map((term, index) => ({
      ...term,
      type: index > 0 ? reverseLogic(term.type) : groupIndex > 0 ? reverseLogic(group.type) : 'and',
    })),
  )
}
