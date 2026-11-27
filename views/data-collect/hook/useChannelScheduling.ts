import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ConditionFilterField, ConditionFilterTerm } from '@jetlinks-web-core/components/ConditionFilter'
import { schedulingNodes, type SchedulingNode } from '../../../api/data-collect/channel'
import type { CollectorObject } from '../../../types/workspace'

/** 只编辑允许范围；节点放置、备用准备和故障迁移由平台执行。 */
export function useChannelScheduling(model:()=>CollectorObject) {
  const {t}=useI18n()
  const nodes=ref<SchedulingNode[]>([]),loading=ref(false),error=ref('')
  let version=0
  const terms=computed<ConditionFilterTerm[]>({
    get:()=>{
      const value=model().scheduling
      if(!value)return []
      const groups:ConditionFilterTerm[]=[]
      if(value.serverId)groups.push({column:'id',termType:'eq',value:value.serverId,type:'or'})
      if(value.tags && Object.keys(value.tags).length)groups.push({type:'or',terms:Object.entries(value.tags).map(([column,value])=>({column,termType:'eq',value,type:'and'}))})
      if(value.tagsFilter?.length)groups.push({type:'or',terms:value.tagsFilter})
      return groups.length === 1 && groups[0].terms ? groups[0].terms : groups
    },
    set:value=>{ model().scheduling=value.length ? {tagsFilter:value} : null },
  })
  const fields=computed<ConditionFilterField[]>(()=>{
    const keys=new Set(['id','name',...nodes.value.flatMap(node=>Object.keys(node.tags || {}))])
    const existing=(items:ConditionFilterTerm[])=>{for(const item of items){if(item.column)keys.add(item.column);if(item.terms)existing(item.terms)}}
    existing(terms.value)
    return [...keys].map(key=>({dataIndex:key,title:key === 'id' ? t('collectorScheduling.node') : key,
      search:{type:'string',termTypeOptions:['eq','not','in','nin','like','nlike'],options:[...new Set(nodes.value.map(node=>key === 'id' ? node.id : node.tags?.[key]).filter(Boolean))].map(value=>({label:value,value}))}}))
  })
  async function load() {
    const current=++version
    if(!model().provider){nodes.value=[];loading.value=false;error.value='';return}
    loading.value=true;error.value=''
    try{
      const response=await schedulingNodes(model().provider)
      if(current !== version)return
      if(!response.success)throw new Error(t('collectorScheduling.loadFailed'))
      nodes.value=response.result || []
    }catch(cause){if(current === version)error.value=cause instanceof Error ? cause.message : String(cause)}
    finally{if(current === version)loading.value=false}
  }
  watch(()=>model().provider,()=>{nodes.value=[];void load()},{immediate:true})
  onBeforeUnmount(()=>{++version})
  return {terms,fields,nodes,loading,error,load}
}
