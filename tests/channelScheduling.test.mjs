import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {transformSync} from 'esbuild'
import * as vue from 'vue'

function fixture(model){
  const calls=[],pending=[]
  const module={exports:{}}
  new Function('require','module','exports',transformSync(readFileSync(new URL('../views/data-collect/hook/useChannelScheduling.ts',import.meta.url),'utf8'),{loader:'ts',format:'cjs'}).code)(
    id=>id==='vue'?{...vue,onBeforeUnmount:vue.onScopeDispose}:id==='vue-i18n'?{useI18n:()=>({t:key=>key})}
      :{schedulingNodes:provider=>{calls.push(provider);return new Promise(resolve=>pending.push(resolve))}},module,module.exports)
  const scope=vue.effectScope()
  const hook=scope.run(()=>module.exports.useChannelScheduling(()=>model))
  return {hook,scope,calls,pending}
}

test('existing ID, tag conjunction and term expression preserve their OR semantics',async()=>{
  const model=vue.reactive({provider:'provider',scheduling:{serverId:'node-a',tags:{zone:'east',network:'factory'},tagsFilter:[{column:'site',termType:'eq',value:'second'}]}})
  const {hook,scope,pending}=fixture(model)
  assert.equal(hook.terms.value.length,3)
  assert.equal(hook.terms.value[1].terms.length,2)
  assert.ok(hook.terms.value.every(term=>term.type==='or'))
  pending[0]({success:true,result:[{id:'node-a',tags:{zone:'east'}}]})
  await vue.nextTick()
  assert.ok(hook.fields.value.some(field=>field.dataIndex==='site'),'stored conditions remain editable when a tag is currently absent')
  hook.terms.value=[]
  assert.equal(model.scheduling,null)
  scope.stop()
})

test('late node lookups cannot replace another provider or overwrite the saved rule',async()=>{
  const model=vue.reactive({provider:'first',scheduling:{tagsFilter:[{column:'id',termType:'eq',value:'configured'}]}})
  const {hook,scope,calls,pending}=fixture(model)
  model.provider='second'
  await vue.nextTick()
  pending[1]({success:true,result:[{id:'second-node',tags:{}}]})
  await vue.nextTick()
  pending[0]({success:true,result:[{id:'old-node',tags:{}}]})
  await vue.nextTick()
  assert.deepEqual(calls,['first','second'])
  assert.equal(hook.nodes.value[0].id,'second-node')
  assert.equal(model.scheduling.tagsFilter[0].value,'configured')
  scope.stop()
})
