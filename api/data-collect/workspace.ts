import { request } from '@jetlinks-web/core'
import type { CollectorObject, CollectorObservation, CollectorMonitoringSnapshot, EntityKind, MetricDefinition, ProviderDescriptor, RuntimeSnapshot, RecordingSnapshot } from '../../types/workspace'
import { createRuntimeNdJson } from '@jetlinks-web-core/utils/ndjson'
import type { AxiosResponseRewrite } from '@jetlinks-web/types'
import { EMPTY, lastValueFrom, map, merge, toArray } from 'rxjs'
import { observedPoints } from '../../utils/workspaceObservation'
import type { PointRow } from '../../types/workspace'

export interface Page<T> { data: T[]; total: number; pageIndex?: number; pageSize?: number }
type Response<T> = Promise<AxiosResponseRewrite<T>>
export const listWorkspaceCollectors = (data: object): Response<Page<CollectorObject>> => request.post('/data-collect/collector/_detail', data)
export const listWorkspaceChannels = (data: object): Response<Page<CollectorObject>> => request.post('/data-collect/channel/_query', data)
export const listWorkspacePoints = (data: object): Response<Page<CollectorObject>> => request.post('/data-collect/point/convert/_query', data)
export const listWorkspaceProviders = (): Response<ProviderDescriptor[]> => request.get('/data-collect/channel/providers')
export const runtimeMetadata = (kind: EntityKind): Response<{ properties?: MetricDefinition[] }> => request.get(`/data-collect/${kind}/_runtime/metadata`, {}, { hiddenError: true })
/** 复用资产授权的运行时接口；空投影只读取各节点定义，不执行指标 getter。 */
export const runtimeObjectMetadata = (kind:EntityKind,id:string):Promise<RuntimeSnapshot[]> => lastValueFrom(
  createRuntimeNdJson().post<RuntimeSnapshot>(`/data-collect/${kind}/${encodeURIComponent(id)}/_runtime`,{interval:0,metrics:[],includeMetadata:true}).pipe(toArray()),
)
export const observeRuntime = (kind: EntityKind, id: string, interval = 2000) =>
  createRuntimeNdJson().post<RuntimeSnapshot>(`/data-collect/${kind}/${encodeURIComponent(id)}/_runtime`, {interval})
export const monitorCollectors = (ids:string[],interval=2000,channelIds:string[]=[]) =>
  createRuntimeNdJson().post<CollectorMonitoringSnapshot>('/data-collect/collector/_monitor',{ids,channelIds,interval,metrics:null})
export const observeWorkspace = (id:string,pointIds:string[],interval=2000,pointMetrics:string[]|null=null,metrics:string[]|null=null,includeRawData=false) => createRuntimeNdJson().post<CollectorObservation>(
  `/data-collect/collector/${encodeURIComponent(id)}/_observe`, {pointIds,interval,pointMetrics,metrics,channelMetrics:metrics,includeRawData},
)
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
