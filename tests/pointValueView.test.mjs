import assert from 'node:assert/strict'
import test from 'node:test'
import { pointRawBytes, byteBits } from '../utils/pointValueView.ts'
test('raw views accept actual hex only and preserve leading zero bytes',()=>{
  assert.deepEqual(pointRawBytes('0080fF'),[0,128,255])
  for(const input of [undefined,null,123,'0','0x12','parsed 12'])assert.equal(pointRawBytes(input),undefined)
  assert.deepEqual(pointRawBytes(''),[])
  assert.deepEqual(byteBits(128).map(bit=>[bit.bit,bit.on]),[[7,true],[6,false],[5,false],[4,false],[3,false],[2,false],[1,false],[0,false]])
})
