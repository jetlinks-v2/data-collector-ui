import { request } from '@jetlinks-web/core'
import type { CollectorObject, CollectorObservation, CollectorMonitoringSnapshot, EntityKind, MetricDefinition, ProviderDescriptor, RuntimeSnapshot, RecordingSnapshot } from '../../types/workspace'
import { createRuntimeNdJson } from '@jetlinks-web-core/utils/ndjson'
import type { AxiosResponseRewrite } from '@jetlinks-web/types'
import { EMPTY, from, lastValueFrom, map, merge, mergeMap, reduce, toArray } from 'rxjs'
import { collectorIndexMetrics, pointIndexMetrics, workspaceRuntimeIndex, type WorkspaceRuntimeIndex } from '../../utils/workspaceList'
import { monitoredObjects } from '../../utils/runtimeMonitoring'
import { observedPoints } from '../../utils/workspaceObservation'
import type { PointRow } from '../../types/workspace'

export interface Page<T> { data: T[]; total: number; pageIndex?: number; pageSize?: number }
type Response<T> = Promise<AxiosResponseRewrite<T>>
export const listWorkspaceCollectors = (data: object): Response<CollectorObject[]> => request.post('/data-collect/collector/_detail/no-paging', { ...data, paging: false })
export const listWorkspaceChannels = (data: object): Response<CollectorObject[]> => request.post('/data-collect/channel/_query/no-paging', { ...data, paging: false })
export const listWorkspacePoints = (data: object): Response<PointRow[]> => request.post('/data-collect/point/directory/_query/no-paging', { ...data, paging: false })
export const loadWorkspacePoint = (collectorId:string,id:string,signal:AbortSignal): Response<PointRow[]> => request.post(
  '/data-collect/point/convert/_query/no-paging', {paging:false,terms:[{column:'collectorId',value:collectorId},{column:'id',value:id}]}, {signal},
)
export const listWorkspaceProviders = (): Response<ProviderDescriptor[]> => request.get('/data-collect/channel/providers')
export const runtimeMetadata = (kind: EntityKind): Response<{ properties?: MetricDefinition[] }> => request.get(`/data-collect/${kind}/_runtime/metadata`, {}, { hiddenError: true })
/** 复用资产授权的运行时接口；空投影只读取各节点定义，不执行指标 getter。 */
export const runtimeObjectMetadata = (kind:EntityKind,id:string):Promise<RuntimeSnapshot[]> => lastValueFrom(
  createRuntimeNdJson().post<RuntimeSnapshot>(`/data-collect/${kind}/${encodeURIComponent(id)}/_runtime`,{interval:0,metrics:[],includeMetadata:true}).pipe(toArray()),
)
export const observeRuntime = (kind: EntityKind, id: string, interval = 2000) =>
  createRuntimeNdJson().post<RuntimeSnapshot>(`/data-collect/${kind}/${encodeURIComponent(id)}/_runtime`, {interval})
export const monitorCollectors = (ids:string[],interval=2000,channelIds:string[]=[],metrics:string[]|null=null) =>
  createRuntimeNdJson().post<CollectorMonitoringSnapshot>('/data-collect/collector/_monitor',{ids,channelIds,interval,metrics})
export const observeWorkspace = (id:string,pointIds:string[],interval=2000,pointMetrics:string[]|null=null,metrics:string[]|null=null,includeRawData=false,includeData=true) => createRuntimeNdJson().post<CollectorObservation>(
  `/data-collect/collector/${encodeURIComponent(id)}/_observe`, {pointIds,interval,pointMetrics,metrics,channelMetrics:metrics,includeRawData,includeData},
)

/** Global filtering uses finite snapshots: two concurrent requests, 200 points each, no sample values. */
export function queryWorkspaceIndex(objects:CollectorObject[],collectorId?:string) {
  const size = collectorId ? 200 : 100
  const batches:CollectorObject[][]=[]
  for(let offset=0;offset<objects.length;offset+=size)batches.push(objects.slice(offset,offset+size))
  return from(batches).pipe(mergeMap(rows=>collectorId
    ? observeWorkspace(collectorId,rows.map(row=>row.id),0,pointIndexMetrics,[],false,false).pipe(map(frame=>observedPoints(rows,frame)))
    : monitorCollectors(rows.map(row=>row.id),0,[],collectorIndexMetrics).pipe(map(frame=>monitoredObjects(rows,{timestamp:frame.timestamp,snapshots:frame.collectors}))),2),
    reduce((index,rows)=>{for(const row of rows)index.set(row.id,workspaceRuntimeIndex(row));return index},new Map<string,WorkspaceRuntimeIndex>()))
}
/** Legacy value views use the same cluster snapshot; one stream per visible collector, no metric getters. */
export function observePointValues(points:PointRow[],interval=2000,includeRawData=false){
  const groups=new Map<string,PointRow[]>()
  for(const point of points){
    if(!point.collectorId || !point.id || point.id.startsWith('_new:'))continue
    const group=groups.get(point.collectorId) || []
    group.push(point);groups.set(point.collectorId,group)
  }
  const streams=[...groups].map(([id,rows])=>observeWorkspace(id,rows.map(point=>point.id),interval,[],[],includeRawData).pipe(
    map(frame=>observedPoints(rows,frame).filter(point=>point.latest).map(point=>({...point.latest!,pointId:point.id}))),
  ))
  return streams.length ? merge(...streams) : EMPTY
}
export const observeLatestRecording = (id:string,serverId:string) => createRuntimeNdJson().get<RecordingSnapshot>(
  `/data-collect/collector/${encodeURIComponent(id)}/_recording?${new URLSearchParams({serverId,interval:'1000'})}`,
)
