import assert from 'node:assert/strict'
import test from 'node:test'
import { formatMetricQuantity, formatRuntimeMetric, metricPriority, actionTone, recordingChoices, runtimeMetricRows, runtimeFailureNotice, runtimeFailureReason, pointRecording } from '../utils/runtimePresentation.ts'

const time = value => `time:${value}`
const t = value => value.split('.').at(-1)

test('failure descriptions translate public codes, preserve human messages and explain missing reasons',()=>{
  const words={'collectorRuntime.errors.Bad_ConnectionRefused':'设备拒绝连接','collectorRuntime.errors.unknown':'请结合状态码排查','plugin.failure':'设备暂时无法读取'}
  const translate=key=>words[key],exists=key=>key in words
  assert.equal(runtimeFailureReason('Bad_ConnectionRefused',translate,exists),'设备拒绝连接')
  assert.equal(runtimeFailureReason('Bad_VendorStatus',translate,exists),'请结合状态码排查')
  assert.equal(runtimeFailureReason(undefined,translate,exists),'请结合状态码排查')
  assert.equal(runtimeFailureReason('',translate,exists),'请结合状态码排查')
  assert.equal(runtimeFailureReason('plugin.failure',translate,exists),'设备暂时无法读取')
  assert.equal(runtimeFailureReason('设备正在维护',translate,exists),'设备正在维护')
})

test('point replay separates batch branches and inherits point ownership without changing shared recordings',()=>{
  const action=(id,parentId,pointId,status='completed')=>({id,parentId,tags:pointId ? {pointId} : {},status,attributes:{}})
  const failure={pointId:'other',reason:'Bad_Timeout'}
  const snapshot={collectorId:'collector',executions:[
    {id:1,status:'failed',failure,actions:[action(0,-1,undefined,'failed'),action(1,0,'point'),action(2,1),action(3,0,'other','failed'),action(4,3)]},
    {id:2,status:'completed',actions:[action(0,-1,'other')]},
    {id:3,status:'failed',failure:{...failure,pointId:'point'},actions:[{...action(0,-1),attributes:{summary:true,occurrences:20}}]},
  ]}
  const result=pointRecording(snapshot,'point')
  assert.deepEqual(result.executions.map(item=>item.id),[1])
  assert.deepEqual(result.executions[0].actions.map(item=>item.id),[1,2])
  assert.equal(result.executions[0].status,'completed')
  assert.equal(result.executions[0].failure,undefined)
  assert.equal(snapshot.executions[0].actions.length,5)
  assert.equal(snapshot.executions[0].failure,failure)
  assert.equal(pointRecording(snapshot,'other').executions[0].failure,failure)
  assert.deepEqual(pointRecording(snapshot,'missing').executions,[])
  assert.equal(pointRecording(undefined,'point'),undefined)
})

test('point replay retains its own failure and pending steps even when batch status differs',()=>{
  const failure={pointId:'point',reason:'Bad_Timeout'}
  const actions=[{id:1,parentId:-1,tags:{pointId:'point'},status:'completed',attributes:{code:0x800A0000}}]
  assert.equal(pointRecording({executions:[{id:1,status:'completed',actions}]},'point').executions[0].status,'failed')
  const own=pointRecording({executions:[{id:1,status:'failed',actions,failure}]},'point')
  assert.equal(own.executions[0].failure,failure)
  const pending=[{id:2,parentId:1,status:'running'}, {...actions[0],attributes:{}}]
  assert.equal(pointRecording({executions:[{id:1,status:'failed',actions:pending}]},'point').executions[0].status,'running')
})

test('runtime details keep the latest failure across nodes after recovery and prefer ongoing failures',()=>{
  const failure=timestamp=>({timestamp,reason:'Read failed',stage:'read',code:1})
  const old=failure(100),recent=failure(300),ongoing=failure(200)
  const object={runtime:{available:true,lastFailure:old},monitoring:{nodes:[{available:true,lastFailure:old},{available:true,lastFailure:recent}]}}
  assert.deepEqual(runtimeFailureNotice(object),{failure:recent,active:false})
  object.monitoring.nodes.push({available:true,currentFailure:ongoing})
  assert.deepEqual(runtimeFailureNotice(object),{failure:ongoing,active:true})
  object.monitoring.nodes.at(-1).available=false
  assert.deepEqual(runtimeFailureNotice(object),{failure:recent,active:false})
  assert.deepEqual(runtimeFailureNotice({runtime:{available:false,currentFailure:old}}),{failure:old,active:false})
  assert.equal(runtimeFailureNotice({}),undefined)
})

test('boolean observations use readable localized values',()=>{
  assert.equal(formatRuntimeMetric(true,undefined,time,t),'yes')
  assert.equal(formatRuntimeMetric(false,undefined,time,t),'no')
})

test('summaries hide settled history while details preserve it across all nodes',()=>{
  const old={timestamp:1,reason:'old failure'}, newer={timestamp:2,reason:'new failure'}
  const object={monitoring:{nodes:[{available:true,lastFailure:old,currentFailure:null,failureSettled:true}]}}
  assert.equal(runtimeFailureNotice(object,false),undefined)
  assert.deepEqual(runtimeFailureNotice(object),{failure:old,active:false})
  object.monitoring.nodes.push({available:true,lastFailure:newer,currentFailure:null})
  assert.deepEqual(runtimeFailureNotice(object,false),{failure:newer,active:false})
  object.monitoring.nodes[1].currentFailure=newer
  object.monitoring.nodes[1].failureSettled=true
  assert.deepEqual(runtimeFailureNotice(object,false),{failure:newer,active:true})
})

