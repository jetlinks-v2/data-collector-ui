import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import test from 'node:test'
import * as vue from 'vue'
import { transformSync } from 'esbuild'
const require=createRequire(import.meta.url)
const root=resolve(import.meta.dirname,'../views/data-collect')
const lodash=await import('lodash-es')
function load(file,mocks={}){
 const {code}=transformSync(readFileSync(resolve(root,file),'utf8'),{loader:'ts',format:'cjs'})
 const module={exports:{}}
 new Function('require','module','exports','window',code)(id=>id in mocks?mocks[id]:id==='lodash-es'?lodash:require(id),module,module.exports,{addEventListener(){},removeEventListener(){}})
 return module.exports
}
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve}}
test('selection persists across pages and resets when query changes', async()=>{
 const {usePointSelection}=load('components/Point/usePointSelection.ts')
 const rows=vue.ref([{id:'a'},{id:'b'}]),query=vue.ref('one'),scope=vue.effectScope()
 const s=scope.run(()=>usePointSelection(rows,query))
 try{
  s.rowSelection.value.onSelect(rows.value[0],true);rows.value=[{id:'c'}];await vue.nextTick()
  s.rowSelection.value.onSelect(rows.value[0],true);assert.deepEqual(s.selectedKeys.value,['a','c'])
  s.toggleAll();assert.equal(s.all.value,true);assert.deepEqual(s.selectedKeys.value,['c'])
  query.value='two';await vue.nextTick();assert.equal(s.all.value,false);assert.deepEqual(s.selectedKeys.value,[])
 }finally{scope.stop()}
})
test('query builder shares channel, status, search, and stable sort across list and batch scope',async()=>{
 const {buildPointListQuery}=load('components/Point/pointQuery.ts',{
  '@jetlinks-web-core/components/ConditionFilter':{buildQueryFilter:terms=>({terms})},
  './columns':{pointSearchFields:[]},
  '../../utils':{buildAllChannelTerm:async()=>({column:'channelId',value:['c1'],termType:'in'}),buildPointQueryFilterTerms:()=>[{column:'provider',value:'modbus'}]},
 })
 const state={scopeType:'all',scopeId:'',pointType:'stopped',terms:[{column:'name',value:'pump'}],filters:{},sort:'interval',order:'asc'}
 const query=await buildPointListQuery(state)
 assert.equal(query.terms.length,4);assert.deepEqual(query.terms.at(-1),{column:'runningState',value:'running',termType:'not',type:'and'})
 assert.deepEqual(query.sorts,[{name:'interval',order:'asc'},{name:'id',order:'asc'}])
 assert.equal((await buildPointListQuery(state,false)).terms.length,3)
 state.scopeType='collector';state.scopeId='k1';assert.ok((await buildPointListQuery(state)).terms.some(t=>t.column==='collectorId'&&t.value==='k1'))
})
test('current-page subscription releases old rows and ignores late events',async()=>{
 const callbacks=[],stopped=[]
 const {usePointValues}=load('components/Point/usePointValues.ts',{
  vue:{...vue,onActivated(){},onDeactivated(){}},
  '../../../../api/data-collect/workspace':{observePointValues:rows=>({subscribe:callback=>{const ids=rows.map(row=>row.id).join(',');callbacks.push(callback);return {unsubscribe:()=>stopped.push(ids)}}})},
 })
 const scope=vue.effectScope(),rows=vue.ref([{id:'a',channelId:'c',collectorId:'k'}])
 const values=scope.run(()=>usePointValues(rows))
 callbacks[0].next([{pointId:'a',parsedData:'18446744073709551615'}])
 assert.equal(values.value.get('a').parsedData,'18446744073709551615')
 rows.value=[{...rows.value[0],name:'updated'}];await vue.nextTick();assert.deepEqual(stopped,[])
 rows.value=[{id:'b'}];await vue.nextTick();assert.deepEqual(stopped,['a'])
 callbacks[0].next([{pointId:'a',parsedData:2}]);assert.equal(values.value.has('a'),false)
 callbacks[1].next([{pointId:'b',parsedData:0}]);assert.equal(values.value.get('b').parsedData,0)
 scope.stop();assert.deepEqual(stopped,['a','b']);assert.equal(values.value.size,0)
})
test('detail return paths are restricted to the same list and keep its query',()=>{
 const {pointReturnLocation}=load('components/Point/Detail/pointDetailNavigation.ts')
 const router={resolve:url=>({path:url.split('?')[0],fullPath:url})}
 const list={path:'/project/p/collectors',fullPath:'/project/p/collectors'}
 assert.equal(pointReturnLocation(router,list,'/project/p/collectors?page=3&q=x'),'/project/p/collectors?page=3&q=x')
 for(const value of ['https://other.test','//other.test','/project/q/collectors','/other'])assert.equal(pointReturnLocation(router,list,value),list.fullPath)
})
test('draft validation and failed saves retain input; successful flush clears dirty state',async()=>{
 const info=vue.ref({id:'p',name:'old',accessModes:[{value:'read',text:'Read'}]}),errors=vue.ref([])
 let fail=true;const calls=[]
 const key=Symbol()
 const {usePointDetailForm}=load('components/Point/Detail/usePointDetailForm.ts',{
  vue:{...vue,provide(){},inject:(id,fallback)=>id==='point-info'?info:id==='point-info-error-list'?errors:id===key?{save:async patch=>{calls.push(patch);return !fail}}:fallback},
  '../../../data':{DATA_COLLECTOR_CONFIG_TYPE:'config',PLUGIN_DETAIL_SAVE_EVENTS:'save'},
  './detailContext':{POINT_PERSISTENCE:key},
 })
 const scope=vue.effectScope(),form=scope.run(()=>usePointDetailForm({syncInterval:true}))
 try{
  form.formRef.value={validate:async()=>({})};form.formData.name='new';form.formData.interval=500
  assert.equal(form.isDirty(),true);assert.equal(await form.flush(),false);assert.equal(form.formData.name,'new')
  info.value={id:'p',name:'server old'};await vue.nextTick();assert.equal(form.formData.name,'new')
  fail=false;assert.equal(await form.flush(),true);assert.equal(form.isDirty(),false)
  assert.deepEqual(calls[0].accessModes,['read']);assert.deepEqual(calls[0].features,[]);assert.equal(calls[0].configuration.interval,500)
  form.formData.name='';form.formRef.value={validate:async()=>{throw {errorFields:['name']}}}
  assert.equal(await form.flush(),false);assert.deepEqual(errors.value,['name']);assert.equal(form.isDirty(),true)
 }finally{scope.stop()}
})
test('detail loads by route ID, serializes saves, protects leaving, and discards late loads',async()=>{
 const route=vue.reactive({params:{id:'p1'},query:{returnTo:'/collectors?page=2'}})
 const first=deferred(),puts=[],pushes=[],guards=[],injections=new Map()
 let calls=0,fail=false,failures=0,discard=false
 const pointApi={
  pointDetail:async id=>{calls++;return calls===1?first.promise:{success:true,result:{id,name:'Point '+id}}},
  updatePoint:async(id,body)=>{puts.push([id,body]);return {success:!fail && failures-- <= 0}},
  removePoint:async()=>({success:true}),detail:async()=>({success:true,result:{id:'collector'}}),
 }
 const {usePointDetail}=load('components/Point/Detail/usePointDetail.ts',{
  vue:{...vue,provide:(key,value)=>injections.set(key,value),onBeforeUnmount:vue.onScopeDispose},
  'vue-router':{useRoute:()=>route,useRouter:()=>({resolve:x=>typeof x==='string'?{path:x.split('?')[0],fullPath:x}:{path:'/collectors',fullPath:'/collectors'},push:x=>pushes.push(x)}),onBeforeRouteLeave:g=>guards.push(g),onBeforeRouteUpdate(){}},
  'ant-design-vue':{Modal:{confirm:options=>discard?options.onOk():options.onCancel()}},
  'vue-i18n':{useI18n:()=>({t:key=>key})},
  '@jetlinks-web-core/store':{useMenuStore:()=>({getMenu:()=>({routeName:'data-collect'})})},
  '@jetlinks-web/utils':{onlyMessage(){}},
  '@data-collector-ui/api/data-collect/collector':pointApi,
  '../../../data':{DATA_COLLECTOR_SAVE_TYPE:'saveType'},
  './detailContext':{POINT_PERSISTENCE:'persistence'},
  './pointDetailNavigation':load('components/Point/Detail/pointDetailNavigation.ts'),
 })
 const scope=vue.effectScope(),state=scope.run(()=>usePointDetail())
 try{
  route.params.id='p2';await vue.nextTick();await Promise.resolve()
  first.resolve({success:true,result:{id:'p1'}});await Promise.resolve();await Promise.resolve()
  assert.equal(state.info.value.id,'p2')
  const persistence=injections.get('persistence')
  await Promise.all([persistence.save({name:'one'}),persistence.save({description:'two'})])
  assert.equal(puts.length,2);assert.equal(puts[0][0],'p2');assert.equal(puts[1][1].description,'two')
  failures=1
  await Promise.all([persistence.save({name:'retained'}),persistence.save({description:'queued'})])
  assert.equal(puts.at(-1)[1].name,'retained');assert.equal(puts.at(-1)[1].description,'queued')
  assert.equal(state.saveFailed.value,false)
  fail=true;await persistence.save({name:'unsaved'});assert.equal(state.saveFailed.value,true);assert.equal(await guards[0](),false)
  fail=false;await state.retry();assert.equal(state.saveFailed.value,false)
  let dirty=true
  state.editor.value={isDirty:()=>dirty,flush:async()=>false,discard:()=>{dirty=false}}
  assert.equal(await guards[0](),false);assert.equal(dirty,true)
  discard=true;assert.equal(await guards[0](),true);assert.equal(dirty,false)
  assert.equal(state.summaryRevision.value,1)
  const modalSave=deferred();let modalDirty=true
  state.editOpen.value=true;state.modalEditor.value={isDirty:()=>modalDirty,flush:async()=>{await modalSave.promise;modalDirty=false;return true}}
  let left=false;const leaving=guards[0]().then(value=>{left=value})
  await Promise.resolve();assert.equal(left,false);modalSave.resolve();await leaving;assert.equal(left,true)
  state.editOpen.value=false
  await state.backToList();assert.equal(pushes.at(-1),'/collectors?page=2')
 }finally{scope.stop()}
})

