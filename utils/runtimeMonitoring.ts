import { objectTone } from '../types/workspace'
import type { RuntimeMonitoring, CollectorObject, PointRuntimeSummary, RuntimeSnapshot, MetricSnapshot, EntityKind } from '../types/workspace'

export interface RuntimeMonitoringRound { timestamp:number; snapshots:RuntimeSnapshot[] }

export interface RuntimeIndicator { id:string; icon:string; tone:'bad'|'warn'|'gray'; count?:number }

/** 两条时长共用零点和刻度，不裁剪超长间隔；缺少实际值时不绘制虚假数据。 */
export function runtimeIntervalComparison(expected?:number,actual?:number){
  const maximum=Math.max(expected || 0,actual || 0)
  return {expectedPercent:maximum > 0 ? (expected || 0)/maximum*100 : 0,
    actualPercent:actual != null && maximum > 0 ? actual/maximum*100 : undefined}
}

/** 空值表达真实原因；速率有计数而尚无有效相邻帧时才称为统计中。 */
export function runtimeMetricEmptyState(object:CollectorObject, ids:string[]) {
  if(!object.runtime)return 'waiting'
  const nodes=object.monitoring?.nodes || [object.runtime]
  const active=nodes.filter(node=>node.available)
  if(!active.length)return 'unavailable'
  const hasMetric=(node:RuntimeSnapshot,id:string)=>{
    const path=id.split('.')
    let metrics=node.metrics
    for(const scope of path.slice(0,-1))metrics=metrics?.observations?.[scope]
    return metrics?.values[path.at(-1)!]
  }
  const coverage=active.map(node=>ids.every(id=>hasMetric(node,id)))
  if(coverage.some(value=>!value))return coverage.some(Boolean) ? 'incomplete' : 'notProvided'
  if(active.some(node=>ids.some(id=>!hasMetric(node,id)?.available)))return 'unavailable'
  return 'calculating'
}

/** 未暴露的统计不占据卡片；首次建立速率基线时保留位置，避免布局跳动。 */
export function showRuntimeMetric(object:CollectorObject, value:number|undefined, ids:string[]) {
  return object.runtime?.available !== false && (value != null || ['waiting','calculating'].includes(runtimeMetricEmptyState(object,ids)))
}

/** 正常指标只在浮层展开；卡片仅突出当前需要关注的实例状态和排队量。 */
export function runtimeIndicators(object:CollectorObject,kind:EntityKind):RuntimeIndicator[] {
  if(!object.runtime?.available)return []
  const indicators:RuntimeIndicator[]=[]
  if(kind === 'channel' && object.monitoring?.activeConnections === 0 && !['paused','stopped'].includes(object.runtime.state || '')){
    indicators.push({id:'disconnected',icon:'DisconnectOutlined',tone:'warn'})
  }
  if(kind === 'collector'){
    const counts={bad:0,warn:0}
    for(const [state,count] of Object.entries(object.monitoring?.pointSummary?.states || {})){
      const tone=objectTone({id:'',name:'',provider:'',configuration:{},runningState:state})
      if(tone === 'bad' || tone === 'warn')counts[tone]+=count
    }
    if(counts.bad)indicators.push({id:'errors',icon:'CloseCircleOutlined',tone:'bad',count:counts.bad})
    if(counts.warn)indicators.push({id:'warnings',icon:'ClockCircleOutlined',tone:'warn',count:counts.warn})
    const unavailable=object.monitoring?.pointSummary?.states.unavailable
    if(unavailable)indicators.push({id:'unavailable',icon:'QuestionCircleOutlined',tone:'gray',count:unavailable})
    const longGap=object.monitoring?.pointSummary?.longGap
    if(longGap)indicators.push({id:'longGap',icon:'HistoryOutlined',tone:'warn',count:longGap})
  }
  const tone=objectTone(object)
  if((tone === 'bad' || tone === 'warn') && !indicators.some(item=>item.tone === tone)){
    indicators.unshift({id:'state',icon:tone === 'bad' ? 'WarningOutlined' : 'ClockCircleOutlined',tone})
  }
  if(kind === 'collector' && object.monitoring?.pending){
    indicators.push({id:'pending',icon:'BarsOutlined',tone:'warn',count:object.monitoring.pending})
  }
  return indicators
}

function metric(snapshot:RuntimeSnapshot,id:string):number|undefined {
  return metricValue(snapshot.metrics,id)
}

function metricValue(snapshot:MetricSnapshot|undefined,id:string):number|undefined {
  const value=snapshot?.values[id]
  if(!value?.available || value.value == null)return
  const number=Number(value.value)
  return Number.isFinite(number) && number >= 0 ? number : undefined
}

