import { onBeforeUnmount, ref, watch, type Ref } from 'vue'
import { observePointValues } from '../../../api/data-collect/workspace'
import type { PointRow } from '../../../types/workspace'
import type { PointValueData } from '../../../utils/pointValue'

/** Raw preview is opt-in while open. Cards keep using their shared latest-value stream. */
export function usePointValueView(point:()=>PointRow,open:Ref<boolean>,mode:Ref<string>){
  const raw=ref<PointValueData>(),loading=ref(false),failed=ref(false),visible=ref(!document.hidden)
  const visibility=()=>{visible.value=!document.hidden}
  document.addEventListener('visibilitychange',visibility)
  watch([()=>point().id,()=>point().collectorId,open,()=>mode.value !== 'value',visible],(_,before,onCleanup)=>{
    raw.value=undefined;failed.value=false;loading.value=false
    if(!open.value || mode.value === 'value' || !visible.value || !point().collectorId || point().id.startsWith('_new:'))return
    loading.value=true
    const subscription=observePointValues([point()],2000,true).subscribe({
      next:values=>{raw.value=values[0];loading.value=false},
      error:()=>{failed.value=true;loading.value=false},
    })
    onCleanup(()=>subscription.unsubscribe())
  })
  onBeforeUnmount(()=>document.removeEventListener('visibilitychange',visibility))
  return {raw,loading,failed}
}
