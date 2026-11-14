import { ref, shallowRef, watch, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { runtimeMetadata, runtimeObjectMetadata } from '../../../api/data-collect/workspace'
import { runtimeMetricDefinitions } from '../../../utils/runtimePresentation'
import type { CollectorObject, EntityKind, MetricDefinition } from '../../../types/workspace'

// 元数据按当前语言及三类对象共享，弹出多张卡片也不重复请求；不缓存运行快照。
let cachedLocale=''
const cache=new Map<EntityKind,Promise<MetricDefinition[]>>()
export function loadRuntimeMetricMetadata(kind:EntityKind,locale:string):Promise<MetricDefinition[]> {
  if(cachedLocale !== locale){cachedLocale=locale;cache.clear()}
  let request=cache.get(kind)
  if(!request){
    request=runtimeMetadata(kind).then(response=>{
      if(!response.success)throw new Error('Runtime metric metadata unavailable')
      return response.result?.properties || []
    })
    cache.set(kind,request)
    request.catch(()=>{if(cache.get(kind) === request)cache.delete(kind)})
  }
  return request
}

/** 浮层展开时才加载说明，取值始终复用工作区已有的集群观测流。 */
export function useRuntimeMetricMetadata(kind:()=>EntityKind,open:Ref<boolean>,object?:()=>CollectorObject) {
  const {locale}=useI18n()
  const definitions=shallowRef<MetricDefinition[]>([]),loading=ref(false),error=ref(false)
  const nodeDefinitions=shallowRef<Record<string,MetricDefinition[]>>({})
  const identity=()=>open.value && object ? JSON.stringify([object().id,(object().monitoring?.nodes || [object().runtime]).map(node=>[node?.serverId,Object.entries(node?.metrics?.observations || {}).map(([scope,view])=>[scope,view.instanceId])])]) : ''
  watch([kind,locale,open,identity],async([current,language,visible],_,onCleanup)=>{
    let stale=false
    onCleanup(()=>{stale=true})
    if(!visible){loading.value=false;return}
    loading.value=true;error.value=false;definitions.value=[];nodeDefinitions.value={}
    try{
      if(current === 'channel' && object){
        const nodes=await runtimeObjectMetadata(current,object().id)
        if(!stale){
          nodeDefinitions.value=Object.fromEntries(nodes.map(node=>[node.serverId,runtimeMetricDefinitions(node.metrics)]))
          definitions.value=nodes.flatMap(node=>runtimeMetricDefinitions(node.metrics))
        }
      }else{
        const value=await loadRuntimeMetricMetadata(current,language)
        if(!stale)definitions.value=value
      }
    }catch{if(!stale)error.value=true}
    finally{if(!stale)loading.value=false}
  })
  return {definitions,nodeDefinitions,loading,error}
}
