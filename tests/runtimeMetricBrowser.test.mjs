import test from 'node:test'
import assert from 'node:assert/strict'
import {groupRuntimeMetricRows,runtimeMetricRows} from '../utils/runtimePresentation.ts'
test('groups plugin and built-in metrics by metadata and searches names, ids and descriptions',()=>{
 const metric=(id,kind,semantic)=>({id,i18nName:id,i18nDescription:id === 'traffic' ? 'raw bytes received' : '',expands:{metric:{kind,semantic}}})
 const definitions=[metric('pending','gauge','value'),metric('traffic','counter','value'),metric('latency','gauge','duration'),metric('latest','gauge','timestamp')]
 const values=Object.fromEntries(['pending','traffic','latency','latest','custom'].map(key=>[key,{available:true,value:1}]))
 const rows=runtimeMetricRows({metrics:{values}},definitions,String,String)
 const groups=groupRuntimeMetricRows(rows)
 assert.deepEqual(groups.map(group=>group.id),['current','duration','counter','activity','other'])
 assert.equal(groups.reduce((total,group)=>total+group.rows.length,0),5)
 assert.equal(groupRuntimeMetricRows(rows,' RAW BYTES ')[0].rows[0].id,'traffic')
 assert.equal(groupRuntimeMetricRows(rows,'custom')[0].id,'other')
 assert.deepEqual(groupRuntimeMetricRows(rows,'unknown'),[])
})
