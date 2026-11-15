import { ref } from 'vue'
import { cloneDeep, isEqual } from 'lodash-es'
import { queryPointMetadata } from '../../../api/data-collect/collector'
import type { PointCapabilities, PointRow } from '../../../types/workspace'
import { usePointCodecs } from './usePointCodecs'
import type { AxiosResponseRewrite } from '@jetlinks-web/types'

/** Resolve only the actively edited point; the full table never requests per-row metadata. */
export function usePointBatchDecoding() {
  const capabilities=ref<PointCapabilities>({}),loading=ref(false),error=ref('')
  const catalog=usePointCodecs(capabilities)
  let input:{provider:string;configuration:PointRow['configuration']}|undefined,pending:Promise<void>|undefined,revision=0
  function load(point:PointRow,retry=false):Promise<void> {
    const next={provider:point.provider,configuration:cloneDeep(point.configuration)}
    if(!retry && isEqual(input,next))return pending || Promise.resolve()
    input=next;const token=++revision;loading.value=true;error.value='';capabilities.value={}
    const request:Promise<void>=queryPointMetadata(next.provider,{configuration:next.configuration}).then((response:AxiosResponseRewrite<PointCapabilities> & {message?:string})=>{
      if(token!==revision)return
      if(!response.success)throw new Error(response.message || 'loadFailed')
      capabilities.value=response.result || {}
    }).catch((cause:unknown)=>{if(token===revision){input=undefined;error.value=cause instanceof Error?cause.message:String(cause)}}).finally(()=>{if(token===revision){loading.value=false;pending=undefined}})
    pending=request
    return request
  }
  return {capabilities,loading,error,codecs:catalog.codecs,load}
}