test('search initialization and restored conditions preserve pagination; committed changes reset it',async()=>{
 const {usePointSearch}=load('components/Point/usePointSearch.ts',{
  '@jetlinks-web-core/components/ConditionFilter':{buildQueryFilter:terms=>({terms:terms.filter(t=>t.value)})},
  './columns':{pointSearchFields:[]},
 })
 const scope=vue.effectScope(),state=vue.reactive({terms:[],page:3})
 const search=scope.run(()=>usePointSearch(state))
 try{
  search.searchTerms.value=[];search.search();assert.equal(state.page,3)
  search.searchTerms.value=[{column:'name',value:''}];search.search();assert.equal(state.page,3)
  search.searchTerms.value=[{column:'name',value:'pump'}];search.search();assert.equal(state.page,1)
  state.page=2;state.terms=[{column:'name',value:'motor'}];await vue.nextTick()
  assert.equal(search.searchTerms.value[0].value,'motor');search.search();assert.equal(state.page,2)
 }finally{scope.stop()}
})
test('related-device drafts survive parent refresh, validation failure, and failed saves',async()=>{
 const info=vue.ref({id:'p',name:'point'});let stored=[],fail=true,sequence=0
 const {usePointRelatedDevices}=load('components/Point/Detail/RelatedDevice/usePointRelatedDevices.ts',{
  vue:{...vue,onMounted:fn=>fn(),inject:(key,fallback)=>key==='point-info'?info:fallback},
  'vue-i18n':{useI18n:()=>({t:key=>key})},
  '@jetlinks-web/utils':{onlyMessage(){},randomString:()=>String(++sequence)},
  '@data-collector-ui/api/data-collect/collector':{
   queryPointRelatedDevices:async()=>({success:true,result:stored}),
   queryDeviceList:async()=>({success:true,result:[]}),
   queryDeviceDetail:async()=>({success:true,result:{metadata:{properties:[{id:'temperature'}]}}}),
   queryDevicePoints:async()=>({success:true,result:[]}),
   savePointRelatedDevices:async(_id,_auto,rows)=>{if(fail)return {success:false};stored=rows.map(row=>({id:'mapping',thingId:row.deviceId,name:'Device',metadataId:row.metadataId}));return {success:true}},
   deletePointRelatedDevices:async()=>({success:true}),downloadPointRelatedDevicesTemplate(){},importPointRelatedDevices(){},
  },
 })
 const scope=vue.effectScope(),editor=scope.run(()=>usePointRelatedDevices())
 try{
  await editor.initDataSource();assert.equal(editor.isDirty(),false)
  editor.addItem();assert.equal(editor.isDirty(),true);assert.equal(await editor.flush(),false)
  Object.assign(editor._dataSource.value[0],{id:'device',name:'Device',metadataId:'temperature'})
  info.value={...info.value,name:'updated'};await vue.nextTick();assert.equal(editor._dataSource.value.length,1)
  assert.equal(await editor.flush(),false);assert.equal(editor.isDirty(),true)
  fail=false;assert.equal(await editor.flush(),true);assert.equal(editor.isDirty(),false)
 }finally{scope.stop()}
})

