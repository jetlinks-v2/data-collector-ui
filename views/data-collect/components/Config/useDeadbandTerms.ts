import { ref, watch } from 'vue'
import { pick } from 'lodash-es'

interface DeadbandTerm {
  column?: string
  termType?: string
  type?: string
  value?: number | string | null
  key?: string
}

interface DeadbandConfiguration {
  terms?: Array<{ terms?: DeadbandTerm[] }>
}

const createDefaultTerm = (): DeadbandTerm => ({
  column: 'currentValue',
  termType: 'neq',
  value: undefined,
})

/** 同步死区输入与表单配置；读写边界仅限 configuration，不触发保存。 */
export const useDeadbandTerms = (
  getConfiguration: () => DeadbandConfiguration | undefined,
  setConfiguration: (configuration: DeadbandConfiguration) => void,
) => {
  const type = ref('currentValue')
  const terms = ref<DeadbandTerm[]>([createDefaultTerm()])
  const percent = ref<DeadbandTerm['value']>()

  // 条件组件附带的展示元数据不进入后端配置，保留原有双层 terms 结构。
  const onChange = (value: DeadbandTerm[]) => {
    terms.value = value.map(term => ({
      ...term,
      column: 'currentValue',
      termType: term.termType || 'neq',
      type: 'and',
    }))
    setConfiguration({
      terms: [{
        terms: terms.value.map(term => pick(term, ['termType', 'type', 'value', 'key', 'column'])),
      }],
    })
  }

  const onValueChange = () => {
    setConfiguration({
      terms: [{
        terms: [{
          column: type.value,
          value: percent.value,
          termType: 'neq',
        }],
      }],
    })
  }

  // 切回任一类型时，将该类型的显示值重新写入配置，避免留下空占位条件。
  const onRadioChange = () => {
    if (type.value === 'currentValue') {
      onChange(terms.value)
    } else {
      onValueChange()
    }
  }

  const resetTerms = () => {
    type.value = 'currentValue'
    terms.value = [createDefaultTerm()]
    percent.value = undefined
    setConfiguration({})
  }

  // 保存回填或模板替换后仍需同步；复制条件，避免展示组件直接修改配置对象。
  watch(getConfiguration, (configuration) => {
    const list = configuration?.terms?.[0]?.terms || []
    const first = list[0]
    type.value = first?.column || 'currentValue'

    if (type.value === 'currentValue') {
      terms.value = list.length ? list.map(term => ({ ...term })) : [createDefaultTerm()]
    } else {
      percent.value = first?.value
    }
  }, { immediate: true, deep: true })

  return { type, terms, percent, onChange, onValueChange, onRadioChange, resetTerms }
}
