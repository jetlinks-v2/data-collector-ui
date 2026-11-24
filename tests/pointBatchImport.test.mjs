import test from 'node:test'
import assert from 'node:assert/strict'
import ExcelJS from 'exceljs'
import {readFileSync} from 'node:fs'
import {createRequire} from 'node:module'
import {transformSync} from 'esbuild'
const require=createRequire(import.meta.url)
const cache=new Map()
function load(name) {
  if(cache.has(name))return cache.get(name)
  const source=readFileSync(new URL(`../utils/${name}.ts`,import.meta.url),'utf8').replace("await import('exceljs')","{ default: require('exceljs') }")
  const module={exports:{}},code=transformSync(source,{loader:'ts',format:'cjs'}).code
  new Function('require','module','exports',code)(id=>id==='exceljs'?ExcelJS:id==='./pointBatchClipboard'?load('pointBatchClipboard'):id==='./pointBatchDraft'?{batchFields:['name','pointKey','address','codec','accessModes','interval']}:id==='./configOptions'?load('configOptions'):require(id),module,module.exports)
  cache.set(name,module.exports);return module.exports
}
const {readPointImport}=load('pointBatchImport')
test('local XLSX import preserves text and explicitly zero-padded identifiers and keeps sheets separate',async()=>{
  const workbook=new ExcelJS.Workbook(),sheet=workbook.addWorksheet('点位')
  sheet.addRows([['类型','地址','名称','标识','周期','采集方式'],['Float32','40301','文件温度','0042',1000,'读取'],['Int16','40303','文件压力',43,2000,'读取']])
  sheet.getCell('D3').numFmt='0000'
  workbook.addWorksheet('备用').addRows([['name','address'],['备用','40401']])
  const buffer=await workbook.xlsx.writeBuffer()
  const sheets=await readPointImport({name:'points.xlsx',arrayBuffer:async()=>buffer})
  assert.equal(sheets.length,2);assert.equal(sheets[0].name,'点位');assert.equal(sheets[0].rows[1][3],'0042');assert.equal(sheets[0].rows[2][3],'0043');assert.equal(sheets[0].rows[1][4],'1000')
  assert.deepEqual(sheets[1].rows,[['name','address'],['备用','40401']])
})
test('local CSV uses the same quoted-cell parser and rejects unsupported workbook formats',async()=>{
  const [sheet]=await readPointImport({name:'points.csv',text:async()=> '\uFEFF名称,标识,地址\r\n"温度,入口",0012,40001\r\n'})
  assert.deepEqual(sheet.rows,[['名称','标识','地址'],['温度,入口','0012','40001']])
  await assert.rejects(readPointImport({name:'old.xls'}),/importFormat/)
})
