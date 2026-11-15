import { computed, ref, watch, type Ref } from 'vue'
import { cloneDeep, isEqual } from 'lodash-es'
import { useI18n } from 'vue-i18n'
import { queryPointNoPaging, savePointBatch, batchDeletePoint, queryPointMetadata } from '../../../api/data-collect/collector'
import { batchRow, batchIssues, changedBatchRow, editableBatchPoint, mergeBatchPoint, newBatchPoint } from '../../../utils/pointBatchDraft'
import { mapPointClipboard, normalizeClipboardValue } from '../../../utils/pointBatchClipboard'
import { batchFilterActive, emptyBatchFilters, matchesBatchFilters } from '../../../utils/pointBatchFilter'
import { pointBatchGridColumns } from '../../../utils/pointBatchColumns'
import { finishPointBatchRow, setPointBatchCell } from '../../../utils/pointBatchCell'
import type { CollectorObject, PointRow } from '../../../types/workspace'
import type { BatchCellKey, BatchFilterColumn, PointBatchAdapter, PointBatchFilters, PointBatchRow } from '../../../types/pointBatch'
import { useBatchDraftStorage } from './useBatchDraftStorage'
import { usePointCodecs } from './usePointCodecs'

/** A local configuration workspace; only confirmSave crosses the persistence boundary. */
export function usePointBatchEditor(collector: Ref<CollectorObject | undefined>, directory: Ref<PointRow[]>, adapter: Ref<PointBatchAdapter | undefined>, saved: () => Promise<unknown>) {
  const { t, te } = useI18n(), open = ref(false), loading = ref(false), saving = ref(false), error = ref('')
  const rows = ref<PointBatchRow[]>([]), selected = ref<string[]>([]), accessModes = ref<string[]>(['read'])
  const commitInput = ref<() => void>()
  const filters = ref(emptyBatchFilters()), filterRevision = ref(0), notice = ref('')
  const columns=computed(()=>{
    const points=rows.value.length?rows.value.map(row=>row.point):collector.value?[newBatchPoint(collector.value,'')]:[]
    return pointBatchGridColumns(adapter.value,t,!points.length || points.some(point=>!adapter.value?.isAutoCodec?.(point)))
  })
  const filterColumns: BatchFilterColumn[] = ['identity', 'address', 'codec', 'byteLayout', 'accessModes', 'interval']
  const filtered = computed(() => filterColumns.some(column => batchFilterActive(filters.value, column)) || Object.values(filters.value.plugins).some(value=>!!value.trim()))
  const visibleRows = computed(() => filtered.value ? rows.value.filter(row => matchesBatchFilters(row, filters.value, adapter.value)) : rows.value)
  function updateFilters(patch: Partial<PointBatchFilters>) { commitInput.value?.(); filters.value = { ...filters.value, ...patch, plugins:{...filters.value.plugins,...patch.plugins} }; selected.value = []; notice.value = ''; ++filterRevision.value }
  function clearFilters() { commitInput.value?.();filters.value=emptyBatchFilters();selected.value=[];notice.value='';++filterRevision.value }
  function clearFilter(column: BatchFilterColumn) {
    updateFilters(column.startsWith('plugin:')?{plugins:{[column.slice(7)]:''}}:column === 'codec' ? {codecs:[]} : column === 'accessModes' ? {accessModes:[]} : column === 'interval' ? {minimum:undefined,maximum:undefined} : {[column]:''})
  }
  const storage = useBatchDraftStorage(collector, rows, computed(() => open.value && !loading.value))
  const codecCatalog = usePointCodecs(ref({}))
  const issues = computed(() => batchIssues(rows.value, directory.value, adapter.value))
  const dirty = computed(() => rows.value.some(changedBatchRow))
  const counts = computed(() => ({ added: rows.value.filter(row => !row.baseline).length, modified: rows.value.filter(row => row.baseline && !row.deleted && changedBatchRow(row)).length, deleted: rows.value.filter(row => row.deleted).length, errors: [...issues.value.values()].filter(values => values.length).length }))
  let revision = 0, capabilitiesLoaded = false, localValidationFailure=false
  const cellVersions=new Map<string,number>(),validations=new Set<Promise<void>>()
  const message = (cause: unknown) => {
    const key = cause instanceof Error ? cause.message : String(cause)
    if (key === 'keyRequired') return t('collectorBatchKeyRequired')
    if(key==='objectClipboard')return t('collectorBatchObjectClipboard')
    if(key==='invalidByteLayout')return t('collectorBatchInvalidByteLayout')
    if (['clipboardPermission', 'importFormat', 'importColumns'].includes(key)) return t(`collectorBatchFiles.${key}`)
    const translation = `collectorBatch.${key}`
    return te(translation) ? t(translation) : key
  }
  function trackValidation(row:PointBatchRow,key:BatchCellKey,promise:Promise<unknown>) {
    const identity=`${row.key}:${key}`,version=cellVersions.get(identity)
    const current=()=>rows.value.includes(row) && !row.deleted && cellVersions.get(identity)===version
    const pending=promise.then(()=>{if(current() && row.ruleErrors)delete row.ruleErrors[key]},cause=>{
      if(!current())return
      const text=cause?.errorFields?.flatMap((field:{errors?:string[]})=>field.errors || [])[0] || (cause instanceof Error?cause.message:String(cause))
      ;(row.ruleErrors ||= {})[key]=text
    }).finally(()=>validations.delete(pending))
    validations.add(pending)
  }
  const parseClipboard=(text:string,start:BatchCellKey='name')=>mapPointClipboard(text,start,columns.value)
  async function loadCapabilities(point?: PointRow) {
    if (!point || capabilitiesLoaded) return
    capabilitiesLoaded = true
    const token = revision
    try {
      const response = await queryPointMetadata(point.provider, { configuration: point.configuration })
      if (token !== revision) return
      if (response.success && Array.isArray(response.result?.accessModes)) accessModes.value = response.result.accessModes.map((mode: {value:string}) => mode.value)
      else capabilitiesLoaded = false
    } catch { if (token === revision) capabilitiesLoaded = false }
  }
  async function fetchRows(ids: string[]): Promise<PointRow[]> {
    const current = collector.value
    if (!current || !ids.length) return []
    const result: PointRow[] = []
    for (let offset = 0; offset < ids.length; offset += 100) {
      const response = await queryPointNoPaging({ paging: false, terms: [{ column: 'collectorId', value: current.id }, { column: 'id', termType: 'in', value: ids.slice(offset, offset + 100) }] })
      if (!response.success) throw new Error(response.message || t('collectorWorkspace.loadFailed'))
      result.push(...response.result || [])
    }
    return result
  }
  async function start(ids: string[] = directory.value.filter(point => !point.id.startsWith('_new:')).map(point => point.id)) {
    if (saving.value || !collector.value) return
    const token = ++revision
    cellVersions.clear();validations.clear();localValidationFailure=false
    capabilitiesLoaded = false
    loading.value = true; error.value = ''; selected.value = []; rows.value = []; filters.value = emptyBatchFilters(); notice.value = ''; ++filterRevision.value
    const retained = storage.restore()
    open.value = true
    try {
      const existing = await fetchRows([...new Set([...ids, ...retained.filter(row => row.baseline).map(row => row.point.id)])])
      if (token !== revision) return
      const drafts = new Map(retained.map(row => [row.point.id, row]))
      const summaries = new Map(directory.value.map(point => [point.id, point]))
      rows.value = existing.map(point => drafts.get(point.id) || batchRow({ ...point, address: summaries.get(point.id)?.address || point.address }, adapter.value))
      const present = new Set(existing.map(point => point.id))
      rows.value.push(...retained.filter(row => !present.has(row.point.id)))
      accessModes.value = [...new Set(rows.value.flatMap(row => row.point.accessModes?.map(mode => typeof mode === 'string' ? mode : mode.value) || ['read']))]
      if (!accessModes.value.length) accessModes.value = ['read']
      void loadCapabilities(rows.value[0]?.point)
    } catch (cause) { if (token === revision) { rows.value = retained; error.value = message(cause) } }
    finally { if (token === revision) loading.value = false }
  }
  function close() { if (!saving.value) { commitInput.value?.(); storage.flush(); open.value = false; ++revision } }
  function id() { return crypto.randomUUID().replace(/-/g, '') }
  function add() {
    if (!collector.value || saving.value) return
    const row = batchRow(newBatchPoint(collector.value, id()), adapter.value, false)
    finishPointBatchRow(row,[],adapter.value);rows.value.push(row); return rows.value[rows.value.length-1]
  }
  function change(row: PointBatchRow, field: BatchCellKey, value: unknown, deferOptions=false) {
    if (row.deleted || saving.value) return
    const identity=`${row.key}:${field}`;cellVersions.set(identity,(cellVersions.get(identity) || 0)+1)
    setPointBatchCell(row,field,value,rows.value.indexOf(row),adapter.value,deferOptions)
    if(!deferOptions)finishPointBatchRow(row,[],adapter.value)
  }
  function fill(field: BatchCellKey, value: unknown) {
    if (!selected.value.length) return
    const keys = new Set(selected.value)
    for (const row of visibleRows.value) if (keys.has(row.key)) change(row, field, value)
  }
  function toggle(key: string) { if (visibleRows.value.some(row => row.key === key)) selected.value = selected.value.includes(key) ? selected.value.filter(value => value !== key) : [...selected.value, key] }
  function toggleAll() { const keys = new Set(selected.value); selected.value = visibleRows.value.every(row => keys.has(row.key)) ? [] : visibleRows.value.map(row => row.key) }
  /** New rows are local only; saved rows retain a reversible deletion mark until confirmSave. */
  function remove(keys: string[] = selected.value) {
    if (saving.value || loading.value) return
    commitInput.value?.()
    const visible = new Set(visibleRows.value.map(row => row.key)), targets = new Set(keys.filter(key => visible.has(key)))
    rows.value = rows.value.filter(row => {
      if (!targets.has(row.key)) return true
      if (!row.baseline) return false
      row.deleted = true; row.saveError = undefined; return true
    })
    selected.value = []; storage.flush()
  }
  function undoRemove(row: PointBatchRow) { if (!saving.value) { row.deleted = false; row.saveError = undefined; storage.flush() } }
  async function restoreSelected() {
    const visible = new Set(visibleRows.value.map(row => row.key))
    const keys = new Set(selected.value.filter(key => visible.has(key)))
    loading.value = true
    try {
      const latest = new Map((await fetchRows(rows.value.filter(row => keys.has(row.key) && row.baseline).map(row => row.point.id))).map(point => [point.id, point]))
      rows.value = rows.value.flatMap(row => !keys.has(row.key) ? [row] : latest.has(row.point.id) ? [batchRow(latest.get(row.point.id)!, adapter.value)] : [])
      selected.value = []
    } catch (cause) { error.value = message(cause) }
    finally { loading.value = false; storage.flush() }
  }
  function generate(options: { start: string; count: number; codec?: string; step?: number }) {
    error.value = ''
    if (!collector.value || !adapter.value?.generate) return
    try {
      const generated = adapter.value.generate(options, newBatchPoint(collector.value, id()))
      const keys = new Set([...directory.value, ...rows.value.map(row => row.point)].map(point => point.pointKey))
      const base = rows.value.length
      const additions = generated.map((point, index) => {
        const value = { ...newBatchPoint(collector.value!, id()), ...point, id: id() }
        value.name ||= t('collectorBatch.generatedName', { index: base + index + 1 })
        let counter = base + index + 1
        while (keys.has(`point_${counter}`)) counter++
        value.pointKey ||= `point_${counter}`; keys.add(value.pointKey)
        return batchRow(value, adapter.value, false)
      })
      rows.value.push(...additions); void loadCapabilities(additions[0]?.point); return rows.value[base]
    } catch (cause) { error.value = message(cause) }
  }
  function paste(text: string, rowIndex = rows.value.length, start: BatchCellKey = 'name', targetKeys?: string[]) {
    error.value = ''
    try {
      const parsed = parseClipboard(text, start)
      if (!adapter.value?.setAddress && parsed.fields.includes('address') && parsed.rows.some(values => values[parsed.fields.indexOf('address')])) throw new Error('addressReadOnly')
      if (parsed.rows.some(values => values.length > parsed.fields.length)) throw new Error('clipboardColumns')
      const startIndex = rowIndex
      const targets = new Map(rows.value.map(row => [row.key, row]))
      let added = 0
      for (let index = 0; index < parsed.rows.length; index++) {
        const values = new Map(parsed.rows[index].map((value, column) => [parsed.fields[column], normalizeClipboardValue(parsed.fields[column], value, codecCatalog.codecs.value)]))
        let row: PointBatchRow | undefined = targetKeys ? targets.get(targetKeys[index]) : rows.value[startIndex + index]
        if (row?.deleted) row = undefined
        if (!row) added++
        if (!row && adapter.value?.generate && values.get('address') && collector.value) {
          try {
            const template = newBatchPoint(collector.value, id())
            if (values.has('accessModes')) template.accessModes = values.get('accessModes')!.split(/[,，\s]+/).filter(Boolean)
            const generated = adapter.value.generate({ start: values.get('address')!, count: 1, codec: values.get('codec') }, template)[0]
            row = batchRow({ ...template, ...generated, id: id() }, adapter.value, false); rows.value.push(row);row=rows.value[rows.value.length-1]
          } catch { /* Keep every pasted row visible; field errors below identify corrections. */ }
        }
        row ||= add()
        if (!row) continue
        // Spreadsheet column order cannot change protocol field dependencies.
        // Public access first supplies context; plugin columns then normalize in their declared order.
        const order=[...columns.value.filter(column=>['name','pointKey','accessModes','interval'].includes(column.key)),...columns.value.filter(column=>!['name','pointKey','accessModes','interval'].includes(column.key))]
        for (const column of order) if (values.has(column.key) && (column.key !== 'codec' || values.get(column.key)!.trim())) change(row,column.key,values.get(column.key),true)
        finishPointBatchRow(row,columns.value.flatMap(column=>column.plugin && values.has(column.key)?[column.plugin]:[]),adapter.value)
      }
      if (targetKeys && added) notice.value = t('collectorBatchFilter.pasteAdded', { count: added })
      void loadCapabilities(rows.value[startIndex]?.point); return startIndex
    } catch (cause) { error.value = message(cause) }
  }
  async function confirmSave() {
    if (saving.value || loading.value || !dirty.value) return
    commitInput.value?.();error.value = ''; saving.value = true;localValidationFailure=false
    await Promise.all([...validations])
    // Old request errors can be retried; field validation and concurrent edits are checked again.
    for (const row of rows.value) row.saveError = undefined
    const changed = rows.value.filter(changedBatchRow)
    try {
      for (const row of changed) if (!row.deleted && adapter.value) {
        finishPointBatchRow(row,[],adapter.value)
      }
      if (counts.value.errors) {localValidationFailure=true;throw new Error('fixErrors')}
      const latest = new Map((await fetchRows(changed.map(row => row.point.id))).map(point => [point.id, point]))
      const payloads = new Map<string, PointRow>()
      for (const row of changed) {
        try {
          const current = latest.get(row.point.id)
          if (row.deleted) {
            // Never delete a configuration changed by another editor since this draft was opened.
            if (current) {
              const base = cloneDeep(row.baseline!), remote = editableBatchPoint(current)
              delete base.address; delete remote.address
              if (!isEqual(base, remote)) throw new Error('remoteConflict')
            }
          } else payloads.set(row.key, mergeBatchPoint(row, current))
        }
        catch (cause) { row.saveError = message(cause) }
      }
      if (counts.value.errors) {localValidationFailure=true;throw new Error('fixErrors')}
      // Complete removals before saves so a deleted identifier may be reused in this draft.
      const acceptRemovals = (completed: Set<string>) => {
        rows.value = rows.value.filter(row => !completed.has(row.key))
        // Keep uniqueness checks correct even when a later save chunk fails.
        directory.value = directory.value.filter(point => !completed.has(point.id))
        storage.flush()
      }
      const removals = changed.filter(row => row.deleted)
      for (let offset = 0; offset < removals.length; offset += 100) {
        const chunk = removals.slice(offset, offset + 100), pending = chunk.filter(row => latest.has(row.point.id))
        try {
          if (pending.length) {
            const response = await batchDeletePoint(pending.map(row => row.point.id))
            if (!response.success) throw new Error(response.message || t('collectorWorkspace.saveFailed'))
            if (Number(response.result) !== pending.length) {
              const remaining = new Set((await fetchRows(pending.map(row => row.point.id))).map(point => point.id))
              const completed = new Set(chunk.filter(row => !remaining.has(row.point.id)).map(row => row.key))
              acceptRemovals(completed)
              if (remaining.size) throw new Error('saveIncomplete')
            }
          }
          const completed = new Set(chunk.map(row => row.key))
          acceptRemovals(completed)
        } catch (cause) { for (const row of chunk) row.saveError = message(cause); throw cause }
      }
      const updates = changed.filter(row => !row.deleted)
      for (let offset = 0; offset < updates.length; offset += 100) {
        const chunk = updates.slice(offset, offset + 100)
        try {
          const response = await savePointBatch(chunk.map(row => payloads.get(row.key)))
          if (!response.success) throw new Error(response.message || t('collectorWorkspace.saveFailed'))
          if (Number(response.result?.total) !== chunk.length) throw new Error('saveIncomplete')
          for (const row of chunk) { row.point = cloneDeep(payloads.get(row.key)!); row.baseline = cloneDeep(row.point); row.baselineAddress = row.address; row.intervalInput = undefined }
          storage.flush()
        } catch (cause) { for (const row of chunk) row.saveError = message(cause); throw cause }
      }
      await saved()
    } catch (cause) { error.value = message(cause) }
    finally { saving.value = false; storage.flush() }
  }
  watch(() => collector.value?.id, () => { commitInput.value?.(); storage.flush(); open.value = false; rows.value = []; selected.value = []; ++revision })
  watch(() => visibleRows.value.map(row => row.key).join(','), () => { const allowed = new Set(visibleRows.value.map(row => row.key)); selected.value = selected.value.filter(key => allowed.has(key)) })
  watch(()=>counts.value.errors,count=>{if(!count && localValidationFailure){if(error.value===message(new Error('fixErrors')))error.value='';localValidationFailure=false}})
  return { collector, columns, open, rows, visibleRows, filters, filterRevision, filtered, notice, updateFilters, clearFilters, clearFilter, selected, loading, saving, error, dirty, counts, issues, adapter, accessModes, codecCatalog, storage, commitInput, trackValidation, parseClipboard, message, start, close, add, change, fill, toggle, toggleAll, remove, undoRemove, restoreSelected, generate, paste, confirmSave }
}
export type PointBatchEditorState = ReturnType<typeof usePointBatchEditor>
