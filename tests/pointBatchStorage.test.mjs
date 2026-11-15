import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {transformSync} from 'esbuild'
import * as vue from 'vue'

const code=transformSync(readFileSync(new URL('../views/data-collect/hook/useBatchDraftStorage.ts',import.meta.url),'utf8'),{loader:'ts',format:'cjs'}).code
test('local drafts are isolated by user and collector, invalid rows do not crash restore, and quota failures are visible',async()=>{
  const oldWindow=globalThis.window,oldStorage=globalThis.localStorage
  const store=new Map(),events=new Map(),user={userInfo:{id:'user-a'}}
  let quota=false
  globalThis.window={addEventListener:(event,callback)=>events.set(event,callback),removeEventListener(){}}
  globalThis.localStorage={getItem:key=>store.get(key)||null,setItem:(key,value)=>{if(quota)throw new Error('quota');store.set(key,value)},removeItem:key=>store.delete(key)}
  const debounce=fn=>{const callback=()=>{};callback.cancel=()=>{};return callback}
  const module={exports:{}},scope=vue.effectScope()
  new Function('require','module','exports',code)(id=>id==='vue'?{...vue,onBeforeUnmount(){}}:id==='lodash-es'?{debounce}:id==='@jetlinks-web-core/store'?{useUserStore:()=>user}:id.includes('pointBatchDraft')?{changedBatchRow:row=>!row.baseline}:null,module,module.exports)
  const collector=vue.ref({id:'collector-a'}),rows=vue.ref([]),active=vue.ref(true)
  const local=scope.run(()=>module.exports.useBatchDraftStorage(collector,rows,active))
  try {
    store.set('collector-batch:v1:user-a:collector-a',JSON.stringify({version:1,rows:[null,{key:'stable',address:'40001',point:{id:'stable',name:'温度',configuration:{}}}]}))
    assert.equal(local.restore().length,1);assert.equal(local.recoveryFailed.value,true)
    rows.value=[{key:'stable',address:'40003',point:{id:'stable',name:'草稿',configuration:{}}}]
    local.flush();assert.equal(JSON.parse(store.get('collector-batch:v1:user-a:collector-a')).rows[0].address,'40003')
    user.userInfo.id='user-b';assert.deepEqual(local.restore(),[])
    collector.value={id:'collector-b'};assert.deepEqual(local.restore(),[])
    user.userInfo.id='';assert.deepEqual(local.restore(),[]);local.flush();assert.equal(store.has('collector-batch:v1::collector-b'),false)
    user.userInfo.id='user-a';collector.value={id:'collector-a'};local.restore()
    quota=true;local.flush();assert.equal(local.failed.value,true)
    quota=false;events.get('beforeunload')();assert.equal(local.failed.value,false)
  } finally {scope.stop();globalThis.window=oldWindow;globalThis.localStorage=oldStorage}
})
