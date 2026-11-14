import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import * as vue from 'vue'
import { cloneDeep, isEqual } from 'lodash-es'
import { transformSync } from 'esbuild'

const require=createRequire(import.meta.url)
test('the selected point reuses its metadata and coalesces identical plugin notifications',async()=>{
  const provided={},requests=[]
  const source=readFileSync(new URL('../views/data-collect/hook/usePointPlugin.ts',import.meta.url),'utf8')
  const module={exports:{}}
  new Function('require','module','exports',transformSync(source,{loader:'ts',format:'cjs'}).code)(id=>{
    if(id==='vue')return {...vue,provide:(key,value)=>provided[key]=value,onBeforeUnmount(){}}
    if(id==='lodash-es')return {cloneDeep,isEqual}
    if(id==='vue-i18n')return {useI18n:()=>({t:key=>key})}
    if(id.endsWith('/utils/utils'))return {devGetProtocol:async()=>'<template />'}
    if(id.endsWith('/api/data-collect/collector'))return {queryPointMetadata:(provider,input)=>new Promise(resolve=>requests.push({provider,input,resolve}))}
    if(id.endsWith('/data'))return {DATA_COLLECTOR_SAVE_TYPE:'save-type'}
    return require(id)
  },module,module.exports)
  const model={provider:'test',configuration:{address:1},metadata:{autoCodec:true}}
  const plugin=module.exports.usePointPlugin(model,{configuration:{}},cloneDeep(model))
  await new Promise(resolve=>setImmediate(resolve))
  const update=provided['point-metadata-events'].pointMetadataEvents
  await update('test',{configuration:{address:1}})
  assert.equal(requests.length,0)
  assert.equal(plugin.capabilities.value.autoCodec,true)
  const first=update('test',{configuration:{address:2}})
  await update('test',{configuration:{address:2}})
  assert.equal(requests.length,1)
  const second=update('test',{configuration:{address:3}})
  requests[1].resolve({success:true,result:{autoCodec:false}});await second
  requests[0].resolve({success:true,result:{autoCodec:true}});await first
  assert.equal(plugin.capabilities.value.autoCodec,false,'late metadata cannot overwrite the new configuration')
  const restored=module.exports.usePointPlugin({...model,configuration:{address:9}},{configuration:{}},cloneDeep(model))
  await new Promise(resolve=>setImmediate(resolve))
  assert.equal(requests.length,3,'a changed draft must resolve its own configuration instead of using the saved metadata')
  requests[2].resolve({success:true,result:{autoCodec:true}})
  await new Promise(resolve=>setImmediate(resolve))
  assert.equal(restored.capabilities.value.autoCodec,true)
})