/** 只比较同一节点、同一实例的相邻采样；重建、计数回退或时钟回退时等待新基线。 */
function rate(current:RuntimeSnapshot,previous:RuntimeSnapshot|undefined,ids:string[]):number|undefined {
  return previous?.available ? metricRate(current.metrics,previous.metrics,ids) : undefined
}

function metricRate(current:MetricSnapshot|undefined,previous:MetricSnapshot|undefined,ids:string[]):number|undefined {
  if(!current?.instanceId || current.instanceId !== previous?.instanceId)return
  const elapsed=current.sampledAt-previous.sampledAt
  if(elapsed <= 0)return
  let delta=0
  for(const id of ids){
    const after=metricValue(current,id),before=metricValue(previous,id)
    if(after == null || before == null || !Number.isSafeInteger(after) || !Number.isSafeInteger(before) || after < before)return
    delta+=after-before
  }
  return delta*1000/elapsed
}

function sum(values:Array<number|undefined>):number|undefined {
  return values.length && values.every(value=>value != null) ? (values as number[]).reduce((total,value)=>total+value,0) : undefined
}

/** 任一可用节点异常都不能被健康副本掩盖；全不可用时保留不可用快照。 */
export function selectRuntime(values:RuntimeSnapshot[],object?:CollectorObject):RuntimeSnapshot|undefined {
  const rank={bad:0,warn:1,gray:2,ok:3}
  let selected:RuntimeSnapshot|undefined
  for(const runtime of values){
    if(!runtime.available)continue
    if(!selected || rank[objectTone({...object,id:runtime.id,name:'',provider:'',configuration:{},runtime})] < rank[objectTone({...object,id:selected.id,name:'',provider:'',configuration:{},runtime:selected})])selected=runtime
  }
  return selected || values[0]
}

