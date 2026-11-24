import { computed, onScopeDispose, ref, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { getProcessorDocumentations } from '../../../api/data-collect/collector'
import type { ProcessorDocumentation } from '../../../types/processorDocumentation'

/** 首次展开下拉或图例时读取提供者说明，同编辑区的算法切换共用目录。 */
export function useProcessorDocumentation(provider:()=>string,algorithm:()=>string,active:()=>boolean) {
  const {locale}=useI18n()
  const catalog=shallowRef<Record<string,ProcessorDocumentation>>({})
  const documentation=computed(()=>catalog.value[algorithm()])
  const loading=ref(false),error=ref(false)
  let request:AbortController|undefined,loaded=''
  async function load() {
    request?.abort();request=undefined;loading.value=false
    const key=[provider(),locale.value].join(':')
    if(key !== loaded){catalog.value={};loaded=''}
    if(!active() || key === loaded)return
    const current=new AbortController()
    request=current;loading.value=true;error.value=false
    try {
      const response=await getProcessorDocumentations(provider(),current.signal)
      if(current.signal.aborted)return
      if(!response.success)throw new Error()
      catalog.value=response.result || {};loaded=key
    } catch {
      if(!current.signal.aborted)error.value=true
    } finally {
      if(request === current){request=undefined;loading.value=false}
    }
  }
  watch(()=>[provider(),locale.value,active()],load,{immediate:true})
  onScopeDispose(()=>request?.abort())
  return {catalog,documentation,loading,error,retry:()=>{loaded='';void load()}}
}
