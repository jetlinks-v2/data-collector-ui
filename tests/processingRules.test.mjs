import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { transformSync } from 'esbuild'
import { effectScope, nextTick, reactive, ref } from 'vue'

const require = createRequire(import.meta.url), cache = new Map()
let lookupType = async () => ({ success:true, result:{ dataType:{ id:'int' } } })
let lookupErrors = async () => ({ success:true, result:[] })
const sharedRoot=process.env.JETLINKS_EXPRESSION_TEST_ROOT || fileURLToPath(new URL('../../../jetlinks-web-core/src/components/Expression/',import.meta.url))
function load(path) {
  if (cache.has(path)) return cache.get(path).exports
  const module = { exports:{} }
  cache.set(path, module)
  const { code } = transformSync(readFileSync(path, 'utf8'), { loader:'ts', format:'cjs' })
  new Function('require', 'module', 'exports', code)(id => {
    if (id === 'vue-i18n') return { useI18n:() => ({ t:key => key }) }
    if (id === '@jetlinks-web-core/components/Expression') return { ...load(resolve(sharedRoot,'arithmetic.ts')),...load(resolve(sharedRoot,'editor.ts')),useExpressionFunctions:()=>({functions:ref([]),error:ref(false),refresh:async()=>{}}) }
    if (id.endsWith('/api/data-collect/collector')) return { getPointDataType:id => lookupType(id), getCollectorError:() => lookupErrors(),getCollectorExpressionFunctions:async()=>[] }
    return id.startsWith('.') ? load(resolve(dirname(path), `${id}.ts`)) : require(id)
  }, module, module.exports)
  return module.exports
}
const { useProcessingRules } = load(fileURLToPath(new URL('../views/data-collect/hook/useProcessingRules.ts', import.meta.url)))
const point = () => reactive({ id:'point', name:'point', provider:'modbus-tcp', configuration:{} })

test('new range cleaning uses a switchable action before conversion without formula controls', t => {
  const model=point(),rules=createRules(t,()=>model,()=>({dataType:{id:'double'}}))
  rules.add('outlier');rules.add('converter')
  assert.equal(model.managedConfiguration.outlier.provider,'range')
  assert.equal(rules.visibleGroups.value[0].key,'cleaning')
  rules.cleaningAction.value='clamp'
  assert.equal(model.managedConfiguration.outlier.configuration.action,'clamp')
  assert.equal(model.managedConfiguration.outlier.configuration.beforeConversion,true)
  assert.equal(rules.formulas.outlier.value.value,undefined)
  assert.equal(rules.conversionModes.value.length,2)
  rules.cleaningAction.value='ignore'
  assert.equal(rules.formulas.outlier.value.value.root.operands[0].operator,'ge')
})

test('conversion formulas accept null as ignore and arithmetic reset is explicit', t => {
  const model=point(),rules=createRules(t,()=>model,()=>({dataType:{id:'double'}}))
  rules.add('converter')
  const formula=rules.formulas.converter
  formula.start();formula.update({version:1,root:{type:'literal',valueType:'null',value:null}});formula.done(()=>true)
  assert.equal(formula.editing.value,false)
  assert.equal(formula.invalid.value,false)
  assert.equal(model.managedConfiguration.converter.configuration.expression.root.valueType,'null')
  formula.resetSimple()
  assert.equal(formula.simple.value,true)
  assert.equal(formula.steps.value[0].value,'1')
})
function createRules(t, getModel, capabilities = () => ({})) {
  const scope = effectScope()
  t.after(() => scope.stop())
  return scope.run(() => useProcessingRules(getModel, capabilities))
}

test('reading rules does not dirty the draft and follows a replaced draft', t => {
  const current = ref(point()), rules = createRules(t, () => current.value)
  const before = JSON.stringify(current.value)
  assert.equal(rules.managed.value.converter, undefined)
  assert.equal(rules.enabled('converter'), false)
  assert.equal(rules.error.value, '')
  assert.equal(JSON.stringify(current.value), before)
  current.value = reactive({ ...point(), managedConfiguration:{ converter:{ enabled:true, provider:'scale', configuration:{ factor:2 } } } })
  assert.equal(rules.managed.value.converter.configuration.factor, 2)
})

