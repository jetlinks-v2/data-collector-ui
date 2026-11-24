import { onScopeDispose, shallowRef } from 'vue'
import { auditTime, concatMap, from, tap, type Observable, type Subscription } from 'rxjs'
import { readWorkspacePoints } from '../../../api/data-collect/workspace'
import type { PointValueData } from '../../../utils/pointValue'

export interface PointTrialState { scope:'point'|'list'; running:boolean; ids:string[]; total:number; completed:number; error:string; cancelled:boolean; result?:PointValueData }
const empty=():PointTrialState=>({scope:'list',running:false,ids:[],total:0,completed:0,error:'',cancelled:false})

/** 一次手动读取仅保留一条流，分批顺序请求；进度最多每50ms刷新，值仍走现有合并渲染。 */
export function usePointTrial(onData:(data:PointValueData[])=>void,read:(collectorId:string,ids:string[])=>Observable<PointValueData>=readWorkspacePoints) {
  const state=shallowRef<PointTrialState>(empty())
  let subscription:Subscription|undefined,finish:((value:number)=>void)|undefined
  let completed=0,result:PointValueData|undefined
  function settle(error='',cancelled=false) {
    const resolve=finish;finish=undefined
    subscription?.unsubscribe();subscription=undefined
    state.value={...state.value,running:false,completed,error,cancelled,result}
    resolve?.(state.value.completed)
  }
  function stop(){if(state.value.running)settle('',true)}
  function reset(){stop();result=undefined;state.value=empty()}
  function run(collectorId:string,targets:string[],scope:PointTrialState['scope']='list'):Promise<number|undefined>{
    if(state.value.running)return Promise.resolve(undefined)
    const ids=[...new Set(targets)].filter(id=>!id.startsWith('_new:'))
    if(!ids.length)return Promise.resolve(undefined)
    state.value={...empty(),scope,running:true,ids,total:ids.length}
    completed=0;result=undefined
    const expected=new Set(ids),received=new Set<string>(),batches:string[][]=[]
    for(let offset=0;offset<ids.length;offset+=200)batches.push(ids.slice(offset,offset+200))
    return new Promise(resolve=>{
      finish=resolve
      const current=from(batches).pipe(concatMap(batch=>read(collectorId,batch)),tap(row=>{
        if(row.pointId && expected.has(row.pointId)){
          received.add(row.pointId);completed=received.size
          // A single read keeps its own returned value; live updates cannot overwrite it.
          if(ids.length === 1)result=row
          onData([row])
        }
      }),auditTime(50)).subscribe({
        next(){state.value={...state.value,completed,result}},
        error(cause){settle(cause instanceof Error ? cause.message : String(cause))},
        complete(){settle()},
      })
      // 同步完成的测试流也不能遗留已关闭订阅，下一次操作可直接开始。
      if(!current.closed)subscription=current
    })
  }
  onScopeDispose(reset)
  return {state,run,stop,reset}
}
