import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createRequire} from 'node:module'
import {resolve,dirname} from 'node:path'
import {transformSync} from 'esbuild'
import * as vue from 'vue'
import * as lodash from 'lodash-es'
const require=createRequire(import.meta.url)
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no});return {promise,resolve,reject}}
const settle=async()=>{await vue.nextTick();await Promise.resolve();await vue.nextTick()}

function fixture() {
  const details=[],queries=[],aggregates=[],unmount=[],deactivated=[],edited=[]
  const mocks={
    vue:{...vue,provide(){},onBeforeUnmount:callback=>unmount.push(callback),onDeactivated:callback=>deactivated.push(callback)},
    'vue-i18n':{useI18n:()=>({t:key=>key})},'lodash-es':lodash,
    '@jetlinks-web-core/utils/json':{parseJsonWithPrecision:JSON.parse},
  }
  const api={
    loadWorkspacePoint:(collector,id,signal)=>{const request={collector,id,signal,...deferred()};details.push(request);return request.promise},
    queryPointHistory:(collector,query,signal)=>{const request={collector,query,signal,...deferred()};queries.push(request);return request.promise},
    queryPointAggregation:(collector,query,signal)=>{const request={collector,query,signal,...deferred()};aggregates.push(request);return request.promise},
    getPointDataType:async()=>({success:true,result:{dataType:{id:'long'}}}),
  }
  const modules=new Map(),root=resolve(import.meta.dirname,'..')
  function load(path) {
    if(modules.has(path))return modules.get(path)
    const module={exports:{}}
    new Function('require','module','exports',transformSync(readFileSync(path,'utf8'),{loader:'ts',format:'cjs'}).code)(id=>{
      if(mocks[id])return mocks[id]
      if(id.endsWith('/api/data-collect/workspace')||id.endsWith('/api/data-collect/collector'))return api
      return id.startsWith('.')?load(resolve(dirname(path),`${id}.ts`)):require(id)
    },module,module.exports)
    modules.set(path,module.exports);return module.exports
  }
  const data={collector:vue.ref({id:'collector'}),selectedPoint:vue.ref(),points:vue.ref([]),historyRevision:vue.ref(0),historyPointId:vue.ref(''),historyPaused:vue.ref(false),paused:vue.ref(false),valueError:vue.ref(''),historyCache:load(resolve(root,'utils/pointHistoryCache.ts')).createPointHistoryCache()}
  const scope=vue.effectScope(),history=scope.run(()=>load(resolve(root,'views/data-collect/hook/usePointHistory.ts')).usePointHistory(data,point=>edited.push(point)))
  return {history,data,details,queries,aggregates,edited,deactivated,close(){unmount.forEach(callback=>callback());scope.stop()}}
}
const point=id=>({id,name:id,collectorId:'collector',configuration:{},provider:'test'})
const full=(id,type='long',features=['storageData'])=>({success:true,result:[{...point(id),features,metadata:{dataType:{id:type}}}]})
const result=value=>({success:true,result:{total:1,data:[{id:'record',timestamp:1000,value}]}})

test('hover opens trends without a drawer and expansion retains the same query and recording session',async()=>{
  const f=fixture(),h=f.history,trigger={id:'trigger'},other={id:'other'}
  try {
    const opening=h.show(point('point'),trigger,true)
    assert.equal(h.open.value,true);assert.equal(h.preview.value,true)
    f.details[0].resolve(full('point'));await opening;await settle()
    assert.equal(h.period.value,'15m');assert.equal(f.queries.length,1)
    f.queries[0].resolve(result(12));await settle()
    h.hidePreview(other);assert.equal(h.open.value,true,'a stale popover cannot close the active one')
    h.expand();h.hidePreview(trigger);await settle()
    assert.equal(h.open.value,true);assert.equal(h.preview.value,false)
    assert.equal(f.queries.length,1);assert.equal(h.samples.value[0].value,12)
    assert.equal(f.data.historyPointId.value,'point')
    await h.show(point('other'),other,true)
    assert.equal(f.details.length,1,'hover does not replace the persistent panel')
  } finally {f.close()}
})

test('leaving a hover preview cancels its request and ignores the late response',async()=>{
  const f=fixture(),h=f.history,trigger={id:'trigger'}
  try {
    const opening=h.show(point('point'),trigger,true)
    h.hidePreview(trigger)
    assert.equal(h.open.value,false);assert.equal(f.data.historyPointId.value,'')
    assert.equal(f.details[0].signal.aborted,true)
    f.details[0].resolve(full('point'));await opening;await settle()
    assert.equal(f.queries.length,0);assert.equal(h.point.value.id,'point')
  } finally {f.close()}
})

