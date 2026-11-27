import type { CollectorObject, CollectorObservation, EntityKind, PointRow, RuntimeSnapshot } from '../types/workspace'
import { monitoredObjects, selectRuntime } from './runtimeMonitoring'
import { newerPointSample } from './pointValue'

/** 按ID更新已响应化的点位；高频值流不替换目录数组，也不触发排序或虚拟行重建。 */
export function applyObservedValues(points:ReadonlyMap<string,PointRow>,data:Iterable<NonNullable<CollectorObservation['data']>[number]>):void {
  for(const sample of data){
    const point=sample.pointId ? points.get(sample.pointId) : undefined
    if(point && (!point.channelId || !sample.channelId || point.channelId === sample.channelId)
      && newerPointSample(sample,point.latest))point.latest=sample
  }
}

/** 数据事件只更新最新值；延迟到达的快照不得覆盖已经推送的新样本。 */
export function observedValues(points:PointRow[],data:NonNullable<CollectorObservation['data']>):PointRow[] {
  const samples=new Map(data.map(sample=>[sample.pointId,sample]))
  return points.map(point=>{
    const sample=samples.get(point.id)
    return sample && (!point.channelId || !sample.channelId || point.channelId === sample.channelId)
      && newerPointSample(sample,point.latest) ? {...point,latest:sample} : point
  })
}

/** 以同一轮完整节点集合反显状态；已迁走节点不会继续作为当前状态来源。 */
export function observedRuntime(observation:CollectorObservation|undefined, kind:EntityKind, id:string):RuntimeSnapshot|undefined {
  const values=observation?.nodes.flatMap(node=>kind === 'point' ? node.points.filter(point=>point.id === id).map(point=>point.runtime) : node[kind]?.id === id ? [node[kind]!] : []) || []
  // 完整一轮中缺失的对象已不可观测，不能继续显示上一轮的 running。
  return selectRuntime(values) || (observation ? {id,serverId:observation.nodes[0]?.serverId || '',available:false} : undefined)
}

export function withObservedRuntime<T extends CollectorObject>(object:T,runtime?:RuntimeSnapshot):T {
  return runtime ? {...object,runtime,runningState:runtime.state || object.runningState} : object
}

export function observedPoints(points:PointRow[],observation:CollectorObservation,previous?:CollectorObservation):PointRow[] {
  if(observation.data)return observedValues(points,observation.data)
  const round=(value:CollectorObservation)=>({timestamp:value.timestamp,snapshots:value.nodes.flatMap(node=>node.points.map(point=>point.runtime))})
  const latest=new Map<string,CollectorObservation['nodes'][number]['points'][number]>()
  for(const node of observation.nodes)for(const sample of node.points){
    const before=latest.get(sample.id)
    if(!before || sample.runtime.available && (!before.runtime.available || sample.lastData
      && newerPointSample(sample.lastData,before.lastData)))latest.set(sample.id,sample)
  }
  return monitoredObjects(points,round(observation),previous ? round(previous) : undefined,'point').map(point=>{
    const current=latest.get(point.id)
    return current?.lastData && newerPointSample(current.lastData,point.latest) ? {...point,latest:current.lastData} : point
  })
}