test('removing and adding rules retains parameters and unrelated features', t => {
  const model = point()
  model.managedConfiguration = { converter:{ enabled:true, provider:'scale', configuration:{ factor:0.1, scale:4 } }, deadband:{ enabled:true, provider:'term', configuration:{ terms:[] } } }
  model.features = ['storageData','vendorFeature']
  const rules = createRules(t, () => model), deadband = JSON.stringify(model.managedConfiguration.deadband)
  rules.remove('converter'); rules.add('converter')
  assert.deepEqual(model.managedConfiguration.converter.configuration, { factor:0.1, scale:4 })
  rules.add('changedOnly'); rules.add('changedOnly')
  rules.storageValues.value = ['storageOutlier','storageDeadband']
  assert.deepEqual(model.features, ['vendorFeature','changedOnly','storageOutlier','storageDeadband'])
  rules.remove('changedOnly'); rules.remove('storage')
  assert.deepEqual(model.features, ['vendorFeature'])
  assert.equal(JSON.stringify(model.managedConfiguration.deadband), deadband)
  rules.remove('converter'); model.managedConfiguration.converter = { enabled:false }; rules.add('converter')
  assert.equal(model.managedConfiguration.converter.provider, 'expression')
})

test('validation respects range bounds and optional scale defaults', async t => {
  const model = point(), rules = createRules(t, () => model)
  model.managedConfiguration = { outlier:{enabled:true,provider:'range',configuration:{min:0,max:0}} }
  await assert.rejects(rules.validate(), /invalidRange/)
  model.managedConfiguration.outlier.configuration.max = 1
  model.managedConfiguration.converter = {enabled:true,provider:'scale',configuration:{factor:0,scale:0}}
  await assert.doesNotReject(rules.validate())
  model.managedConfiguration.converter.configuration = {}
  await assert.doesNotReject(rules.validate())
  model.managedConfiguration.converter.configuration.scale = -1
  assert.ok(rules.errors.value.converter)
  await assert.rejects(rules.validate(), /invalidPrecision/)
  rules.remove('converter')
  await assert.doesNotReject(rules.validate())
})

test('MathLive edits the pass predicate without inversion or rewriting the original on read', async t => {
  const model = point(), rules = createRules(t, () => model)
  rules.add('deadband')
  model.managedConfiguration.deadband = { enabled:true,provider:'term',configuration:{ extension:'keep', terms:[{ key:'group', type:'and', terms:[{ key:'term', column:'currentValue', termType:'gt', value:0 }] }] } }
  const before = JSON.stringify(model)
  const formula=rules.formulas.deadband
  assert.equal(formula.value.value.root.operator, 'gt')
  assert.equal(JSON.stringify(model), before)
  formula.start(); formula.update({version:1,root:{type:'binary',operator:'gt',left:{type:'binary',operator:'subtract',left:{type:'reference',id:'currentValue',path:[]},right:{type:'reference',id:'lastValue',path:[]}},right:{type:'literal',valueType:'int',value:-5}}})
  await assert.rejects(rules.validate(), /finishFormula/)
  formula.done(()=>true)
  assert.equal(model.managedConfiguration.deadband.provider,'expression')
  assert.equal(model.managedConfiguration.deadband.configuration.expression.root.left.operator,'subtract')
  assert.equal(model.managedConfiguration.deadband.configuration.extension, 'keep')
  await assert.doesNotReject(rules.validate())
  const saved=JSON.stringify(model)
  formula.start();formula.update({version:1,root:{type:'literal',valueType:'int',value:42}});formula.done(()=>true)
  assert.equal(formula.typeError.value,true)
  assert.equal(JSON.stringify(model),saved)
  formula.cancel()
})

