import assert from 'node:assert/strict'
import test from 'node:test'
import {recordingTimeline} from '../utils/recordingTimeline.ts'
const action=(id,parentId,startOffsetNanos,useNanos)=>({id,parentId,startOffsetNanos,useNanos,timestamp:100,status:'completed',action:'step'})
test('relative bars preserve parent overlap, sibling gaps and microseconds',()=>{
 const t=recordingTimeline([action(0,-1,1000,100000),action(1,0,2000,3000),action(2,0,7000,4000)])
 assert.equal(t.precise,true);assert.equal(t.unit,'μs');assert.equal(t.total,100000)
 assert.equal(t.rows[0].width,100);assert.equal(t.rows[1].depth,1)
 assert.equal(t.rows[2].start,6000);assert.equal(t.rows[2].gap,2000)
 assert.equal(t.rows[2].left,6);assert.equal(t.rows[2].width,4)
})
test('millisecond-only starts are explicitly approximate',()=>{
 const t=recordingTimeline([{...action(0,-1,undefined,300000),timestamp:100},{...action(1,-1,undefined,200000),timestamp:102}])
 assert.equal(t.precise,false);assert.equal(t.rows[1].start,2000000);assert.equal(t.unit,'ms')
})
test('unstarted actions have no timing bar and empty recordings have no invented duration',()=>{
 const t=recordingTimeline([{...action(0,-1,null,0),timestamp:0,status:'created'}])
 assert.equal(t.total,0);assert.equal(t.rows[0].start,undefined);assert.equal(t.rows[0].width,0)
 assert.deepEqual(recordingTimeline([]).ticks,[0,0,0])
})
