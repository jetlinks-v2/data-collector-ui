import { reactive } from 'vue'
import type { ArithmeticStepValues,StructuredExpression } from '@jetlinks-web-core/components/Expression'

export interface FormulaDraft {
  editing:boolean; invalid:boolean; typeError:boolean
  pending?:StructuredExpression; stepDraft?:ArithmeticStepValues
}
type DraftKey='outlier'|'converter'|'deadband'|'writeExpression'
const drafts=new WeakMap<object,Record<DraftKey,FormulaDraft>>()
/** 编辑状态随点位草稿保留，不进入保存载荷，也不为未访问的点位分配状态。 */
export function processingDraft(model:object) {
  let draft=drafts.get(model)
  if (!draft) {
    const create=():FormulaDraft=>({editing:false,invalid:false,typeError:false})
    draft=reactive({outlier:create(),converter:create(),deadband:create(),writeExpression:create()})
    drafts.set(model,draft)
  }
  return draft
}
export function processingPending(model:object):boolean {
  return Object.values(processingDraft(model)).some(value=>value.editing || value.invalid)
}
