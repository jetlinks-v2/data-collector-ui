import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { isDeepStrictEqual } from 'node:util'
import { transformSync } from 'esbuild'
import * as vue from 'vue'
import { compileScript, parse } from 'vue/compiler-sfc'
import { get, set } from 'lodash-es'
const require=createRequire(import.meta.url)
const base=new URL('../',import.meta.url)
const clone=value=>Array.isArray(value)?value.map(clone):value && typeof value==='object'?Object.fromEntries(Object.entries(value).map(([key,item])=>[key,clone(item)])):value
const v={...vue,onBeforeUnmount(){},onMounted(){}}
function environment() {
  const current=new Map(),calls=[],deletions=[],retained=[],metadataCalls=[]
  let failAt=0,saveCount=0
  const codecCatalog={codecs:vue.ref([{id:'int16',name:'16位整数'},{id:'ieee754_float32',name:'32位浮点'}])}
  const api={
    async queryPointMetadata(provider,input){metadataCalls.push({provider,input:clone(input)});return {success:true,result:{autoCodec:false,supportCodecs:codecCatalog.codecs.value,accessModes:['read','write','subscribe'].map(value=>({value}))}}},
    async queryPointNoPaging(query){ const ids=query.terms.find(term=>term.column==='id').value;return {success:true,result:ids.flatMap(id=>current.has(id)?[clone(current.get(id))]:[])} },
    async savePointBatch(payload){calls.push(clone(payload));saveCount++;if(saveCount===failAt)return {success:false,message:'network failed'};for(const point of payload)current.set(point.id,clone(point));return {success:true,result:{total:payload.length,added:0,updated:payload.length}}},
    async batchDeletePoint(ids){deletions.push([...ids]);for(const id of ids)current.delete(id);return {success:true,result:ids.length}},
  }
  const cache=new Map()
  function load(path) {
    if(cache.has(path))return cache.get(path)
    const module={exports:{}},code=transformSync(readFileSync(new URL(path,base),'utf8'),{loader:'ts',format:'cjs'}).code
    const resolve=id=>{
      if(id==='vue')return v
      if(id==='vue-i18n')return {useI18n:()=>({t:key=>key,te:()=>true})}
      if(id==='lodash-es')return {cloneDeep:clone,isEqual:isDeepStrictEqual,get,set}
      if(id.includes('/api/data-collect/collector'))return api
      if(id.includes('types/workspace'))return {accessValues:p=>(p.accessModes||[]).map(value=>typeof value==='string'?value:value.value),stateValue:value=>typeof value==='string'?value:value?.value||''}
      if(id==='./usePointCodecs')return {usePointCodecs:()=>codecCatalog}
      if(id==='./usePointBatchDecoding')return load('views/data-collect/hook/usePointBatchDecoding.ts')
      if(id==='./useBatchDraftStorage')return {useBatchDraftStorage:()=>({restore:()=>clone(retained),flush(){},failed:vue.ref(false),available:vue.ref(true)})}
      if(id.endsWith('/Config/data'))return load('views/data-collect/components/Config/data.ts')
      const name=id.split('/').at(-1)
      if(['pointBatchDraft','pointBatchClipboard','pointBatchFilter','pointBatchColumns','pointBatchCell','pointBatchImport','configOptions'].includes(name))return load('utils/'+name+'.ts')
      return require(id)
    }
    new Function('require','module','exports',code)(resolve,module,module.exports)
    cache.set(path,module.exports);return module.exports
  }
  const adapter={
    getAddress:point=>point.configuration.address||'',
    setAddress(point,address){if(!/^4\d{4}$/.test(address))throw new Error('invalidAddress');point.configuration.address=address},
    setCodec(point,codec){if(!['int16','ieee754_float32'].includes(codec))throw new Error('invalidCodec');point.managedConfiguration.codec=codec;point.configuration.quantity=codec==='int16'?1:2},
    generate({start,count,codec='int16'},template){return Array.from({length:count},(_,index)=>({...clone(template),id:undefined,name:`Point${index}`,pointKey:`key${index}`,configuration:{address:String(Number(start)+index*(codec==='int16'?1:2)),quantity:codec==='int16'?1:2},managedConfiguration:{codec}}))},
    validate(point){if(!point.configuration.address)throw new Error('addressRequired')},
    isAutoCodec(){return false},
  }
  const collector=vue.ref({id:'c',name:'Collector',provider:'test',configuration:{}}),directory=vue.ref([])
  const state=load('views/data-collect/hook/usePointBatchEditor.ts').usePointBatchEditor(collector,directory,vue.ref(adapter),async()=>{})
  return {state,current,calls,deletions,retained,metadataCalls,api,load,failAt:value=>{failAt=value},collector,directory}
}
const point=(id='existing')=>({id,name:'Old name',pointKey:`key_${id}`,provider:'test',collectorId:'c',interval:1000,accessModes:[{value:'read',text:'读'}],configuration:{address:'40001',quantity:1,custom:'keep'},managedConfiguration:{codec:'int16',conversion:{formula:'value*10'}}})
test('batch entry defaults to every directory point, while an explicit filtered or selected scope stays bounded',async()=>{
  const {state,current,directory}=environment()
  directory.value=Array.from({length:105},(_,index)=>point(`p${index}`))
  for(const value of directory.value)current.set(value.id,value)
  await state.start();assert.equal(state.rows.value.length,105)
  state.close();await state.start(['p2','p7']);assert.deepEqual(state.rows.value.map(row=>row.key),['p2','p7'])
  state.close();await state.start([]);assert.equal(state.rows.value.length,0)
})
test('search and review filters keep hidden changes in the save scope',async()=>{
  const {state,current,calls}=environment()
  for(const id of ['a','b','c'])current.set(id,point(id))
  await state.start(['a','b','c'],'Selected · 3')
  assert.equal(state.scopeLabel.value,'Selected · 3')
  state.change(state.rows.value[0],'name','Pump temperature')
  state.change(state.rows.value[1],'interval','invalid')
  state.updateFilters({review:'changed'});assert.equal(state.visibleRows.value.length,2)
  state.updateFilters({review:'issues'});assert.deepEqual(state.visibleRows.value.map(row=>row.key),['b'])
  state.change(state.rows.value[1],'interval','200');assert.equal(state.visibleRows.value.length,0)
  state.updateFilters({review:'all',search:'pump'});assert.deepEqual(state.visibleRows.value.map(row=>row.key),['a'])
  await state.confirmSave();assert.equal(calls[0].length,2);assert.equal(current.get('b').interval,200)
  assert.equal(state.filters.value.search,'pump');assert.match(state.notice.value,/saved/)
})
test('visible column order governs headerless paste and keyboard; headers can still update hidden columns',async()=>{
  const oldWindow=globalThis.window;globalThis.window={addEventListener(){},removeEventListener(){}}
  try {
    const {state,current,load}=environment();current.set('a',point('a'));await state.start(['a'])
    for(const field of ['codec','byteLayout','accessModes'])state.toggleColumn(field)
    assert.deepEqual(state.parseClipboard('40009\t250','address').fields,['address','interval'])
    state.paste('40009\t250',0,'address')
    const row=state.rows.value[0];assert.equal(row.point.interval,250);assert.equal(row.point.managedConfiguration.codec,'int16');assert.deepEqual(row.point.accessModes,['read'])
    assert.deepEqual(state.parseClipboard('codec\tinterval\nint16\t400').fields,['codec','interval'])
    assert.ok(state.parseClipboard('int16\tAB','codec',true).fields.includes('byteLayout'))
    const grid=load('views/data-collect/hook/usePointBatchGrid.ts').usePointBatchGrid(state)
    await grid.activate(row,'address');grid.keyboard({key:'Tab',preventDefault(){},stopPropagation(){}});assert.equal(grid.active.value.field,'interval')
    grid.commit();state.toggleColumn('interval');state.change(row,'interval','bad');state.updateFilters({search:'no match'})
    await grid.firstError();assert.equal(state.filters.value.search,'');assert.equal(state.hiddenColumns.value.includes('interval'),false);assert.equal(grid.active.value.field,'interval')
  } finally {globalThis.window=oldWindow}
})
test('range preview and insertion share template settings and zero-padded numbering without copying identity',async()=>{
  const {state,current,calls}=environment()
  current.set('a',{...point('a'),interval:250,description:'Plant 1',inheritBreaker:false,circuitBreaker:{threshold:3},managedConfiguration:{codec:'ieee754_float32'},runtime:{available:true}})
  await state.start(['a'])
  const generate=state.adapter.value.generate
  state.adapter.value.generate=(options,template)=>generate(options,template).map(value=>({...value,configuration:{...template.configuration,...value.configuration}}))
  const options={start:'40010',count:4,templateKey:'a',namePrefix:'Temperature ',keyPrefix:'temp_',numberStart:'009'}
  const preview=state.rangeRows(options,true);assert.equal(preview.length,3);assert.equal(state.rows.value.length,1)
  const row=state.generate(options);assert.equal(state.rows.value.length,5);assert.equal(calls.length,0)
  assert.deepEqual(state.rows.value.slice(1).map(row=>row.point.pointKey),['temp_009','temp_010','temp_011','temp_012'])
  assert.equal(row.point.name,preview[0].point.name);assert.equal(row.address,preview[0].address)
  assert.equal(row.point.interval,250);assert.equal(row.point.configuration.custom,'keep');assert.equal(row.point.description,'Plant 1');assert.deepEqual(row.point.circuitBreaker,{threshold:3})
  assert.equal(row.point.managedConfiguration.codec,'ieee754_float32');assert.equal(row.point.configuration.quantity,2)
  assert.equal(row.point.runtime,undefined);assert.notEqual(row.point.id,'a');assert.equal(row.point.collectorId,'c');assert.equal(row.baseline,undefined)
  row.point.circuitBreaker.threshold=8;assert.equal(state.rows.value[0].point.circuitBreaker.threshold,3)
  const before=state.rows.value.length;assert.equal(state.generate({...options,numberStart:'1.5'}),undefined);assert.equal(state.rows.value.length,before)
  assert.match(state.error.value,/invalidNumbering/)
})
test('twelve thousand draft rows keep a bounded viewport and searchable plugin addresses',async()=>{
  const oldWindow=globalThis.window;globalThis.window={addEventListener(){},removeEventListener(){}}
  try {
    const {state,current,load}=environment()
    for(let index=0;index<12000;index++)current.set(String(index),{...point(String(index)),name:`Temperature ${index}`,configuration:{address:String(40001+index),quantity:1}})
    await state.start([...current.keys()]);const grid=load('views/data-collect/hook/usePointBatchGrid.ts').usePointBatchGrid(state)
    assert.ok(grid.window.value.length<30)
    state.updateFilters({search:'Temperature 11999'});assert.deepEqual(state.visibleRows.value.map(row=>row.key),['11999'])
    state.updateFilters({search:'52000'});assert.deepEqual(state.visibleRows.value.map(row=>row.key),['11999'])
    grid.viewport.value={scrollTop:1000000,clientHeight:420};grid.scroll();state.clearFilters();await vue.nextTick();assert.ok(grid.window.value.length<30);assert.ok(grid.window.value.length>0)
  } finally {globalThis.window=oldWindow}
})
test('row removal is local, reversible for saved points, and skips validation of deleted drafts',async()=>{
  const {state,current,calls,deletions}=environment();current.set('existing',point());await state.start(['existing'])
  const row=state.rows.value[0],added=state.add()
  state.remove([added.key]);assert.equal(state.rows.value.length,1);assert.equal(state.dirty.value,false)
  state.change(row,'name','');state.remove([row.key]);assert.equal(row.deleted,true)
  assert.equal(state.counts.value.deleted,1);assert.equal(state.counts.value.modified,0);assert.deepEqual(state.issues.value.get(row.key),[])
  assert.equal(calls.length,0);assert.equal(deletions.length,0);assert.equal(current.size,1)
  state.undoRemove(row);assert.equal(row.deleted,false);assert.equal(row.point.name,'');assert.equal(state.counts.value.errors,1)
  state.remove([row.key]);await state.confirmSave()
  assert.deepEqual(deletions,[['existing']]);assert.equal(state.rows.value.length,0);assert.equal(state.dirty.value,false)
})
test('deletion survives local draft recovery, ignores derived address text and respects hidden-row selection',async()=>{
  const {state,current,directory,retained,deletions}=environment()
  for(const id of ['a','b'])current.set(id,point(id))
  directory.value=[{...point('a'),address:'Human-readable address'},point('b')]
  await state.start(['a','b']);state.updateFilters({identity:'key_a'});state.remove(['a','b'])
  assert.equal(state.rows.value.find(row=>row.key==='b').deleted,undefined)
  retained.push(clone(state.rows.value.find(row=>row.key==='a')));state.close();await state.start(['b'])
  assert.equal(state.rows.value.find(row=>row.key==='a').deleted,true)
  await state.confirmSave();assert.deepEqual(deletions,[['a']]);assert.equal(current.has('b'),true)
})
test('a concurrent edit prevents deletion; restoring the row cancels its deletion mark',async()=>{
  const {state,current,deletions}=environment();current.set('existing',point());await state.start(['existing'])
  state.remove(['existing']);current.set('existing',{...point(),name:'Remote change'})
  await state.confirmSave();assert.equal(deletions.length,0);assert.match(state.rows.value[0].saveError,/remoteConflict/)
  state.toggle('existing');await state.restoreSelected();assert.equal(state.rows.value[0].deleted,undefined)
  assert.equal(state.rows.value[0].point.name,'Remote change');assert.equal(state.dirty.value,false)
})
test('an interrupted deletion retries idempotently without recreating the point',async()=>{
  const {state,current,calls,deletions,api}=environment();current.set('existing',point());await state.start(['existing'])
  state.remove(['existing'])
  api.batchDeletePoint=async ids=>{deletions.push(ids);current.delete(ids[0]);throw new Error('connection lost')}
  await state.confirmSave();assert.equal(state.rows.value[0].deleted,true);assert.match(state.error.value,/connection lost/)
  await state.confirmSave();assert.equal(deletions.length,1);assert.equal(calls.length,0);assert.equal(state.rows.value.length,0)
})
test('partially completed deletion retains only failed rows and retries the remaining identities',async()=>{
  const {state,current,deletions,api}=environment();for(const id of ['a','b'])current.set(id,point(id));await state.start(['a','b'])
  state.remove(['a','b']);api.batchDeletePoint=async ids=>{deletions.push(ids);current.delete(ids[0]);return {success:true,result:1}}
  await state.confirmSave();assert.deepEqual(state.rows.value.map(row=>row.key),['b']);assert.match(state.rows.value[0].saveError,/saveIncomplete/)
  await state.confirmSave();assert.deepEqual(deletions,[['a','b'],['b']]);assert.equal(state.rows.value.length,0)
})
test('deleted keys may be reused by a new row and removal completes before the replacement save',async()=>{
  const {state,current,directory,calls,deletions,failAt}=environment();current.set('existing',point());directory.value=[point()];await state.start(['existing'])
  state.remove(['existing']);const row=state.add();row.point.name='Replacement';row.point.pointKey=point().pointKey
  state.change(row,'address','40002');assert.equal(state.counts.value.errors,0)
  failAt(1);await state.confirmSave();assert.deepEqual(deletions,[['existing']]);assert.equal(directory.value.length,0)
  failAt(0);await state.confirmSave();assert.equal(calls.length,2);assert.equal(state.dirty.value,false)
  assert.equal(current.has('existing'),false);assert.equal(current.get(row.key).pointKey,point().pointKey)
})
test('Excel headers in a different order produce only a local draft until confirm',async()=>{
  const {state,calls}=environment();await state.start()
  state.paste('数据类型\t地址\t名称\t标识\t周期\t采集方式\nFloat32\t40001\t温度\t0012\t100 ms\t读取\n')
  assert.equal(calls.length,0);assert.equal(state.rows.value.length,1)
  const row=state.rows.value[0]
  assert.equal(row.point.pointKey,'0012');assert.equal(row.point.configuration.quantity,2);assert.equal(row.point.managedConfiguration.codec,'ieee754_float32')
  assert.deepEqual(state.issues.value.get(row.key),[])
  await state.confirmSave();assert.equal(calls.length,1);assert.equal(calls[0][0].id,row.key);assert.equal(state.dirty.value,false)
})
test('editing only period merges unrelated remote changes and selected access fills use the chosen values',async()=>{
  const {state,current,calls,load}=environment();current.set('existing',point());await state.start(['existing'])
  const row=state.rows.value[0];state.change(row,'interval','100')
  current.set('existing',{...point(),name:'Changed elsewhere'})
  await state.confirmSave();assert.equal(calls[0][0].name,'Changed elsewhere');assert.deepEqual(calls[0][0].accessModes,['read']);assert.deepEqual(calls[0][0].managedConfiguration.conversion,{formula:'value*10'})
  state.toggle(row.key)
  const controls=load('views/data-collect/hook/usePointBatchControls.ts').usePointBatchControls(state)
  controls.fillField.value='accessModes';controls.modes.value=['read','write']
  assert.equal(controls.fillValue.value,'read,write');await controls.fill()
  assert.deepEqual(row.point.accessModes,['read','write']);assert.equal(calls.length,1)
})
test('same-field remote conflicts and duplicate keys prevent persistence, leaving drafts editable',async()=>{
  const {state,current,calls}=environment();current.set('existing',point());await state.start(['existing'])
  state.change(state.rows.value[0],'interval','100');current.set('existing',{...point(),interval:2000})
  await state.confirmSave();assert.equal(calls.length,0);assert.match(state.rows.value[0].saveError,/remoteConflict/);assert.equal(state.dirty.value,true)
  await state.restoreSelected();state.close()
})
test('100-row chunks retain stable ids and retry only the unconfirmed chunk',async()=>{
  const {state,calls,failAt}=environment();await state.start()
  for(let index=0;index<101;index++) {const row=state.add();row.point.name=`Point ${index}`;row.point.pointKey=`unique_${index}`;state.change(row,'address',String(40001+index));state.change(row,'codec','int16')}
  failAt(2);await state.confirmSave()
  assert.equal(calls.length,2);assert.equal(calls[0].length,100);assert.equal(calls[1].length,1)
  assert.equal(state.rows.value.filter(row=>row.baseline).length,100);assert.equal(state.dirty.value,true)
  const retryId=calls[1][0].id
  failAt(0);await state.confirmSave();assert.equal(calls.length,3);assert.equal(calls[2][0].id,retryId);assert.equal(calls[2].length,1);assert.equal(state.dirty.value,false)
})
test('a 1200-row local draft mounts a bounded row window and retains the last active input on page exit',async()=>{
  const oldWindow=globalThis.window,events=new Map()
  globalThis.window={addEventListener:(event,callback)=>events.set(event,callback),removeEventListener(){}}
  try {
    const {state,load}=environment();await state.start()
    for(let index=0;index<1200;index++){const row=state.add();row.point.name=`Point ${index}`}
    const grid=load('views/data-collect/hook/usePointBatchGrid.ts').usePointBatchGrid(state)
    grid.viewport.value={scrollTop:0,clientHeight:420,querySelector:()=>({focus(){}}),querySelectorAll:()=>[]}
    assert.ok(grid.window.value.length<=22)
    grid.viewport.value.scrollTop=18000;grid.scroll();assert.ok(grid.start.value>400);assert.ok(grid.window.value.length<=22)
    await grid.activate(state.rows.value[500],'name');grid.input.value='最后输入'
    events.get('beforeunload')();assert.equal(state.rows.value[500].point.name,'最后输入')
    state.remove(state.rows.value.slice(1).map(row=>row.key));await vue.nextTick()
    assert.equal(grid.start.value,0);assert.equal(grid.window.value.length,1);assert.equal(grid.viewport.value.scrollTop,0)
  } finally {globalThis.window=oldWindow}
})
test('paste toolbar reads clipboard directly and file import joins the same draft without saving',async()=>{
  const descriptor=Object.getOwnPropertyDescriptor(globalThis,'navigator')
  try {
    const {state,load,calls}=environment();await state.start()
    const controls=load('views/data-collect/hook/usePointBatchControls.ts').usePointBatchControls(state)
    Object.defineProperty(globalThis,'navigator',{configurable:true,value:{clipboard:{readText:async()=> '名称\t标识\t地址\t类型\n粘贴温度\t0012\t40001\tFloat32'}}})
    await controls.paste();assert.equal(state.rows.value.length,1);assert.equal(state.rows.value[0].point.pointKey,'0012');assert.equal(calls.length,0);assert.equal('pasteOpen' in controls,false)
    globalThis.navigator.clipboard.readText=async()=>{throw new Error('permission')}
    await controls.paste();assert.match(state.error.value,/clipboardPermission/);assert.equal(state.rows.value.length,1)
    const accepted=await controls.importFile({name:'points.csv',text:async()=> '类型,地址,名称,标识,周期,采集方式\nInt16,40303,文件压力,0043,2000,读取'})
    assert.equal(accepted,false);assert.equal(state.rows.value.length,1);assert.equal(calls.length,0)
    controls.importDraft();assert.equal(state.rows.value.length,2);assert.equal(state.rows.value[1].point.pointKey,'0043');assert.equal(calls.length,0)
  } finally {if(descriptor)Object.defineProperty(globalThis,'navigator',descriptor);else delete globalThis.navigator}
})
test('toolbar focus preserves the address paste anchor, while a new checkbox selection changes the target',async()=>{
  const oldWindow=globalThis.window
  globalThis.window={addEventListener(){},removeEventListener(){}}
  try {
    const {state,load,current}=environment();current.set('a',point('a'));current.set('b',{...point('b'),configuration:{address:'40003',quantity:1}});await state.start(['a','b'])
    const grid=load('views/data-collect/hook/usePointBatchGrid.ts').usePointBatchGrid(state)
    state.toggle(state.rows.value[0].key);await vue.nextTick()
    await grid.activate(state.rows.value[0],'address');grid.commit()
    grid.pasteText('40020\tInt16')
    assert.equal(state.rows.value[0].address,'40020');assert.equal(state.rows.value[0].point.name,'Old name');assert.equal(state.rows.value[0].point.pointKey,'key_a')
    state.selected.value=[state.rows.value[1].key];await vue.nextTick()
    grid.pasteText('address')
    assert.equal(state.rows.value[1].point.name,'address');assert.equal(state.rows.value[1].point.pointKey,'key_b')
    await grid.activate(state.rows.value[0],'name');grid.commit()
    grid.pasteText('名称\t周期\n覆盖当前行\t250')
    assert.equal(state.rows.value.length,2);assert.equal(state.rows.value[0].point.name,'覆盖当前行');assert.equal(state.rows.value[0].point.interval,250)
  } finally {globalThis.window=oldWindow}
})
test('local filters select only matching rows, clear selection on change, and save all dirty rows',async()=>{
  const {state,current,calls}=environment()
  current.set('a',{...point('a'),name:'Keep A'});current.set('b',{...point('b'),name:'Hidden B'});current.set('c',{...point('c'),name:'Keep C',interval:2000,accessModes:['write'],managedConfiguration:{codec:'ieee754_float32'}})
  await state.start(['a','b','c'])
  state.updateFilters({identity:'keep'});state.toggleAll();assert.deepEqual(state.selected.value,['a','c'])
  state.fill('interval','250');assert.equal(state.rows.value[1].point.interval,1000)
  state.updateFilters({codecs:['ieee754_float32'],accessModes:['write'],minimum:200,maximum:300});assert.deepEqual(state.selected.value,[]);assert.deepEqual(state.visibleRows.value.map(row=>row.key),['c'])
  await state.confirmSave();assert.equal(calls.length,1);assert.deepEqual(calls[0].map(row=>row.id),['a','c']);assert.equal(calls[0][0].interval,250)
  assert.equal(state.rows.value.length,3);assert.equal(state.dirty.value,false)
})
test('filtered clipboard targets visible identities and appends overflow without touching hidden rows',async()=>{
  const oldWindow=globalThis.window;globalThis.window={addEventListener(){},removeEventListener(){}}
  try {
    const {state,current,load,calls}=environment()
    for(const [id,name,address] of [['a','Keep A','40001'],['b','Hidden B','40002'],['c','Keep C','40003']])current.set(id,{...point(id),name,configuration:{address,quantity:1}})
    await state.start(['a','b','c']);state.updateFilters({identity:'keep'})
    const grid=load('views/data-collect/hook/usePointBatchGrid.ts').usePointBatchGrid(state)
    await grid.activate(state.visibleRows.value[0],'address');grid.commit();grid.pasteText('40011\tInt16\n40012\tInt16\n40013\tInt16')
    assert.equal(state.rows.value[0].address,'40011');assert.equal(state.rows.value[1].address,'40002');assert.equal(state.rows.value[2].address,'40012');assert.equal(state.rows.value.length,4);assert.equal(state.rows.value[3].address,'40013')
    assert.match(state.notice.value,/pasteAdded/);assert.equal(calls.length,0)
    state.updateFilters({identity:'no matches'});grid.pasteText('名称\t地址\t类型\nNew point\t40021\tInt16')
    assert.equal(state.rows.value.length,5);assert.equal(state.rows.value[1].address,'40002')
  } finally {globalThis.window=oldWindow}
})
test('filtered keyboard order, pending-cell commit and hidden-error navigation preserve row identities',async()=>{
  const oldWindow=globalThis.window;globalThis.window={addEventListener(){},removeEventListener(){}}
  try {
    const {state,current,load}=environment()
    for(const [id,name] of [['a','Keep A'],['b','Hidden B'],['c','Keep C']])current.set(id,{...point(id),name})
    await state.start(['a','b','c']);state.updateFilters({identity:'keep'})
    const grid=load('views/data-collect/hook/usePointBatchGrid.ts').usePointBatchGrid(state)
    grid.viewport.value={scrollTop:500,clientHeight:100,querySelector:()=>({focus(){}}),querySelectorAll:()=>[]};state.commitInput.value=grid.commit
    await grid.activate(state.visibleRows.value[0],'interval');grid.input.value='333';grid.keyboard({key:'Tab',preventDefault(){}})
    assert.equal(grid.active.value.key,'c');assert.equal(grid.active.value.field,'name');assert.equal(state.rows.value[0].point.interval,333)
    grid.input.value='Keep Changed';state.updateFilters({address:'40001'})
    assert.equal(state.rows.value[2].point.name,'Keep Changed');assert.equal(grid.active.value,undefined);assert.equal(grid.viewport.value.scrollTop,0)
    state.change(state.rows.value[1],'name','');state.updateFilters({identity:'Keep A'});assert.equal(state.visibleRows.value.length,1)
    await grid.firstError();assert.equal(state.filtered.value,false);assert.equal(state.visibleRows.value.length,3);assert.equal(state.rows.value[1].key,'b')
  } finally {globalThis.window=oldWindow}
})
const pluginColumns=(events=[])=>{
  const linkage=record=>{events.push('link');record.configuration.linked=true}
  return [
    {dataIndex:'address',title:'NodeId',form:{name:['configuration'],rules:[{required:true}]},template:{components:'address-cell',getValue:value=>value,handleChange:(raw,index,record)=>{events.push('address');const value=typeof raw==='string'?raw.trim():raw?.nodeId;if(!value?.startsWith('ns='))throw new Error('invalidNode');return {...record.configuration,nodeId:value}},handleOptions:linkage},customRender:({record})=>record.configuration.nodeId || ''},
    {dataIndex:'type',title:'类型',form:{name:['configuration','type']},template:{components:'type-cell',handleChange:(value,index,record)=>{events.push('type:'+record.configuration.nodeId);return String(value).trim()},handleOptions:linkage},customRender:({text})=>text || ''},
  ]
}
const pluginAdapter=(columns=pluginColumns())=>({columns,isAutoCodec:()=>true,validate:point=>{if(!point.configuration.nodeId)throw new Error('nodeRequired');if(!point.configuration.type)throw new Error('typeRequired')}})
test('empty grids determine shared decoding columns from the current new-point template',async()=>{
  const {state,collector}=environment();let config
  collector.value.configuration.template={configuration:{native:true}}
  state.adapter.value={columns:pluginColumns(),isAutoCodec:point=>{config=point.configuration;return !!point.configuration.native}}
  await state.start();assert.equal(state.columns.value.some(column=>column.key==='codec'),false);assert.deepEqual(config,{native:true})
  assert.equal(state.columns.value.some(column=>column.key==='byteLayout'),false)
  collector.value.configuration.template.configuration.native=false
  assert.equal(state.columns.value.some(column=>column.key==='codec'),true);assert.equal(state.columns.value.some(column=>column.key==='byteLayout'),true)
  state.add();assert.equal(state.columns.value.some(column=>column.key==='codec'),true)
})
test('plugin cells retain partial rows, validate without a panel, and save only after all required fields are ready',async()=>{
  const {state,calls}=environment();state.adapter.value=pluginAdapter();await state.start()
  const row=state.add();row.point.name='UA temperature'
  await state.confirmSave();assert.equal(calls.length,0);assert.equal(row.validationError,'nodeRequired')
  state.change(row,'plugin:address','ns=2;s=Temperature');assert.equal(row.point.configuration.nodeId,'ns=2;s=Temperature');assert.equal(row.validationError,'typeRequired')
  state.change(row,'plugin:type','Double');await vue.nextTick();assert.equal(row.validationError,undefined);assert.equal(state.error.value,'')
  await state.confirmSave();assert.equal(calls.length,1);assert.equal(calls[0][0].configuration.type,'Double');assert.equal('address' in calls[0][0].configuration,false)
})
test('normalization failures retain raw cells through draft recovery without writing text into configuration objects',async()=>{
  const {state,retained,calls}=environment();state.adapter.value=pluginAdapter();await state.start()
  const row=state.add();row.point.name='Draft';state.change(row,'plugin:address','bad address')
  assert.equal(row.inputs['plugin:address'],'bad address');assert.equal(row.fieldErrors['plugin:address'],'invalidNode');assert.equal(typeof row.point.configuration,'object')
  retained.push(JSON.parse(JSON.stringify(row)));state.close();await state.start();assert.equal(state.rows.value[0].inputs['plugin:address'],'bad address')
  await state.confirmSave();assert.equal(calls.length,0)
  const unsupported={dataIndex:'config',form:{name:['configuration']},template:{components:'text-cell'}}
  state.adapter.value={columns:[unsupported]};state.change(state.rows.value[0],'plugin:config','raw object')
  assert.equal(typeof state.rows.value[0].point.configuration,'object');assert.equal(state.rows.value[0].fieldErrors['plugin:config'],'objectClipboard')
  state.adapter.value=pluginAdapter();state.change(state.rows.value[0],'plugin:address',undefined)
  assert.equal(JSON.parse(JSON.stringify(state.rows.value[0])).inputs['plugin:address'],null)
})
test('declared plugin columns drive header mapping, row linkage, filtered paste and selected fill',async()=>{
  const {state,current,calls}=environment(),events=[];state.adapter.value=pluginAdapter(pluginColumns(events))
  for(const [id,node,type] of [['a','ns=2;s=A','Double'],['b','ns=2;s=B','Boolean'],['c','ns=2;s=C','Double']])current.set(id,{...point(id),configuration:{nodeId:node,type,custom:id}})
  await state.start(['a','b','c']);state.updateFilters({plugins:{type:'Double'}});assert.deepEqual(state.visibleRows.value.map(row=>row.key),['a','c'])
  const mapped=state.parseClipboard('类型\tNodeId\t名称\nFloat\tns=2;s=New\tPasted');assert.deepEqual(mapped.fields,['plugin:type','plugin:address','name'])
  state.paste('类型\tNodeId\nFloat\tns=2;s=A1\nDouble\tns=2;s=C1',0,'name',['a','c'])
  assert.equal(state.rows.value[1].point.configuration.nodeId,'ns=2;s=B');assert.deepEqual(events,['address','type:ns=2;s=A1','link','address','type:ns=2;s=C1','link'])
  state.clearFilters();state.updateFilters({plugins:{address:'C1',type:'Double'}});assert.deepEqual(state.visibleRows.value.map(row=>row.key),['c'])
  state.toggleAll();state.fill('plugin:type','Integer');assert.equal(state.rows.value[2].point.configuration.type,'Integer');assert.equal(state.rows.value[0].point.configuration.type,'Float');assert.equal(calls.length,0)
})
test('keyboard traversal includes every plugin column, commits once and Escape restores the current cell',async()=>{
  const oldWindow=globalThis.window;globalThis.window={addEventListener(){},removeEventListener(){}}
  try {
    const {state,load,current}=environment(),events=[];state.adapter.value=pluginAdapter(pluginColumns(events));current.set('a',{...point('a'),configuration:{nodeId:'ns=2;s=Old',type:'Double'}});await state.start(['a'])
    const row=state.rows.value[0],grid=load('views/data-collect/hook/usePointBatchGrid.ts').usePointBatchGrid(state),key=(value,shiftKey=false)=>grid.keyboard({key:value,shiftKey,preventDefault(){},stopPropagation(){}})
    await grid.activate(row,'pointKey');key('Tab');assert.equal(grid.active.value.field,'plugin:address')
    grid.pluginInput.value='ns=2;s=New';grid.pluginInput.value='ns=2;s=New';key('Enter');assert.equal(grid.active.value.field,'plugin:type');assert.equal(row.point.configuration.nodeId,'ns=2;s=New');assert.equal(events.filter(value=>value==='address').length,1)
    grid.pluginInput.value='Boolean';key('Tab',true);assert.equal(grid.active.value.field,'plugin:address');assert.equal(row.point.configuration.type,'Boolean')
    grid.pluginInput.value='ns=2;s=Discard';key('Escape');assert.equal(grid.active.value,undefined);assert.equal(row.point.configuration.nodeId,'ns=2;s=New')
    row.ruleErrors={'plugin:type':'old validation'};await grid.activate(row,'plugin:type');grid.pluginEditor.value={validate:async()=>{}};grid.commit();assert.equal(row.ruleErrors['plugin:type'],undefined)
  } finally {globalThis.window=oldWindow}
})
test('save awaits cell rules and ignores a superseded validation response',async()=>{
  const {state,current,calls}=environment();state.adapter.value=pluginAdapter();current.set('a',{...point('a'),configuration:{nodeId:'ns=2;s=A',type:'Double'}});await state.start(['a'])
  const row=state.rows.value[0];state.change(row,'plugin:type','Float')
  let reject;const pending=new Promise((resolve,fail)=>{reject=fail});state.trackValidation(row,'plugin:type',pending)
  const saving=state.confirmSave();await vue.nextTick();assert.equal(calls.length,0);assert.equal(state.saving.value,true)
  reject({errorFields:[{errors:['bad type']}]});await saving;assert.equal(calls.length,0);assert.equal(row.ruleErrors['plugin:type'],'bad type')
  state.change(row,'plugin:type','Double');let staleReject;state.trackValidation(row,'plugin:type',new Promise((resolve,fail)=>{staleReject=fail}))
  state.change(row,'plugin:type','Integer');staleReject({errorFields:[{errors:['stale type']}]});await new Promise(resolve=>setImmediate(resolve));assert.equal(row.ruleErrors['plugin:type'],undefined)
  await state.confirmSave();assert.equal(calls.length,1);assert.equal(calls[0][0].configuration.type,'Integer')
})
test('metadata is requested for the active decoding point and reused across its decoding cells',async()=>{
  const oldWindow=globalThis.window;globalThis.window={addEventListener(){},removeEventListener(){}}
  try {
    const {state,current,load,metadataCalls}=environment()
    for(let index=0;index<1226;index++)current.set(String(index),point(String(index)))
    await state.start([...current.keys()]);const before=metadataCalls.length,grid=load('views/data-collect/hook/usePointBatchGrid.ts').usePointBatchGrid(state)
    assert.ok(grid.window.value.length<30);assert.equal(metadataCalls.length,before)
    await grid.activate(state.rows.value[0],'codec');await new Promise(resolve=>setImmediate(resolve));grid.commit()
    await grid.activate(state.rows.value[0],'byteLayout');await new Promise(resolve=>setImmediate(resolve));grid.commit()
    assert.equal(metadataCalls.length,before+1);assert.equal(grid.decoding.codecs.value.length,2)
  } finally {globalThis.window=oldWindow}
})
test('only stale local validation alerts clear after correction; request failures remain visible',async()=>{
  const {state,current,failAt}=environment();current.set('a',point('a'));await state.start(['a']);const row=state.rows.value[0]
  state.change(row,'interval','bad');await state.confirmSave();assert.match(state.error.value,/fixErrors/)
  state.change(row,'interval','250');await vue.nextTick();assert.equal(state.error.value,'')
  failAt(1);await state.confirmSave();assert.match(state.error.value,/network failed/)
  state.change(row,'interval','300');await vue.nextTick();assert.match(state.error.value,/network failed/)
})

