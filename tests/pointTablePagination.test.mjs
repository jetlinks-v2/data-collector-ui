import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import test from 'node:test'
import { effectScope } from 'vue'
import { transformSync } from 'esbuild'
const require = createRequire(import.meta.url)
const { code } = transformSync(readFileSync(resolve(import.meta.dirname, '../views/data-collect/components/Point/usePointTablePagination.ts'), 'utf8'), { loader: 'ts', format: 'cjs' })
const module = { exports: {} }
new Function('require', 'module', 'exports', code)(require, module, module.exports)
const { usePointTablePagination } = module.exports
const page = (start, size = 10, total = 25) => ({ success: true, result: { data: Array.from({ length: size }, (_, n) => ({ id: String(start + n) })), total } })
const deferred = () => { let resolve, reject; const promise = new Promise((a,b) => { resolve=a; reject=b }); return { promise, resolve, reject } }
const fixture = request => { const scope=effectScope(); return { scope, state: scope.run(() => usePointTablePagination(request)) } }

test('requests zero-based server pages and replaces rows without appending', async () => {
  const calls=[]; const { scope,state }=fixture(async (index,size)=>{calls.push([index,size]);return page(index*size, size, 100)})
  try {
    await state.load(); await state.load(2,10); assert.deepEqual(calls,[[0,10],[1,10]])
    assert.equal(state.rows.value.length,10); assert.equal(state.rows.value[0].id,'10');assert.equal(state.total.value,100)
    await state.load(1,20);assert.equal(state.pageSize.value,20);assert.equal(state.rows.value.length,20)
  }finally{scope.stop()}
})
test('late page and old query responses cannot overwrite newer rows',async()=>{
 const old=deferred(),latest=deferred();let count=0
 const {scope,state}=fixture(()=>++count===1?old.promise:latest.promise)
 try{
  const a=state.load(2),b=state.load(1)
  latest.resolve(page(0));await b;old.resolve(page(10));await a
  assert.equal(state.current.value,1);assert.equal(state.rows.value[0].id,'0');assert.equal(state.loading.value,false)
 }finally{scope.stop()}
})
test('failed page retains retry target and does not display stale page rows',async()=>{
 let fail=false;const {scope,state}=fixture(async index=>{if(fail)throw Error('offline');return page(index*10)})
 try{
  await state.load();fail=true;await state.load(2);assert.equal(state.failed.value,true);assert.deepEqual(state.rows.value,[])
  fail=false;await state.load();assert.equal(state.current.value,2);assert.equal(state.rows.value[0].id,'10')
 }finally{scope.stop()}
})
test('deleting the last row of a final page clamps to the last valid page',async()=>{
 const calls=[];const {scope,state}=fixture(async index=>{calls.push(index);return page(index*10,index===2?0:10,20)})
 try{await state.load(3);assert.deepEqual(calls,[2,1]);assert.equal(state.current.value,2);assert.equal(state.rows.value.length,10)}
 finally{scope.stop()}
})
test('missing total is a failure; empty datasets and disposed requests are safe',async()=>{
 const pending=deferred();let count=0
 const {scope,state}=fixture(()=>++count===1?Promise.resolve({success:true,result:{data:[]}}):count===2?Promise.resolve(page(0,0,0)):pending.promise)
 await state.load();assert.equal(state.failed.value,true)
 await state.load();assert.equal(state.total.value,0);assert.equal(state.failed.value,false)
 const task=state.load();scope.stop();pending.resolve(page(90));await task;assert.deepEqual(state.rows.value,[])
})
