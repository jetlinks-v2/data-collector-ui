import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve, dirname } from 'node:path'
import { transformSync } from 'esbuild'
const require = createRequire(import.meta.url), cache = new Map()
function load(path) {
  path = resolve(import.meta.dirname, '..', path)
  if (cache.has(path)) return cache.get(path)
  const module = { exports: {} }
  new Function('require','module','exports',transformSync(readFileSync(path,'utf8'),{loader:'ts',format:'cjs'}).code)(id=>id.startsWith('.') ? load(resolve(dirname(path),`${id}.ts`)) : require(id),module,module.exports)
  cache.set(path,module.exports);return module.exports
}
const {createPointHistoryCache,pointHistoryLimits}=load('utils/pointHistoryCache.ts')
const {pointHistoryKind,pointHistoryChart,storedPointSamples}=load('utils/pointHistoryView.ts')
const sample=(value,timestamp=1,origin='node/instance')=>({collectorId:'c',pointId:'p',data:{parsedData:value,timestamp},origin})

test('observation cache retains false, zero, precision and immutable values only for its active point',()=>{
  const history=createPointHistoryCache();history.start('c','p',0)
  history.append(sample(false,0),0);history.append(sample(0,1),1)
  history.append(sample('18446744073709551615',2),2)
  const object={items:[1,2]};history.append(sample(object,3),3);object.items[0]=99
  assert.equal(history.append({...sample(4,4),pointId:'other'},4),false)
  assert.deepEqual(history.read('c','p',4).samples.map(row=>row.value),[false,0,'18446744073709551615',{items:[1,2]}])
  assert.equal(history.append(sample({items:[1,2]},3),4),false,'replayed latest samples are not duplicated')
  history.pause(true);assert.equal(history.append(sample(9,4),5),false)
  history.pause(false);history.append(sample(10,5),6)
  const rows=history.read('c','p',6).samples
  assert.notEqual(rows.at(-1).segment,rows.at(-2).segment,'resuming leaves a recording gap')
  history.stop();assert.equal(history.append(sample(11,6),7),false)
  history.start('c','p',8);history.append(sample(12,7,'node/new-instance'),8)
  assert.notEqual(history.read('c','p',8).samples.at(-1).segment,rows.at(-1).segment)
})

test('cache bounds age, per-point rows, total bytes, oversize samples and least recently viewed points',()=>{
  const history=createPointHistoryCache();history.start('c','p',0)
  for(let i=0;i<pointHistoryLimits.perPoint+10;i++)history.append(sample(i,i),i)
  assert.equal(history.read('c','p',2010).samples.length,pointHistoryLimits.perPoint)
  assert.equal(history.read('c','p',2010).evicted,10)
  assert.equal(history.read('c','p',pointHistoryLimits.age+2010).samples.length,0)
  for(let i=0;i<11;i++){history.start('c',String(i),i);history.append({...sample(i,i),pointId:String(i)},i)}
  assert.equal(history.size.points,10);assert.equal(history.read('c','0',12),undefined)
  history.clear();assert.deepEqual(history.size,{points:0,samples:0,bytes:0})
  const large='x'.repeat(1024*1024)
  for(let i=0;i<6;i++){history.start('c',String(i),i);history.append({...sample(large,i),pointId:String(i)},i)}
  assert.ok(history.size.bytes<=pointHistoryLimits.bytes)
  history.start('c','oversized',10)
  history.append({...sample('x'.repeat(pointHistoryLimits.bytes),10),pointId:'oversized'},10)
  assert.equal(history.read('c','oversized',10).skipped,1)
  assert.equal(history.read('c','oversized',10).samples.length,0)
})

test('cache orders late samples by source time and rejects unsupported data without breaking observation',()=>{
  const history=createPointHistoryCache();history.start('c','p',0)
  for(const timestamp of [3,1,2])history.append(sample(timestamp,timestamp),timestamp+10)
  assert.deepEqual(history.read('c','p',20).samples.map(row=>row.timestamp),[1,2,3])
  const cyclic={};cyclic.self=cyclic
  assert.doesNotThrow(()=>history.append(sample(cyclic,4),20))
  history.append({...sample(2,4),data:{parsedData:2}},20)
  assert.equal(history.read('c','p',20).skipped,2)
})