test('the rendered active boolean cell follows template.check and preserves false until a single commit',async()=>{
  const oldWindow=globalThis.window;globalThis.window={addEventListener(){},removeEventListener(){}}
  let app
  try {
    const {state,current,load}=environment();let commits=0
    const Switch=vue.markRaw(vue.defineComponent({props:['value','checked'],emits:['update:checked','change'],setup:(props,{emit})=>()=>vue.h('button',{'aria-checked':props.checked,'data-value':props.value,onClick:()=>{emit('update:checked',false);emit('change',{target:{checked:false,value:'on'}})}})}))
    const column={dataIndex:'array',form:{name:['configuration','array']},template:{components:Switch,check:true,handleChange:value=>{commits++;return value}}}
    state.adapter.value={columns:[column],isAutoCodec:()=>true};current.set('a',{...point('a'),configuration:{array:true}});await state.start(['a'])
    const row=state.rows.value[0],grid=load('views/data-collect/hook/usePointBatchGrid.ts').usePointBatchGrid(state)
    await grid.activate(row,'plugin:array')
    const filename='views/data-collect/components/workspace/PointBatchCellEditor.vue',{descriptor}=parse(readFileSync(new URL(filename,base),'utf8'))
    const {content}=compileScript(descriptor,{id:'batch-bool',inlineTemplate:true}),module={exports:{}}
    new Function('require','module','exports',transformSync(content,{loader:'ts',format:'cjs'}).code)(id=>id==='vue'?vue:id==='../../hook/usePointBatchCellEditor'?load('views/data-collect/hook/usePointBatchCellEditor.ts'):require(id),module,module.exports)
    const renderer=vue.createRenderer({createElement:tag=>({tag,children:[],props:{}}),createText:text=>({text}),createComment:()=>({text:''}),setText:(node,text)=>{node.text=text},setElementText:(node,text)=>{node.children=[{text,parent:node}]},parentNode:node=>node.parent,nextSibling:node=>node.parent?.children[node.parent.children.indexOf(node)+1]??null,patchProp:(node,key,previous,value)=>{node.props[key]=value},insert(node,parent,anchor){if(node.parent)node.parent.children.splice(node.parent.children.indexOf(node),1);node.parent=parent;const index=anchor?parent.children.indexOf(anchor):-1;parent.children.splice(index<0?parent.children.length:index,0,node)},remove(node){if(node.parent)node.parent.children.splice(node.parent.children.indexOf(node),1)}})
    const container={children:[]},passthrough={setup:(_, {slots,expose})=>{expose({validate:async()=>{}});return ()=>vue.h('div',slots.default?.())}}
    app=renderer.createApp({setup:()=>()=>vue.h(module.exports.default,{value:grid.pluginInput.value,column,record:row.point,'onUpdate:value':value=>{grid.pluginInput.value=value}})})
    app.component('a-form',passthrough).component('a-form-item',passthrough);app.mount(container)
    const find=node=>node.tag==='button'?node:node.children?.map(find).find(Boolean)
    assert.equal(find(container).props['aria-checked'],true);assert.equal(find(container).props['data-value'],true)
    find(container).props.onClick();await vue.nextTick()
    assert.equal(find(container).props['aria-checked'],false);assert.equal(find(container).props['data-value'],false);assert.equal(row.point.configuration.array,true)
    grid.commit();assert.equal(row.point.configuration.array,false);assert.equal(commits,1)
    state.adapter.value={columns:[{...column,template:{components:Switch,check:true}}],isAutoCodec:()=>true}
    state.change(row,'plugin:array',{target:{checked:true,value:'on'}});assert.equal(row.point.configuration.array,true)
    state.change(row,'plugin:array',false);assert.equal(row.point.configuration.array,false)
  } finally {app?.unmount();globalThis.window=oldWindow}
})
