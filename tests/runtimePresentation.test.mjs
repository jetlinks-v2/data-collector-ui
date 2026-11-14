import assert from 'node:assert/strict'
import test from 'node:test'
import { formatMetricQuantity, formatRuntimeMetric, metricPriority, actionTone, recordingChoices, runtimeMetricRows } from '../utils/runtimePresentation.ts'

const time = value => `time:${value}`
const t = value => value.split('.').at(-1)

test('boolean observations use readable localized values',()=>{
  assert.equal(formatRuntimeMetric(true,undefined,time,t),'yes')
  assert.equal(formatRuntimeMetric(false,undefined,time,t),'no')
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