test('chart selection follows actual types and falls back rather than coercing arbitrary strings or mixed arrays',()=>{
  const rows=values=>values.map((value,timestamp)=>({id:String(timestamp),timestamp,value}))
  assert.equal(pointHistoryKind(undefined,rows([0,1])),'number')
  assert.equal(pointHistoryKind(undefined,rows(['001','002'])),'table')
  assert.equal(pointHistoryKind({id:'long'},rows(['18446744073709551615'])),'number')
  assert.equal(pointHistoryKind({id:'double'},rows([1,'changed type'])),'table')
  assert.equal(pointHistoryKind({id:'boolean'},rows([false,true])),'state')
  assert.equal(pointHistoryKind({id:'boolean'},rows([false,'changed type'])),'table')
  assert.equal(pointHistoryKind({id:'array',elementType:{id:'double'}},rows([[0,1],[2]])),'array-number')
  assert.equal(pointHistoryKind({id:'array',elementType:{id:'boolean'}},rows([[false,true]])),'array-state')
  assert.equal(pointHistoryKind({id:'array',elementType:{id:'boolean'}},rows([[false,'changed type']])),'table')
  assert.equal(pointHistoryKind(undefined,rows([[1,'x']])),'table')
  assert.equal(pointHistoryKind({id:'binary'},rows([[1,2]])),'table')
})

test('charts preserve exact tooltips, enum labels, absent array elements and recording discontinuities',()=>{
  const rows=[{id:'a',timestamp:1,value:'18446744073709551615',segment:1,origin:'one'},{id:'b',timestamp:2,value:0,segment:2,origin:'two'}]
  const chart=pointHistoryChart(rows,{id:'long'},[],'empty')
  assert.equal(chart.data.series[0].data[0].exactValue,'18446744073709551615')
  assert.equal(chart.data.series[0].data[1].value[1],null)
  assert.equal(chart.data.series[0].data[2].value[1],0)
  const states=pointHistoryChart([{id:'a',timestamp:1,value:false},{id:'b',timestamp:2,value:true}],{id:'boolean',falseText:'Off',trueText:'On'},[],'empty')
  assert.deepEqual(states.option.yAxis.data,['Off','On']);assert.equal(states.data.series[0].data[0].value[1],0)
  const enums=pointHistoryChart([{id:'a',timestamp:1,value:'idle'}],{id:'enum',elements:[{value:'idle',text:'Idle'},{value:'run',text:'Running'}]},[],'empty')
  assert.deepEqual(enums.option.yAxis.data,['Idle','Running'])
  const numericEnum=pointHistoryChart([{id:'a',timestamp:1,value:'1'}],{id:'enum',elements:[{value:1,text:'Running'}]},[],'empty')
  assert.deepEqual(numericEnum.option.yAxis.data,['Running']);assert.equal(numericEnum.data.series[0].data[0].value[1],0)
  const arrays=pointHistoryChart([{id:'a',timestamp:1,value:[10,20]},{id:'b',timestamp:2,value:[30]}],{id:'array',elementType:{id:'int'}},[1],'empty')
  assert.equal(arrays.data.series[0].data[1].value[1],null)
  const tooltip=arrays.option.tooltip.formatter([{seriesName:'[0]',axisValueLabel:'time',data:{exactValue:'18446744073709551615'}},{seriesName:'[1]',axisValueLabel:'time',data:{exactValue:'0'}}])
  assert.ok(tooltip.includes('[0]\ntime\n18446744073709551615'));assert.ok(tooltip.includes('[1]\ntime\n0'))
})

test('stored structured values decode only under trusted metadata and retain scalar numeric strings',()=>{
  const rows=value=>[{id:'a',timestamp:0,value}]
  assert.deepEqual(storedPointSamples(rows('["18446744073709551615",0]'),{id:'array'},JSON.parse)[0].value,['18446744073709551615',0])
  assert.equal(storedPointSamples(rows('false'),{id:'boolean'},JSON.parse)[0].value,false)
  assert.equal(storedPointSamples(rows('001'),{id:'string'},JSON.parse)[0].value,'001')
  assert.equal(storedPointSamples(rows('[broken'),{id:'array'},JSON.parse)[0].value,'[broken')
})
