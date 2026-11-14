import assert from 'node:assert/strict'
import test from 'node:test'
import { monitoredObjects,runtimeIndicators } from '../utils/runtimeMonitoring.ts'
import { runtimeMetricDefinitions,runtimeMetricRows } from '../utils/runtimePresentation.ts'

const channel={id:'channel',name:'Channel',provider:'test',configuration:{}}
function node(serverId,instanceId,time,read,written){
  return {id:'channel',serverId,available:true,state:'running',runtimeState:'running',metrics:{instanceId:'owner',sampledAt:time,values:{},observations:{transport:{instanceId,sampledAt:time,scope:'transport',values:Object.fromEntries(Object.entries({readBytes:read,writtenBytes:written,activeConnections:1,pendingMessages:2}).map(([id,value])=>[id,{available:true,value}]))}}}}
}
test('channel byte rates sum per node and do not reuse baselines across transport replacement',()=>{
  const previous={timestamp:1000,snapshots:[node('a','a1',1000,100,10),node('b','b1',1000,200,20)]}
  const current={timestamp:3000,snapshots:[node('a','a1',3000,300,50),node('b','b1',3000,600,100)]}
  const value=monitoredObjects([channel],current,previous,'channel')[0]
  assert.equal(value.monitoring.readRate,300);assert.equal(value.monitoring.writeRate,60)
  assert.equal(value.monitoring.activeConnections,2);assert.equal(value.monitoring.pending,4)
  current.snapshots[1]=node('b','b2',3000,600,100)
  assert.equal(monitoredObjects([channel],current,previous,'channel')[0].monitoring.readRate,undefined)
  assert.deepEqual(runtimeIndicators({...value,monitoring:{activeConnections:0}},'channel').map(item=>item.id),['disconnected'])
})
test('plugin definitions and values share scoped paths without hiding unsupported values',()=>{
  const metrics={values:{},observations:{transport:{values:{readBytes:{available:true,value:1024},optional:{available:true,value:null}},metadata:{properties:[{id:'readBytes',i18nName:'接收字节',valueType:{unit:{symbol:'B'}}}]}}}}
  const definitions=runtimeMetricDefinitions(metrics)
  assert.equal(definitions[0].id,'transport.readBytes')
  const rows=runtimeMetricRows({metrics},definitions,String,String)
  assert.equal(rows[0].name,'接收字节');assert.equal(rows[0].text,'1,024 B');assert.equal(rows[1].text,'collectorMonitoring.empty.noSamples')
})
