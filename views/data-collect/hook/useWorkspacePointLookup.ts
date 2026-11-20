import { computed, nextTick, onBeforeUnmount, ref, shallowRef, watch, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { findWorkspacePoints } from '../../../api/data-collect/workspace'
import type { CollectorObject, PointRow } from '../../../types/workspace'
import type { useWorkspaceData } from './useWorkspaceData'

/** Search is bounded and cancellable; navigation still passes through the workspace draft guard. */
export function useWorkspacePointLookup(data:ReturnType<typeof useWorkspaceData>, select:(collector:CollectorObject)=>unknown, collection:Ref<{reveal(id:string):Promise<boolean>} | undefined>) {
  const {t}=useI18n(),open=ref(false),keyword=ref(''),loading=ref(false),locating=ref(false),error=ref(''),total=ref(0)
  const results=shallowRef<PointRow[]>([]),pending=shallowRef<PointRow>(),destination=ref<string>()
  const collectorNames=computed(()=>new Map(data.collectors.value.map(value=>[value.id,value.name])))
  let revision=0,timer:ReturnType<typeof setTimeout> | undefined,request:AbortController | undefined
  function cancel() { ++revision;clearTimeout(timer);request?.abort();loading.value=false }
  async function search() {
    cancel();results.value=[];total.value=0;error.value=''
    const term=keyword.value.trim(),token=revision
    if(!open.value || !term)return
    loading.value=true
    const controller=new AbortController();request=controller
    try {
      const response=await findWorkspacePoints(term,controller.signal)
      if(token !== revision)return
      if(!response.success)throw new Error(t('collectorWorkspace.loadFailed'))
      results.value=response.result?.data || [];total.value=response.result?.total || results.value.length
    } catch(cause) { if(token === revision)error.value=cause instanceof Error?cause.message:t('collectorWorkspace.loadFailed') }
    finally { if(token === revision)loading.value=false }
  }
  watch([open,keyword],()=>{
    cancel();results.value=[];total.value=0;error.value=''
    if(!open.value){pending.value=undefined;locating.value=false;return}
    if(keyword.value.trim()){loading.value=true;timer=setTimeout(search,250)}
  })
  async function choose(point:PointRow) {
    const target=data.collectors.value.find(value=>value.id === point.collectorId)
    if(!target){error.value=t('collectorPointLookup.notFound');return}
    locating.value=true;error.value=''
    try {
      await select(target)
      if(!open.value || data.collector.value?.id !== target.id){locating.value=false;return}
      data.pointSearch.value='';data.pointState.value='';data.filterPoints();pending.value=point
    } catch(cause) { locating.value=false;error.value=cause instanceof Error?cause.message:t('collectorWorkspace.loadFailed') }
  }
  watch([pending,data.pointLoading,data.ordering,data.filteredPoints,collection],async()=>{
    const point=pending.value
    if(!point || data.pointLoading.value || data.ordering.value)return
    if(data.collector.value?.id !== point.collectorId || data.error.value || !data.filteredPoints.value.some(value=>value.id === point.id)) {
      pending.value=undefined;locating.value=false;error.value=data.error.value || t('collectorPointLookup.notFound');return
    }
    await nextTick()
    if(pending.value !== point || !collection.value)return
    destination.value=point.id;open.value=false;pending.value=undefined;locating.value=false
  },{flush:'post'})
  async function finishLocate() {
    const id=destination.value;destination.value=undefined
    if(id)await collection.value?.reveal(id)
  }
  onBeforeUnmount(cancel)
  return {open,keyword,loading,locating,error,total,results,collectorNames,destination,search,choose,finishLocate}
}