test('history cancels superseded point metadata and scopes every saved-data query to its collector and point',async()=>{
  const f=fixture(),h=f.history
  try {
    const first=h.show(point('first'));await settle()
    const second=h.show(point('second'));await settle()
    assert.equal(f.details[0].signal.aborted,true)
    f.details[0].resolve(full('first'));await first
    assert.equal(h.point.value.id,'second');assert.equal(f.queries.length,0)
    f.details[1].resolve(full('second'));await second;await settle()
    assert.equal(f.queries.length,1)
    assert.equal(f.queries[0].collector,'collector')
    assert.deepEqual(f.queries[0].query.terms[0],{column:'pointId',value:'second'})
    assert.equal(f.queries[0].query.pageSize,200);assert.equal(f.queries[0].query.terms[1].termType,'btw')
    f.queries[0].resolve(result('18446744073709551615'));await settle()
    assert.equal(h.samples.value[0].value,'18446744073709551615')
    assert.equal(h.kind.value,'number')
    h.close();assert.equal(f.data.historyPointId.value,'')
  } finally {f.close()}
})

test('switching sources aborts historical queries and never merges late records with observation samples',async()=>{
  const f=fixture(),h=f.history
  try {
    const opening=h.show(point('point'));f.details[0].resolve(full('point'));await opening;await settle()
    h.source.value='live';await settle()
    assert.equal(f.queries[0].signal.aborted,true)
    f.data.historyCache.start('collector','point');f.data.historyCache.append({collectorId:'collector',pointId:'point',origin:'node',data:{timestamp:2,parsedData:0}})
    ++f.data.historyRevision.value
    f.queries[0].resolve(result(999));await settle()
    assert.deepEqual(h.samples.value.map(row=>row.value),[0])
    h.source.value='stored';await settle();assert.equal(f.queries.length,2)
    f.queries[1].resolve(result(42));await settle()
    assert.deepEqual(h.samples.value.map(row=>row.value),[42])
    h.configure();assert.equal(h.open.value,false);await h.afterOpenChange(false)
    assert.equal(f.edited[0].id,'point')
  } finally {f.close()}
})

test('disabled storage still permits old history, while failed metadata never invents a saved policy',async()=>{
  const f=fixture(),h=f.history
  try {
    const opening=h.show(point('point'));f.details[0].resolve(full('point','boolean',[]));await opening;await settle()
    assert.equal(h.stored.value,false);assert.equal(h.source.value,'live');assert.equal(f.queries.length,0)
    h.source.value='stored';await settle();f.queries[0].resolve(result(false));await settle()
    assert.equal(h.samples.value[0].value,false);assert.equal(h.kind.value,'state')
    const next=h.show(point('missing'));f.details[1].reject(new Error('denied'));await next;await settle()
    assert.equal(h.stored.value,undefined);assert.equal(h.detailsError.value,'denied')
    h.close();assert.equal(h.loading.value,false)
  } finally {f.close()}
})

test('numeric aggregation uses the numeric column and explicit timezone/range; arrays select bounded real indices',async()=>{
  const f=fixture(),h=f.history
  try {
    const opening=h.show(point('point'));f.details[0].resolve(full('point'));await opening;await settle()
    f.queries[0].resolve(result(10));await settle()
    h.aggregation.value='avg';await settle()
    assert.equal(f.aggregates.length,1)
    const query=f.aggregates[0].query
    assert.equal(query.columns[0].column,'numberValue');assert.equal(query.filter.terms[0].value,'point')
    assert.ok(query.groupByTime.timeZone);assert.ok(query.groupByTime.fromTimestamp<query.groupByTime.toTimestamp)
    assert.equal(query.limit,500)
    assert.equal(query.groupByTime.interval,'1m')
    assert.ok(h.intervalOptions.value.some(option=>option.value==='1m'),'minute aggregation remains available through the shared interval contract')
    f.aggregates[0].resolve({success:true,result:[{timestamp:'2026-11-26T08:00:00+08:00',value:12.5}]});await settle()
    assert.equal(h.samples.value[0].timestamp,Date.parse('2026-11-26T08:00:00+08:00'))
    const next=h.show(point('array'));f.details[1].resolve({success:true,result:[{...point('array'),features:['storageData'],metadata:{dataType:{id:'array',elementType:{id:'int'}}}}]});await next;await settle()
    f.queries.at(-1).resolve(result(Array.from({length:10},(_,i)=>i)));await settle()
    for(let i=1;i<10;i++){h.indexInput.value=i;h.addIndex()}
    assert.equal(h.indices.value.length,8);assert.equal(h.canAddIndex.value,false)
    h.removeIndex(0);assert.equal(h.indices.value.includes(0),false)
  } finally {f.close()}
})

