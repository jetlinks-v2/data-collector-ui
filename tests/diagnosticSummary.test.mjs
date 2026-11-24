import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createRequire} from 'node:module'
import {transformSync} from 'esbuild'
import {parse,compileScript} from 'vue/compiler-sfc'
import * as vue from 'vue'
import {renderToString} from 'vue/server-renderer'
import * as presentation from '../utils/runtimePresentation.ts'
import * as timeline from '../utils/recordingTimeline.ts'

const require=createRequire(import.meta.url)
const words=JSON.parse(readFileSync(new URL('../locales/lang/zh.json',import.meta.url),'utf8'))
const t=(key,args={})=>String(key.split('.').reduce((value,name)=>value?.[name],words) || key).replace('{count}',args.count)
const {descriptor}=parse(readFileSync(new URL('../views/data-collect/components/workspace/DiagnosticContent.vue',import.meta.url),'utf8'))
const {content}=compileScript(descriptor,{id:'diagnostic-summary',inlineTemplate:true})
const module={exports:{}}
new Function('require','module','exports',transformSync(content,{loader:'ts',format:'cjs'}).code)(name=>{
  if(name==='vue-i18n')return {useI18n:()=>({t,te:()=>false})}
  if(name.endsWith('WorkspaceStatus.vue'))return {default:{render:()=>null}}
  if(name.endsWith('runtimePresentation'))return presentation
  if(name.endsWith('recordingTimeline'))return timeline
  return require(name)
},module,module.exports)

async function render(actions,failure) {
  const app=vue.createSSRApp(module.exports.default,{embedded:true,state:{loading:false,error:'',definitions:[],recording:{active:true,executions:[{id:1,status:'completed',actions,failure}]}}})
  app.config.globalProperties.$t=t
  for(const name of ['a-spin','a-alert','a-collapse','a-collapse-panel'])
    app.component(name,{setup:(_, {slots})=>()=>vue.h('div',slots.default?.())})
  app.component('AIcon',{render:()=>null})
  return renderToString(app)
}
const action={id:0,parentId:-1,action:'execution',timestamp:1,status:'completed',useNanos:0,startOffsetNanos:0,attributes:{}}
test('summary renders counts and available duration without inventing a timeline',async()=>{
  const html=await render([{...action,useNanos:20e6,attributes:{summary:true,occurrences:25,decision:'slow',thresholdNanos:10e6}}])
  assert.match(html,/已合并 25 次同类摘要/)
  assert.match(html,/20 ms/)
  assert.match(html,/10 ms/)
  assert.match(html,/采集耗时偏长/)
  assert.match(html,/仅保留摘要/)
  assert.doesNotMatch(html,/cw-timeline/)
  const failure=await render([{...action,attributes:{summary:true,occurrences:1}}],{timestamp:1,reason:'Bad_Timeout'})
  assert.doesNotMatch(failure,/0 μs|0 ns|cw-timeline/)
})
test('detailed sampled execution retains its actual timeline',async()=>{
  const html=await render([{...action,useNanos:2000}])
  assert.match(html,/cw-timeline/)
  assert.doesNotMatch(html,/仅保留摘要/)
})