test('extended conditions and unknown providers remain intact when read or re-enabled', async t => {
  const model = point()
  model.managedConfiguration = { deadband:{ enabled:true, provider:'term', configuration:{ terms:[{ terms:[{ column:'vendorExpression', termType:'btw', value:[1,2] }] }] } }, converter:{ enabled:true, provider:'custom', configuration:{ script:'keep' } } }
  const before = JSON.stringify(model), rules = createRules(t, () => model)
  assert.equal(rules.formulas.deadband.value.value, undefined)
  await assert.doesNotReject(rules.validate())
  rules.remove('deadband'); rules.add('deadband')
  assert.equal(JSON.stringify(model), before)
})

test('alarm loads errors on demand and preserves fields when switching trigger types', async t => {
  let calls = 0
  lookupErrors = async () => { ++calls; return { success:true, result:[{ code:0, description:'Zero code' }] } }
  const model = point(), rules = createRules(t, () => model)
  await nextTick(); assert.equal(calls, 0)
  rules.add('handler'); await nextTick(); await nextTick()
  assert.equal(calls, 1)
  model.managedConfiguration.handler.configuration.alarmName = 'Custom name'
  model.managedConfiguration.handler.configuration.level = 2
  model.managedConfiguration.handler.configuration.shakeLimit.rolling = true
  rules.alarm.trigger.value = 'code:0'
  assert.equal(model.managedConfiguration.handler.configuration.code, 0)
  assert.equal(model.managedConfiguration.handler.configuration.reason, undefined)
  assert.equal(rules.alarm.trigger.value, 'code:0')
  rules.alarm.trigger.value = 'reason:deadband'
  rules.alarm.setLimit({ time:10 })
  assert.equal(model.managedConfiguration.handler.configuration.code, undefined)
  assert.equal(model.managedConfiguration.handler.configuration.reason, 'deadband')
  assert.equal(model.managedConfiguration.handler.configuration.alarmName, 'Custom name')
  assert.equal(model.managedConfiguration.handler.configuration.level, 2)
  assert.equal(model.managedConfiguration.handler.configuration.shakeLimit.rolling, true)
  rules.alarm.setLimit({ threshold:null })
  await assert.rejects(rules.validate(), /incompleteAlarm/)
  rules.alarm.setNumber('time', '0')
  await assert.doesNotReject(rules.validate())
  rules.alarm.setNumber('time', '')
  await assert.rejects(rules.validate(), /incompleteAlarm/)
  rules.alarm.setLimit({ enabled:false })
  await assert.doesNotReject(rules.validate())
})

test('alarm failures can be retried without altering configuration', async t => {
  lookupErrors = async () => { throw new Error('offline') }
  const model = point(), rules = createRules(t, () => model)
  rules.add('handler'); await nextTick(); await nextTick()
  const before = JSON.stringify(model)
  assert.equal(rules.alarm.failed.value, true)
  lookupErrors = async () => ({ success:true, result:[{ code:100, name:'timeout' }] })
  await rules.alarm.load()
  assert.equal(rules.alarm.failed.value, false)
  assert.ok(rules.alarm.options.value.some(option => option.value === 'code:100'))
  assert.equal(JSON.stringify(model), before)
})

test('numeric rule choices follow native and decoded types and ignore stale responses', async t => {
  const pending = new Map()
  lookupType = id => new Promise(resolve => pending.set(id, resolve))
  const model = point(), capabilities = reactive({ dataType:{ id:'boolean' } })
  const rules = createRules(t, () => model, () => capabilities)
  assert.equal(rules.numeric.value, false)
  assert.equal(rules.formulas.outlier.context.value.references[0].schema.type, 'boolean')
  model.managedConfiguration = { codec:'oldCodec' }; await nextTick()
  model.managedConfiguration.codec = 'newCodec'; await nextTick()
  pending.get('newCodec')({ success:true, result:{ dataType:{ id:'boolean' } } }); await nextTick()
  assert.equal(rules.numeric.value, false)
  pending.get('oldCodec')({ success:true, result:{ dataType:{ id:'int' } } }); await nextTick()
  assert.equal(rules.numeric.value, false)
  model.managedConfiguration.codec = undefined; capabilities.dataType.id = 'double'; await nextTick()
  assert.equal(rules.numeric.value, true)
})

