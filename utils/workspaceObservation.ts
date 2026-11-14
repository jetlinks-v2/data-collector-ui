import type { CollectorObject, CollectorObservation, EntityKind, PointRow, RuntimeSnapshot } from '../types/workspace'
import { monitoredObjects, selectRuntime } from './runtimeMonitoring'

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
  const round=(value:CollectorObservation)=>({timestamp:value.timestamp,snapshots:value.nodes.flatMap(node=>node.points.map(point=>point.runtime))})
  const latest=new Map<string,CollectorObservation['nodes'][number]['points'][number]>()
  for(const node of observation.nodes)for(const sample of node.points){
    const before=latest.get(sample.id)
    if(!before || sample.runtime.available && (!before.runtime.available || Number(sample.lastData?.timestamp || 0) > Number(before.lastData?.timestamp || 0)))latest.set(sample.id,sample)
  }
  return monitoredObjects(points,round(observation),previous ? round(previous) : undefined,'point').map(point=>{
    const current=latest.get(point.id)
    return current?.lastData ? {...point,latest:current.lastData} : point
  })
}
