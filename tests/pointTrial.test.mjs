import assert from 'node:assert/strict'
import test from 'node:test'
import {readFileSync} from 'node:fs'
import {createRequire} from 'node:module'
import {transformSync} from 'esbuild'
import {effectScope} from 'vue'
import {Observable,Subject,of} from 'rxjs'
const require=createRequire(import.meta.url),module={exports:{}}
new Function('require','module','exports',transformSync(readFileSync(new URL('../views/data-collect/hook/usePointTrial.ts',import.meta.url),'utf8'),{loader:'ts',format:'cjs'}).code)(id=>id.endsWith('/api/data-collect/workspace') ? {} : require(id),module,module.exports)
function setup(t,read){const scope=effectScope(),values=[];const trial=scope.run(()=>module.exports.usePointTrial(rows=>values.push(...rows),read));t.after(()=>scope.stop());return {trial,values}}

test('manual reads use one request at a time and count each returned point once',async t=>{
  const calls=[],streams=[]
  const {trial,values}=setup(t,(collector,ids)=>{const stream=new Subject();calls.push(ids);streams.push(stream);return stream})
  const ids=Array.from({length:201},(_,i)=>`p${i}`),done=trial.run('c',[...ids,'p0','_new:draft'])
  assert.equal(trial.state.value.running,true);assert.equal(calls.length,1);assert.equal(calls[0].length,200)
  streams[0].next({pointId:'p0',parsedData:'9007199254740993'});streams[0].next({pointId:'p0',parsedData:2})
  streams[0].complete();assert.equal(calls.length,2);assert.deepEqual(calls[1],['p200'])
  streams[1].next({pointId:'p200',parsedData:3});streams[1].complete()
  assert.equal(await done,2);assert.equal(values[0].parsedData,'9007199254740993');assert.equal(trial.state.value.running,false)
})

test('an error keeps preceding results even when it arrives before the first progress refresh',async t=>{
  const stream=new Subject(),{trial,values}=setup(t,()=>stream),done=trial.run('c',['p1','p2'])
  stream.next({pointId:'p1',parsedData:12});stream.error(new Error('Read timeout'))
  assert.equal(await done,1);assert.equal(values.length,1);assert.equal(trial.state.value.completed,1)
  assert.equal(trial.state.value.error,'Read timeout');assert.equal(trial.state.value.running,false)
})

test('stop and scope changes cancel transport and do not start later batches',async t=>{
  let closed=0,calls=0
  const {trial}=setup(t,()=>new Observable(()=>{calls++;return ()=>closed++}))
  const done=trial.run('c',Array.from({length:500},(_,i)=>`p${i}`))
  assert.equal(await trial.run('c',['second']),undefined)
  trial.stop();assert.equal(await done,0);assert.equal(closed,1);assert.equal(calls,1);assert.equal(trial.state.value.cancelled,true)
  trial.reset();assert.equal(trial.state.value.total,0)
})

test('synchronous sources settle correctly and can be read again',async t=>{
  const {trial}=setup(t,()=>of({pointId:'p1',parsedData:3}))
  assert.equal(await trial.run('c',['p1']),1)
  assert.equal(await trial.run('c',['p1']),1)
})

test('a single read retains its returned value separately and releases it on the next request',async t=>{
  const streams=[],{trial}=setup(t,()=>{const stream=new Subject();streams.push(stream);return stream})
  const done=trial.run('c',['p1']),row={pointId:'p1',parsedData:false}
  streams[0].next(row);streams[0].complete()
  await done;assert.equal(trial.state.value.result,row)
  const next=trial.run('c',['p2','p3'])
  assert.equal(trial.state.value.result,undefined)
  streams[1].next({pointId:'p2',parsedData:2});streams[1].complete()
  await next;assert.equal(trial.state.value.result,undefined)
  trial.reset();assert.equal(trial.state.value.result,undefined)
})

test('feedback belongs to the initiating surface even when a list read targets only one point',async t=>{
  const stream=new Subject(),{trial}=setup(t,()=>stream)
  const single=trial.run('c',['p1'],'point')
  assert.equal(trial.state.value.scope,'point');stream.error(new Error('Read timeout'));await single
  assert.equal(trial.state.value.scope,'point','closing an editor cannot promote its failure into list feedback')
  const {trial:list}=setup(t,()=>of({pointId:'p1',parsedData:1}))
  await list.run('c',['p1'])
  assert.equal(list.state.value.scope,'list');assert.equal(list.state.value.total,1)
})