test('arithmetic uses the shared decimal steps and retains invalid local drafts', async t => {
  const model=point(), rules=createRules(t,()=>model,()=>({dataType:{id:'double'}}))
  rules.add('converter')
  const formula=rules.formulas.converter
  assert.equal(formula.simple.value,true)
  const steps=[{operator:'divide',value:'100'},{operator:'add',value:'9007199254740993.125'}]
  formula.updateSteps(steps)
  assert.equal(formula.value.value.root.right.value,'9007199254740993.125')
  formula.updateSteps([{operator:'divide',value:'0'},steps[1]])
  await assert.rejects(rules.validate(),/finishFormula/)
  const {processingPending}=load(fileURLToPath(new URL('../utils/processingDraft.ts',import.meta.url)))
  assert.equal(processingPending(model),true)
  const remount=createRules(t,()=>model)
  assert.equal(remount.formulas.converter.steps.value[0].value,'0')
  formula.updateSteps(steps)
  formula.start(); formula.cancel()
  assert.deepEqual(formula.steps.value,steps)
  formula.start();formula.done(()=>true)
  assert.equal(formula.simple.value,false)
  formula.simplify()
  assert.equal(formula.simple.value,true)
  assert.deepEqual(formula.steps.value,steps)
  await assert.doesNotReject(rules.validate())
  assert.equal(processingPending(model),false)
})

test('a corrected formula can be accepted after a result type error and cancellation is lossless', t => {
  const model=point(),rules=createRules(t,()=>model)
  rules.add('outlier')
  const formula=rules.formulas.outlier,before=JSON.stringify(model)
  formula.start(); formula.update({version:1,root:{type:'literal',valueType:'int',value:'1'}});formula.done(()=>true)
  assert.equal(formula.invalid.value,true)
  formula.update({version:1,root:{type:'literal',valueType:'boolean',value:false}});formula.done(()=>true)
  assert.equal(formula.editing.value,false)
  assert.equal(formula.value.value.root.value,false)
  formula.start();formula.update({version:1,root:{type:'literal',valueType:'boolean',value:true}});formula.cancel()
  assert.equal(formula.value.value.root.value,false)
  assert.notEqual(JSON.stringify(model),before)
})

test('legacy cleaning keeps its position until explicitly replaced and long constants keep precision',t=>{
  const model=point(),rules=createRules(t,()=>model)
  model.managedConfiguration={converter:{enabled:true,provider:'scale',configuration:{factor:0.1}},outlier:{enabled:true,provider:'range',configuration:{min:'9007199254740993',max:'9007199254740994'}}}
  assert.equal(rules.visibleGroups.value[0].key,'calculation')
  const formula=rules.formulas.outlier
  assert.equal(formula.value.value.root.operands[0].right.valueType,'long')
  assert.equal(formula.value.value.root.operands[0].right.value,'9007199254740993')
  assert.equal(formula.value.value.root.operands[0].operator,'gt')
  assert.equal(formula.value.value.root.operands[1].operator,'lt')
  formula.start();formula.done(()=>true)
  assert.equal(rules.visibleGroups.value[0].key,'cleaning')
})

test('writable formulas require an explicit write transformation',async t=>{
  const model=point(),rules=createRules(t,()=>model)
  model.accessModes=['read','write'];rules.add('converter')
  await assert.rejects(rules.validate(),/writeFormulaRequired/)
  rules.writeFormula.start();rules.writeFormula.done(()=>true)
  await assert.doesNotReject(rules.validate())
  assert.equal(model.managedConfiguration.converter.configuration.writeExpression.root.id,'currentValue')
  assert.equal(rules.formulas.converter.simple.value,false) // 未知输入类型不推断成数值。
  assert.equal(model.managedConfiguration.converter.configuration.editorMode,undefined)
  assert.equal(model.managedConfiguration.converter.configuration.writeEditorMode,'formula')
})