/** 每轮完整替换当前页；多节点按运行实例合计，不将未加载节点计为零或延用旧节点。 */
export function monitoredObjects<T extends CollectorObject>(objects:T[],current:RuntimeMonitoringRound,previous?:RuntimeMonitoringRound,kind:EntityKind='collector'):T[] {
  // Returning to a scope can reuse its last observed instances; the rate function still rejects resets and migrations.
  const earlier=new Map((previous?.snapshots || objects.flatMap(object=>object.monitoring?.nodes || [])).map(value=>[JSON.stringify([value.id,value.serverId]),value]))
  const groups=new Map<string,RuntimeSnapshot[]>()
  for(const value of current.snapshots){
    const group=groups.get(value.id)
    if(group)group.push(value);else groups.set(value.id,[value])
  }
  return objects.map(object=>{
    const all=groups.get(object.id) || [],active=all.filter(value=>value.available)
    const representative=selectRuntime(all,object) || {id:object.id,serverId:'',available:false}
    let pointSummary:PointRuntimeSummary|undefined
    if(active.length && active.every(value=>value.pointSummary)){
      pointSummary={total:0,available:0,states:{}}
      for(const value of active){
        pointSummary.total+=value.pointSummary!.total;pointSummary.available+=value.pointSummary!.available
        for(const [state,count] of Object.entries(value.pointSummary!.states))pointSummary.states[state]=(pointSummary.states[state] || 0)+count
      }
      for(const key of ['scheduled','awaitingFirst','longGap'] as const){
        pointSummary[key]=sum(active.map(value=>value.pointSummary?.[key]))
      }
    }
    const duration=active.map(value=>metric(value,kind === 'point' ? 'lastCollectionTimeNanos' : 'lastTaskTimeNanos')).filter(value=>value != null)
    const monitoring:RuntimeMonitoring={timestamp:current.timestamp,nodeCount:active.length,pointSummary,nodes:all,
      taskRate:sum(active.map(value=>rate(value,earlier.get(JSON.stringify([value.id,value.serverId])),['completedTasks','failedTasks']))),
      sampleRate:sum(active.map(value=>rate(value,earlier.get(JSON.stringify([value.id,value.serverId])),['receivedSamples']))),
      durationNanos:duration.length ? Math.max(...duration) : undefined,
      pending:sum(active.map(value=>metric(value,'pending'))),
    }
    const windows=active.map(value=>{
      const before=earlier.get(JSON.stringify([value.id,value.serverId]))
      return before?.available && value.metrics?.instanceId === before.metrics?.instanceId && value.metrics && before.metrics
        && value.metrics.sampledAt > before.metrics.sampledAt ? value.metrics.sampledAt-before.metrics.sampledAt : undefined
    })
    if(windows.length && windows.every(value=>value != null))monitoring.rateWindowMillis=Math.min(...windows as number[])
    if(kind !== 'channel'){
      const rates=(ids:string[])=>sum(active.map(value=>rate(value,earlier.get(JSON.stringify([value.id,value.serverId])),ids)))
      const maximum=(id:string)=>{
        const values=active.map(value=>metric(value,id)).filter((value):value is number=>value != null)
        return values.length ? Math.max(...values) : undefined
      }
      const filterIds={outlier:'filteredOutlierSamples',unchanged:'filteredUnchangedSamples',deadband:'filteredDeadbandSamples',conversion:'filteredConversionSamples'}
      monitoring.collectionRate=rates(['collectionAttempts'])
      monitoring.collectionTotal=sum(active.map(value=>metric(value,'collectionAttempts')))
      monitoring.outputRate=rates(['outputSamples'])
      monitoring.receivedTotal=sum(active.map(value=>metric(value,'receivedSamples')))
      monitoring.outputTotal=sum(active.map(value=>metric(value,'outputSamples')))
      monitoring.filteredRate=rates(Object.values(filterIds))
      monitoring.filterRates=Object.fromEntries(Object.entries(filterIds).map(([key,id])=>[key,rates([id])])) as RuntimeMonitoring['filterRates']
      monitoring.filteredTotal=sum(active.map(value=>sum(Object.values(filterIds).map(id=>metric(value,id)))))
      monitoring.filterTotals=Object.fromEntries(Object.entries(filterIds).map(([key,id])=>[key,sum(active.map(value=>metric(value,id)))])) as RuntimeMonitoring['filterRates']
      monitoring.processing=kind === 'collector' ? sum(active.map(value=>sum([metric(value,'processingSamples'),metric(value,'pendingSubscriptionSamples')]))) : sum(active.map(value=>metric(value,'processingSamples')))
      monitoring.outputFailures=rates(['outputFailures'])
      const outcomes={output:monitoring.outputRate,filtered:monitoring.filteredRate,failed:rates(['failedSamples']),cancelled:rates(['cancelledSamples']),outOfOrder:rates(['discardedOutOfOrderSamples']),rejected:rates(['rejectedSamples'])}
      // 去向只使用已结束处理的互斥计数；不能用本轮收到数减输出数猜测过滤。
      if(Object.values(outcomes).every(value=>value != null))monitoring.outcomes=outcomes as RuntimeMonitoring['outcomes']
      monitoring.nextRetryTime=maximum('nextRetryTime')
      if(kind === 'point'){
        monitoring.expectedIntervalMillis=maximum('expectedIntervalMillis')
        monitoring.collectionIntervalNanos=maximum('lastCollectionIntervalNanos')
        monitoring.receivedIntervalNanos=maximum('lastReceivedIntervalNanos')
        monitoring.outputIntervalNanos=maximum('lastOutputIntervalNanos')
        monitoring.receivedAgeNanos=maximum('receivedAgeNanos')
        monitoring.outputAgeNanos=maximum('outputAgeNanos')
        const scheduled=active.filter(value=>metric(value,'scheduledHere') === 1)
        const expected=scheduled.map(value=>metric(value,'expectedIntervalMillis'))
        const count=sum(scheduled.map(value=>metric(value,'scheduledSamples')))
        if(count != null && expected[0] && expected.every(value=>value === expected[0])){
          const maximumScheduled=(id:string)=>{
            const values=scheduled.map(value=>metric(value,id))
            return values.every(value=>value != null) ? Math.max(...values as number[]) : undefined
          }
          const scheduledWindows=scheduled.map(value=>{
            const before=earlier.get(JSON.stringify([value.id,value.serverId]))
            const measured=before && metric(before,'scheduledHere') === 1 && metric(before,'expectedIntervalMillis') === expected[0]
              ? rate(value,before,['scheduledSamples']) : undefined
            return {rate:measured,elapsed:measured != null ? value.metrics!.sampledAt-before!.metrics!.sampledAt : undefined}
          })
          const windowMillis=scheduledWindows.every(value=>value.elapsed != null) ? Math.min(...scheduledWindows.map(value=>value.elapsed!)) : undefined
          const cadence:NonNullable<RuntimeMonitoring['cadence']>={expectedMillis:expected[0],count,
            intervalNanos:maximumScheduled('lastScheduledIntervalNanos'),ageNanos:maximumScheduled('scheduledAgeNanos'),
            rate:sum(scheduledWindows.map(value=>value.rate)),windowMillis}
          // 至少20个周期仅控制离散计数的窗口边缘误差，不代表按期完成率或置信区间。
          if(windowMillis != null && windowMillis/expected[0] >= 20 && cadence.rate != null){
            const collected=scheduledWindows.reduce((total,value)=>total+value.rate!*value.elapsed!/1000,0)
            const target=scheduledWindows.reduce((total,value)=>total+value.elapsed!/expected[0]!,0)
            cadence.quantityRatio=collected/target
          }
          monitoring.cadence=cadence
        }
      }
    }
    if(kind === 'channel'){
      const transport=(value:RuntimeSnapshot|undefined)=>value?.metrics?.observations?.transport
      monitoring.readRate=sum(active.map(value=>metricRate(transport(value),transport(earlier.get(JSON.stringify([value.id,value.serverId]))),['readBytes'])))
      monitoring.writeRate=sum(active.map(value=>metricRate(transport(value),transport(earlier.get(JSON.stringify([value.id,value.serverId]))),['writtenBytes'])))
      monitoring.activeConnections=sum(active.map(value=>metricValue(transport(value),'activeConnections')))
      monitoring.pending=sum(active.map(value=>metricValue(transport(value),'pendingMessages')))
    }
    return {...object,runtime:representative,runningState:representative.state || object.runningState,monitoring}
  })
}