test('known traffic and duration units scale without losing their original values or changing custom units',()=>{
  for(const [value,unit,text,symbol] of [[0,'bytes','0','B'],[999,'bytes','999','B'],[1000,'bytes','1','KB'],[1500000,'bytes','1.5','MB'],[500,'nanoseconds','500','ns'],[1500,'nanoseconds','1.5','μs'],[1500000,'nanoseconds','1.5','ms'],[1500000000,'nanoseconds','1.5','s'],[60,'seconds','1','min'],[3600,'seconds','1','h']]){
    assert.deepEqual(formatMetricQuantity(value,unit),{value:text,unit:symbol})
  }
  const duration={valueType:{unit:'nanoseconds'},expands:{metric:{semantic:'duration'}}}
  assert.equal(formatRuntimeMetric(1500,duration,time,t),'1.5 μs')
  assert.equal(formatRuntimeMetric(1500,duration,time,t,false),'1,500 ns')
  assert.equal(formatRuntimeMetric(1500000,{valueType:{unit:{id:'bytes',symbol:'B'}},expands:{metric:{statistic:'rate'}}},time,t),'1.5 MB/s')
  assert.equal(formatRuntimeMetric(42,{valueType:{unit:{id:'custom',symbol:'rpm'}}},time,t),'42 rpm')
  assert.equal(formatMetricQuantity(42,'custom'),undefined)
})
test('all supplied metrics remain visible with metadata names, units, explanations and unavailable values',()=>{
  const definitions=[{id:'received',i18nName:'Received data',i18nDescription:'Data entering processing',valueType:{unit:'sample'}}]
  const rows=runtimeMetricRows({metrics:{values:{received:{available:true,value:42},extensionMetric:{available:true,value:0},unavailable:{available:false,value:5}}}},definitions,time,t)
  assert.equal(rows.length,3)
  assert.equal(rows.find(item=>item.id === 'received').name,'Received data')
  assert.equal(rows.find(item=>item.id === 'received').description,'Data entering processing')
  assert.equal(rows.find(item=>item.id === 'received').text,'42 sample')
  assert.equal(rows.find(item=>item.id === 'extensionMetric').text,'0')
  assert.equal(rows.find(item=>item.id === 'unavailable').text,'unavailable')
})
test('latest recording follows new executions while the latest abnormal recording remains available',()=>{
  const failed={id:1,status:'completed',failure:{reason:'Bad_Timeout'},actions:[]}
  const recovered={id:2,status:'completed',actions:[]}
  const running={id:3,status:'running',actions:[]}
  const choices=recordingChoices([failed,recovered,running])
  assert.equal(choices.latest,running)
  assert.equal(choices.failed,failed)
  assert.equal(recordingChoices([recovered]).failed,undefined)
  assert.equal(recordingChoices([]).latest,undefined)
  const slow={id:4,status:'completed',actions:[{attributes:{decision:'slow',summary:true}}]}
  assert.equal(recordingChoices([failed,recovered,slow]).failed,slow)
  assert.equal(recordingChoices([slow,running]).failed,slow)
})
test('formats real platform unit objects and timestamp semantics', () => {
  assert.equal(formatRuntimeMetric(1500000, { valueType: { unit: { id:'nanoseconds', symbol:'ns' } } }, time, t), '1.5 ms')
  assert.equal(formatRuntimeMetric(1500000, { valueType: { unit:'nanoseconds' } }, time, t), '1.5 ms')
  assert.equal(formatRuntimeMetric(42, { valueType: { unit: { id:'task', symbol:'task' } } }, time, t), '42 task')
  assert.equal(formatRuntimeMetric(42, { valueType: { unit:'operation' } }, time, key => key === 'collectorRuntime.units.operation' ? '次' : key), '42 次')
  assert.equal(formatRuntimeMetric(42, { valueType: { unit: { id:'custom', symbol:'rpm' } } }, time, t), '42 rpm')
  assert.equal(formatRuntimeMetric(42, { expands: { metric: { semantic:'timestamp' } } }, time, t), 'time:42')
  assert.equal(metricPriority({ expands:{metric:{kind:'gauge',semantic:'value'}} }) < metricPriority({ expands:{metric:{kind:'counter',semantic:'value'}} }), true)
})
test('completed actions preserve failed results, filter decisions and active states', () => {
  const action = {status:'completed',attributes:{code:0x800A0000}}
  assert.equal(actionTone(action), 'bad')
  assert.equal(actionTone({...action,attributes:{code:-2146828288}}), 'bad')
  assert.equal(actionTone({...action,attributes:{success:false}}), 'bad')
  assert.equal(actionTone({...action,attributes:{code:0,decision:'filtered'}}), 'gray')
  assert.equal(actionTone({...action,status:'running',attributes:{}}), 'warn')
  assert.equal(actionTone({...action,attributes:{code:0}}), 'ok')
})