const routeCodec = {
 decodeConditionFilterQuery: value => value ? JSON.parse(value) : [],
 encodeConditionFilterQuery: terms => terms.length ? JSON.stringify(terms) : '',
}
const routeMocks = {
 '@jetlinks-web-core/components/ConditionFilter': routeCodec,
 '../components/Point/columns': {pointSearchFields: []},
}
test('old sidebar filters are ignored while visible list conditions survive URL round trips', () => {
 const {readCollectRoute, collectRouteQuery} = load('hook/useCollectRouteState.ts', routeMocks)
 const query = {
  view:'list',provider:'modbus',runningState:'failed',state:'disabled',collectorState:'stopped',
  scopeType:'collector',scopeId:'collector-1',treeSearch:'pump',
  q:JSON.stringify([{column:'name',value:'motor'}]),pointState:'running',
  page:'3',pageSize:'20',sort:'interval',order:'asc','error-channel':'1',
 }
 const state = readCollectRoute(query)
 assert.deepEqual(state.filters,{channel:true,collector:false,point:false})
 assert.equal('viewType' in state,false)
 const output = collectRouteQuery(state)
 for (const key of ['view','provider','runningState','state','collectorState']) assert.equal(output[key],undefined)
 for (const key of ['scopeType','scopeId','treeSearch','q','pointState','page','pageSize','sort','order','error-channel']) assert.equal(output[key],query[key])
 assert.deepEqual(readCollectRoute(output),state)
})
test('list mount normalizes legacy URLs and browser navigation restores supported conditions', async () => {
 const {createMemoryHistory,createRouter} = await import('vue-router')
 const router = createRouter({history:createMemoryHistory(),routes:[{path:'/collectors',component:{}}]})
 await router.push('/collectors?view=list&provider=modbus&state=disabled&page=3&treeSearch=pump&keep=external')
 const route = vue.reactive(Object.fromEntries(['path','fullPath','query'].map(key=>[key,vue.computed(()=>router.currentRoute.value[key])])))
 const {useCollectRouteState} = load('hook/useCollectRouteState.ts',{
  ...routeMocks,vue:{...vue,onBeforeUnmount:vue.onScopeDispose},
  'vue-router':{useRoute:()=>route,useRouter:()=>router},
 })
 const scope = vue.effectScope()
 const normalized = new Promise(resolve=>{const stop=router.afterEach(()=>{stop();resolve()})})
 const state = scope.run(()=>useCollectRouteState())
 try {
  await normalized;await vue.nextTick()
  assert.deepEqual({...router.currentRoute.value.query},{page:'3',treeSearch:'pump',keep:'external'})
  assert.equal(state.page,3)
  await router.push('/collectors?scopeType=collector&scopeId=k2&page=2&pointState=stopped&error-point=1')
  await vue.nextTick()
  assert.equal(state.scopeId,'k2');assert.equal(state.page,2);assert.equal(state.pointType,'stopped')
  assert.deepEqual({...state.filters},{channel:false,collector:false,point:true})
  const written = new Promise(resolve=>{const stop=router.afterEach(()=>{stop();resolve()})})
  state.page=4
  await written;await vue.nextTick()
  assert.equal(router.currentRoute.value.query.page,'4')
  assert.equal(router.currentRoute.value.query.scopeId,'k2')
 } finally {scope.stop()}
})
test('anomaly statistics toggle exclusively and reset pagination', () => {
 const state=vue.reactive({page:3,filters:{channel:false,collector:false,point:false}})
 const {useCollectHeader}=load('components/useCollectHeader.ts',{
  vue:{...vue,inject:(_key,fallback)=>fallback},
  'vue-i18n':{useI18n:()=>({t:key=>key})},
  '../hook/context':{useCollectContext:()=>({state})},
  '@data-collector-ui/views/data-collect/data':{ChannelState:{},COLLECTOR_DATA:'data',COLLECTOR_TYPE:'type',REFRESH_HANDLER:'refresh',getState(){}},
  '@data-collector-ui/views/data-collect/utils':{getCountList:async()=>[]},
 })
 const scope=vue.effectScope(),header=scope.run(()=>useCollectHeader())
 try {
  header.onClick({type:'collector'});assert.equal(state.page,1);assert.equal(state.filters.collector,true)
  header.onClick({type:'point'});assert.deepEqual({...state.filters},{channel:false,collector:false,point:true})
  header.onClick({type:'point'});assert.deepEqual({...state.filters},{channel:false,collector:false,point:false})
 } finally {scope.stop()}
})