/** 点位低密度窗口展示累计数量，避免把一次低频采集显示成瞬时速率尖峰。 */
export function runtimePrimaryMetrics(object:CollectorObject,kind:EntityKind){
  const monitoring=object.monitoring,cadence=monitoring?.cadence
  const sparse=kind === 'point' && cadence != null && (cadence.windowMillis == null || cadence.windowMillis/cadence.expectedMillis < 20)
  const firstSnapshot=kind !== 'channel' && !cadence && monitoring?.collectionRate == null && monitoring?.sampleRate == null && monitoring?.outputRate == null
  return [
    {key:'collection',icon:sparse ? 'FieldTimeOutlined' : 'LineChartOutlined',
      label:kind !== 'point' ? firstSnapshot ? 'collectorMonitoring.collectionTotal' : 'collectorMonitoring.collection' : sparse ? 'collectorMonitoring.collectedTotal' : firstSnapshot ? 'collectorMonitoring.receivedTotal' : cadence ? 'collectorMonitoring.scheduledCollection' : 'collectorMonitoring.data',
      hint:kind !== 'point' ? firstSnapshot ? 'collectorMonitoring.collectionTotalHint' : 'collectorMonitoring.collectionHint' : cadence ? 'collectorMonitoring.scheduledHint' : firstSnapshot ? 'collectorMonitoring.receivedTotalHint' : 'collectorMonitoring.sampleRateHint',
      value:kind !== 'point' ? firstSnapshot ? monitoring?.collectionTotal : monitoring?.collectionRate : sparse ? cadence?.count : firstSnapshot ? monitoring?.receivedTotal : cadence ? cadence.rate : monitoring?.sampleRate,
      unit:sparse || firstSnapshot ? '' : '/s',ids:kind !== 'point' ? ['collectionAttempts'] : cadence ? ['scheduledSamples'] : ['receivedSamples']},
    {key:'output',icon:'SendOutlined',label:sparse || firstSnapshot ? 'collectorMonitoring.outputTotal' : 'collectorMonitoring.output',hint:sparse || firstSnapshot ? 'collectorMonitoring.outputTotalHint' : 'collectorMonitoring.outputHint',
      value:sparse || firstSnapshot ? monitoring?.outputTotal : monitoring?.outputRate,unit:sparse || firstSnapshot ? '' : '/s',ids:['outputSamples']},
  ]
}

/** 首帧使用已有计数；有有效增量后，整组切换为相同时间范围内的速率。 */
export function collectorFlowMetrics(object:CollectorObject) {
  const monitoring=object.monitoring
  const totals=monitoring?.sampleRate == null && monitoring?.outputRate == null && monitoring?.collectionRate == null
  const unit=totals ? '' : '/s'
  return {totals,steps:[
    {id:'received',icon:'DotChartOutlined',value:totals ? monitoring?.receivedTotal : monitoring?.sampleRate,unit,
      label:totals ? 'collectorMonitoring.receivedTotal' : 'collectorMonitoring.path.received',hint:totals ? 'collectorMonitoring.receivedTotalHint' : 'collectorMonitoring.sampleRateHint'},
    {id:'output',icon:'SendOutlined',value:totals ? monitoring?.outputTotal : monitoring?.outputRate,unit,
      label:totals ? 'collectorMonitoring.outputTotal' : 'collectorMonitoring.path.output',hint:totals ? 'collectorMonitoring.outputTotalHint' : 'collectorMonitoring.outputHint'},
    {id:'filtered',icon:'FilterOutlined',value:totals ? monitoring?.filteredTotal : monitoring?.filteredRate,unit,
      label:totals ? 'collectorMonitoring.filteredTotal' : 'collectorMonitoring.path.filtered',hint:totals ? 'collectorMonitoring.filteredTotalHint' : 'collectorMonitoring.filterHint'},
  ],execution:{value:totals ? monitoring?.collectionTotal : monitoring?.collectionRate,
    label:totals ? 'collectorMonitoring.collectionTotal' : 'collectorMonitoring.path.executions',
    hint:totals ? 'collectorMonitoring.collectionTotalHint' : 'collectorMonitoring.collectionHint'}}
}
