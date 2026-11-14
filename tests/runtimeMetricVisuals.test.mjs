import test from 'node:test'
import assert from 'node:assert/strict'
import { runtimeMetricRows, formatRuntimeMetric } from '../utils/runtimePresentation.ts'
import { updateMetricTrends, metricTrendKey, metricSparkline, metricHistogram, metricRelativeTime, runtimeMetricSections } from '../utils/runtimeMetricVisuals.ts'
import { runtimeMetricEmptyState, showRuntimeMetric } from '../utils/runtimeMonitoring.ts'

const definition=(id,kind='gauge',semantic='value',extra={})=>({id,expands:{metric:{kind,semantic,...extra}}})
const rows=(values,definitions,time=1000,instance='one')=>runtimeMetricRows({metrics:{instanceId:instance,sampledAt:time,values:Object.fromEntries(Object.entries(values).map(([id,value])=>[id,{available:true,value}]))}},definitions,String,String)
const node=(rows,serverId='A',available=true)=>({serverId,available,rows})

test('counter curves use rates from actual elapsed time while gauges retain their measured values',()=>{
  const definitions=[definition('count','counter'),definition('delay','gauge','duration')]
  let state=updateMetricTrends(new Map(),[node(rows({count:100,delay:4},definitions))])
  assert.equal(state.get(metricTrendKey('A','count')).points[0].value,null)
  state=updateMetricTrends(state,[node(rows({count:120,delay:7},definitions,3000))])
  assert.equal(state.get(metricTrendKey('A','count')).points.at(-1).value,10)
  assert.equal(state.get(metricTrendKey('A','delay')).points.at(-1).value,7)
  assert.equal(metricSparkline(state.get(metricTrendKey('A','count'))),undefined)
  assert.equal(metricSparkline(state.get(metricTrendKey('A','delay'))).min,4)
  state=updateMetricTrends(state,[node(rows({count:120,delay:7},definitions,3000))])
  assert.equal(state.get(metricTrendKey('A','count')).points.length,2)
})

test('restarts, counter rollback, missing samples and offline nodes never bridge a rate baseline',()=>{
  const definitions=[definition('count','counter')],key=metricTrendKey('A','count')
  let state=updateMetricTrends(new Map(),[node(rows({count:100},definitions))])
  state=updateMetricTrends(state,[node(rows({count:200},definitions,2000,'two'))])
  assert.equal(state.get(key).points.at(-1).value,null)
  state=updateMetricTrends(state,[node(rows({count:1},definitions,3000,'two'))])
  assert.equal(state.get(key).points.length,1)
  state=updateMetricTrends(state,[node(rows({count:2},definitions,4000,'two'), 'A',false)])
  assert.equal(state.size,0)
  state=updateMetricTrends(state,[node(rows({count:3},definitions,5000,'two'))])
  assert.equal(state.get(key).points.at(-1).value,null)
  const missing=rows({count:4},definitions,6000,'two'); missing[0].available=false
  assert.equal(updateMetricTrends(state,[node(missing)]).size,0)
})

test('node and nested observation identities are independent and history remains bounded',()=>{
  const definitions=[definition('count','counter')],key=metricTrendKey('A','count')
  let state=new Map()
  for(let i=1;i<=100;i++)state=updateMetricTrends(state,[node(rows({count:i},definitions,i*1000)),node(rows({count:i*3},definitions,i*1000),'B')])
  assert.equal(state.get(key).points.length,30)
  assert.equal(state.get(key).points.at(-1).value,1)
  assert.equal(state.get(metricTrendKey('B','count')).points.at(-1).value,3)
  assert.equal(updateMetricTrends(state,[node(rows({count:101},definitions,101000))]).size,1)
  const nested=runtimeMetricRows({metrics:{instanceId:'root',sampledAt:1000,values:{},observations:{transport:{instanceId:'wire',sampledAt:900,values:{count:{available:true,value:4}}}}}},[definition('transport.count','counter')],String,String)
  assert.equal(nested[0].instanceId,'wire')
  assert.equal(nested[0].sampledAt,900)
})

test('zero and constant gauges draw a flat line without a fabricated increase or zero baseline',()=>{
  const definitions=[definition('pending')]
  let state=updateMetricTrends(new Map(),[node(rows({pending:0},definitions))])
  state=updateMetricTrends(state,[node(rows({pending:0},definitions,2500))])
  const chart=metricSparkline(state.get(metricTrendKey('A','pending')))
  assert.equal(chart.path,'M2.0,15.0 L118.0,15.0')
  assert.equal(chart.min,0)
  assert.equal(chart.max,0)
  assert.equal(updateMetricTrends(new Map(),[node(rows({undocumented:3},[]))]).size,0)
})

