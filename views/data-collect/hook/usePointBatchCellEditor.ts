import { computed, reactive, ref, watch } from 'vue'
import { onClickOutside } from '@vueuse/core'
import type { FormInstance } from 'ant-design-vue'
import type { PointBatchPluginColumn } from '../../../types/pointBatch'

/** One cell owns its transient form value; the row is normalized only when the grid commits it. */
export function usePointBatchCellEditor(props:{value:unknown;column:PointBatchPluginColumn},update:(value:unknown)=>void,commit:()=>void) {
  const host=ref<HTMLElement>(),form=ref<FormInstance>(),model=reactive({value:props.value})
  watch(()=>props.value,value=>{model.value=value})
  const rules=computed(()=>props.column.form?.rules || (props.column.form?.required?[{required:true}]:[]))
  function change(value:unknown){const event=value as {target?:{value?:unknown;checked?:unknown}}|undefined;const next=event?.target?(props.column.template?.check?event.target.checked:event.target.value):value;model.value=next;update(next)}
  const popups='.ant-select-dropdown,.ant-picker-dropdown'
  onClickOutside(host,commit,{ignore:popups.split(',')})
  function blur(event:FocusEvent) {
    const focused=event.relatedTarget
    // Some controls blur on mouseup before emitting change on click. A null target is not an exit.
    if(focused instanceof Element && !host.value?.contains(focused) && !focused.closest(popups))commit()
  }
  const validate=()=>form.value?.validate() || Promise.resolve()
  return {host,form,model,rules,change,blur,validate}
}