const batch=(from,count,total)=>({success:true,result:{total,data:Array.from({length:count},(_,i)=>({id:`r${from+i}`,timestamp:10000-from-i,value:from+i}))}})

test('scrolling appends one batch at a time with a frozen range, deduplicates rows and retains them on failure',async()=>{
  const f=fixture(),h=f.history
  try {
    const opening=h.show(point('point'),undefined,true);f.details[0].resolve(full('point'));await opening;await settle()
    h.view.value='table';f.queries[0].resolve(batch(0,200,450));await settle()
    assert.equal(f.queries.length,1);assert.equal(h.samples.value.length,200);assert.equal(h.hasMore.value,true)
    const window=f.queries[0].query.terms[1].value
    h.loadMore();h.loadMore();assert.equal(f.queries.length,2,'concurrent bottom events share one request')
    assert.equal(f.queries[1].query.pageIndex,1);assert.deepEqual(f.queries[1].query.terms[1].value,window)
    f.queries[1].resolve(batch(199,200,450));await settle()
    assert.equal(h.samples.value.length,399,'overlapping backend pages never duplicate the same record')
    h.loadMore();f.queries[2].reject(new Error('storage unavailable'));await settle()
    assert.equal(h.samples.value.length,399);assert.equal(h.error.value,'storage unavailable')
    h.loadMore();assert.equal(f.queries[3].query.pageIndex,2,'retry does not skip the failed page')
    h.close();f.queries[3].resolve(batch(399,51,450));await settle()
    assert.equal(h.samples.value.length,399);assert.equal(h.loadingMore.value,false)
  } finally {f.close()}
})

test('chart time selection queries the selected backend interval and closing cancels pending gestures',async(t)=>{
  t.mock.timers.enable({apis:['setTimeout','Date']})
  const f=fixture(),h=f.history
  try {
    const opening=h.show(point('point'),undefined,true);f.details[0].resolve(full('point'));await opening;await settle()
    f.queries[0].resolve(result(10));await settle();h.expand();await settle()
    const [from,to]=f.queries[0].query.terms[1].value
    h.chartEvents.datazoom({start:10,end:20});h.chartEvents.datazoom({batch:[{start:25,end:50}]})
    t.mock.timers.tick(180);await settle()
    assert.equal(f.queries.length,2)
    assert.deepEqual(f.queries[1].query.terms[1].value,[Math.round(from+(to-from)*.25),Math.round(from+(to-from)*.5)])
    assert.equal(f.queries[1].query.pageIndex,0)
    f.queries[1].resolve(result(20));await settle()
    assert.equal(h.chartData.value.xAxis.min,from,'the full time axis remains available for panning')
    for(const zoom of h.chartOption.value.dataZoom){
      assert.deepEqual([zoom.startValue,zoom.endValue],f.queries[1].query.terms[1].value,'the queried window remains selected after data replacement')
      assert.deepEqual(zoom.rangeMode,['value','value']);assert.equal('start' in zoom,false)
    }
    h.chartEvents.datazoom({start:60,end:80});h.close();t.mock.timers.tick(180);await settle()
    assert.equal(f.queries.length,2,'a closed chart cannot issue a delayed query')
  } finally {f.close();t.mock.timers.reset()}
})

test('chart batches stop at the plotting budget while the virtual detail list can keep loading',async()=>{
  const f=fixture(),h=f.history
  try {
    const opening=h.show(point('point'));f.details[0].resolve(full('point'));await opening;await settle()
    for(let i=0;i<10;i++){assert.equal(f.queries.length,i+1);f.queries[i].resolve(batch(i*200,200,5000));await settle()}
    assert.equal(f.queries.length,10);assert.equal(h.samples.value.length,2000);assert.equal(h.chartLimited.value,true)
    h.view.value='table';await settle();h.loadMore();f.queries[10].resolve(batch(2000,200,5000));await settle()
    assert.equal(h.samples.value.length,2200);assert.equal(h.chartData.value.series[0].data.length,2000)
  } finally {f.close()}
})