test('annotation references suppress zero-sample and unavailable-window placeholders in their own scope',()=>{
  const definitions=[definition('stats.mean','gauge','duration',{sampleCountProperty:'count'}),definition('stats.max','gauge','value',{availableProperty:'available'})]
  const snapshot={metrics:{instanceId:'root',sampledAt:1000,values:{count:{available:true,value:100}},observations:{stats:{instanceId:'stats',sampledAt:1000,values:{count:{available:true,value:0},mean:{available:true,value:0},max:{available:true,value:0},available:{available:true,value:false}}}}}}
  assert.ok(runtimeMetricRows(snapshot,definitions,String,String).filter(row=>row.id==='stats.mean'||row.id==='stats.max').every(row=>!row.available))
  snapshot.metrics.observations.stats.values.count.value=1
  snapshot.metrics.observations.stats.values.available.value=true
  assert.ok(runtimeMetricRows(snapshot,definitions,String,String).filter(row=>row.id==='stats.mean'||row.id==='stats.max').every(row=>row.available))
})

test('only explicitly defined independent inclusive histogram buckets become bars',()=>{
  const definitions=[definition('buckets','gauge','value',{statistic:'distribution',bucketMode:'independent',boundary:'inclusiveUpper',overflowBucket:true,boundsProperty:'bounds'})]
  const row=rows({buckets:[2,3,5],bounds:[10,20]},definitions)[0]
  const distribution=metricHistogram(row)
  assert.equal(distribution.total,10)
  assert.equal(distribution.bins[1].share,.3)
  assert.equal(distribution.bins[2].upper,undefined)
  assert.equal(distribution.bins[2].lower,20)
  assert.equal(metricHistogram({...row,bounds:[20,10]}),undefined)
  assert.equal(metricHistogram({...row,definition:definition('buckets')}),undefined)
})

test('timestamp semantics show relative time from the sampling clock; zero means no recorded event',()=>{
  const defs=[definition('latest','gauge','timestamp')]
  assert.deepEqual(metricRelativeTime(rows({latest:1000},defs,61000)[0]),{value:-1,unit:'minute',future:false})
  assert.deepEqual(metricRelativeTime(rows({latest:111000},defs,1000)[0]),{value:2,unit:'minute',future:true})
  assert.equal(rows({latest:0},defs)[0].available,false)
  assert.equal(formatRuntimeMetric(5,definition('rate','gauge','value',{statistic:'rate'}),String,String),'5/s')
})

test('missing values distinguish waiting, unavailable, unsupported, partial coverage and rate warm-up',()=>{
  const object={id:'one',name:'one',configuration:{},provider:'test'}
  assert.equal(runtimeMetricEmptyState(object,['count']),'waiting')
  object.runtime={available:false}
  assert.equal(runtimeMetricEmptyState(object,['count']),'unavailable')
  object.runtime={available:true,metrics:{values:{}}}
  assert.equal(runtimeMetricEmptyState(object,['count']),'notProvided')
  object.runtime.metrics.values.count={available:true,value:0}
  assert.equal(runtimeMetricEmptyState(object,['count']),'calculating')
  object.monitoring={nodes:[object.runtime,{available:true,metrics:{values:{}}}]}
  assert.equal(runtimeMetricEmptyState(object,['count']),'incomplete')
  object.runtime.metrics.observations={wire:{values:{bytes:{available:true,value:0}}}}
  delete object.monitoring
  assert.equal(runtimeMetricEmptyState(object,['wire.bytes']),'calculating')
})

test('missing metric visibility preserves real zero and shares the search and node scope',()=>{
  const zero=rows({pending:0},[definition('pending')])[0]
  const missing={...zero,id:'missing',name:'Missing',available:false}
  const nodes=[node([zero,missing]),node([missing],'B')]
  const collapsed=runtimeMetricSections(nodes)
  assert.equal(collapsed.missing,2)
  assert.equal(collapsed.sections.length,1)
  assert.equal(collapsed.sections[0].groups.flatMap(group=>group.rows)[0].value,0)
  assert.equal(runtimeMetricSections(nodes,'','A',true).sections[0].groups.flatMap(group=>group.rows).length,2)
  assert.equal(runtimeMetricSections(nodes,'missing','A').missing,1)
  assert.equal(runtimeMetricSections(nodes,'missing','A').sections.length,0)
  assert.equal(runtimeMetricSections(nodes,'pending','A').missing,0)
  const object={runtime:{available:true,metrics:{values:{pending:{available:true,value:0}}}}}
  assert.equal(showRuntimeMetric(object,0,['pending']),true)
  assert.equal(showRuntimeMetric(object,undefined,['pending']),true)
  assert.equal(showRuntimeMetric(object,undefined,['unknown']),false)
  object.runtime.available=false
  assert.equal(showRuntimeMetric(object,0,['pending']),false)
})
