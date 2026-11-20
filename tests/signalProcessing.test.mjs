import assert from 'node:assert/strict'
import test from 'node:test'
import { signalDefaults, validSignal, validDecimal, supportsSignalInput } from '../utils/signalProcessing.ts'

test('step confirmation and session integration match backend bounds',()=>{
  assert.equal(validSignal(signalDefaults('spike')),true)
  assert.equal(validSignal({algorithm:'spike',limit:'0.0000000000000001',samples:2}),true)
  assert.equal(validSignal({algorithm:'spike',limit:1,samples:1}),false)
  assert.equal(validSignal(signalDefaults('integral')),true)
  assert.equal(validSignal({algorithm:'integral',unitMillis:60000,method:'left'}),true)
  assert.equal(validSignal({algorithm:'integral',unitMillis:10}),false)
  assert.equal(validSignal({algorithm:'integral',method:'invalid'}),false)
})

test('robust cleaning bounds and asymmetric slew limits match backend parameters',()=>{
  assert.equal(validSignal(signalDefaults('hampel')),true)
  assert.equal(validSignal({...signalDefaults('hampel'),window:4}),false)
  assert.equal(validSignal({...signalDefaults('hampel'),sigma:0}),false)
  assert.equal(validSignal({...signalDefaults('hampel'),tolerance:-1}),false)
  assert.equal(validSignal({...signalDefaults('hampel'),action:'unknown'}),false)
  assert.equal(validSignal(signalDefaults('trimmed-mean')),true)
  assert.equal(validSignal({algorithm:'trimmed-mean',window:5,trim:3}),false)
  assert.equal(validSignal({algorithm:'trimmed-mean',window:32,trim:1}),false)
  assert.equal(validSignal({algorithm:'slew-rate',rise:2,fall:1}),true)
  assert.equal(validSignal({algorithm:'slew-rate',rise:-1,fall:1}),false)
})

test('confirmation modes validate only their active parameters',()=>{
  assert.equal(validSignal({algorithm:'debounce',confirmation:'samples',samples:3,timeMillis:'unused'}),true)
  assert.equal(validSignal({algorithm:'stable',confirmation:'time',timeMillis:1000,limit:'.02',samples:'unused'}),true)
  assert.equal(validSignal({algorithm:'stable',confirmation:'samples',samples:0,limit:'.02'}),false)
  assert.equal(validSignal({algorithm:'stable',timeMillis:1,limit:'-1e-1000'}),false)
  assert.equal(validSignal({algorithm:'debounce',timeMillis:1,resetAfterMillis:-1}),false)
})

test('window and counter options match the backend bounds without narrowing decimals',()=>{
  assert.equal(validSignal(signalDefaults('moving-average')),true)
  assert.equal(validSignal({algorithm:'moving-average',window:65}),false)
  assert.equal(validSignal({algorithm:'median',window:4}),false)
  assert.equal(validSignal({algorithm:'rate',decrease:'rollover',modulus:'18446744073709551616'}),true)
  assert.equal(validSignal({algorithm:'difference',decrease:'rollover',modulus:0}),false)
  assert.equal(validSignal({algorithm:'difference',decrease:'restart',modulus:'unused'}),true)
  assert.equal(validDecimal('9007199254740993.125'),true)
  assert.equal(validDecimal('1e1000'),true)
  for(const value of [null,undefined,[],true,'','NaN',Infinity]) assert.equal(validDecimal(value),false)
})

test('input compatibility is resolved from provider capabilities',()=>{
  assert.equal(supportsSignalInput('long',['number']),true)
  assert.equal(supportsSignalInput('int',['number','boolean','string','enum']),true)
  assert.equal(supportsSignalInput('string',['number','boolean','string','enum']),true)
  assert.equal(supportsSignalInput('array',['number']),false)
  assert.equal(supportsSignalInput('boolean',['number']),false)
  assert.equal(supportsSignalInput('unknown',['number']),true)
})
