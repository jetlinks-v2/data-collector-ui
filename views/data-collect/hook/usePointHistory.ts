import { computed, nextTick, onBeforeUnmount, onDeactivated, provide, ref, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import dayjs, { type Dayjs } from 'dayjs'
import { debounce, isEqual } from 'lodash-es'
import { parseJsonWithPrecision } from '@jetlinks-web-core/utils/json'
import { getPointDataType, queryPointAggregation, queryPointHistory } from '../../../api/data-collect/collector'
import { loadWorkspacePoint } from '../../../api/data-collect/workspace'
import { pointHistoryChart, pointHistoryKind, storedPointSamples } from '../../../utils/pointHistoryView'
import type { PointHistorySample, StoredPointData } from '../../../types/pointHistory'
import type { PointDataType, PointRow } from '../../../types/workspace'
import { hasPointHistoryStorage } from '../../../utils/pointStorage'
import type { useWorkspaceData } from './useWorkspaceData'
import { POINT_HISTORY } from './context'

type Source = 'live' | 'stored'
type Aggregation = 'raw' | 'avg' | 'min' | 'max'
type Preferences = { source: Source; view: 'chart' | 'table'; period: string; range?: [Dayjs, Dayjs]; aggregation: Aggregation; interval: string; indices: number[] }
type ZoomEvent = { start?: number; end?: number; startValue?: number; endValue?: number; batch?: ZoomEvent[] }
const pageSize = 200, chartLimit = 2000

/** 查看会话持有查询和面板状态；值订阅与内存缓冲仍归工作区数据 owner。 */
export function usePointHistory(data: ReturnType<typeof useWorkspaceData>, editPoint: (point: PointRow) => void) {
  const { t } = useI18n(), open = ref(false), target = shallowRef<PointRow>(), details = shallowRef<PointRow>(), decodedType = shallowRef<PointDataType>()
  const preview = ref(false)
  const source = ref<Source>('live'), view = ref<'chart' | 'table'>('chart'), period = ref('1h'), range = shallowRef<[Dayjs, Dayjs]>()
  const aggregation = ref<Aggregation>('raw'), interval = ref('1m'), indices = ref([0]), indexInput = ref<number>(0)
  const rows = shallowRef<PointHistorySample[]>([]), total = ref(0), loading = ref(false), loadingMore = ref(false), detailsLoading = ref(false), error = ref(''), detailsError = ref('')
  const extent = shallowRef<[number, number]>(), selectedRange = shallowRef<[number, number]>(), ended = ref(false), expandedId = ref<string>()
  let nextPage = 0
  const preferences = new Map<string, Preferences>()
  let detailRequest: AbortController | undefined, queryRequest: AbortController | undefined, revision = 0
  let returnFocus: HTMLElement | undefined, pendingSettings: PointRow | undefined
  const key = () => target.value ? `${target.value.collectorId}/${target.value.id}` : ''
  const point = computed(() => {
    if (!target.value) return
    const live = data.points.value.find(row => row.id === target.value!.id)
    return { ...target.value, ...details.value, ...(live ? { latest: live.latest, runtime: live.runtime } : {}) }
  })
  const dataType = computed(() => decodedType.value || point.value?.metadata?.dataType)
  const stored = computed(() => details.value ? hasPointHistoryStorage(details.value) : undefined)
  const buffer = computed(() => { data.historyRevision.value; return target.value ? data.historyCache.read(target.value.collectorId!, target.value.id) : undefined })
  const samples = computed(() => source.value === 'live' ? buffer.value?.samples || [] : rows.value)
  const kind = computed(() => pointHistoryKind(dataType.value, samples.value))
  const effectiveAggregation = computed(() => kind.value === 'number' ? aggregation.value : 'raw')
  const isArray = computed(() => kind.value.startsWith('array-'))
  const maxIndex = computed(() => Math.max(0, ...samples.value.map(sample => Array.isArray(sample.value) ? sample.value.length - 1 : 0)))
  const canAddIndex = computed(() => indexInput.value != null && Number.isInteger(indexInput.value) && indexInput.value >= 0 && indexInput.value <= maxIndex.value && indices.value.length < 8 && !indices.value.includes(indexInput.value))
  const chart = computed(() => pointHistoryChart(samples.value.slice(-chartLimit), dataType.value, indices.value, t('collectorWorkspace.noData')))
  const chartConfiguration = computed(() => ({ ...chart.value.option, dataZoom: chart.value.option.dataZoom.map(zoom => ({ ...zoom, ...(source.value === 'stored' ? { startValue: selectedRange.value?.[0] ?? extent.value?.[0], endValue: selectedRange.value?.[1] ?? extent.value?.[1], rangeMode: ['value', 'value'] } : {}) })), toolbox: { show: !preview.value, right: 8, feature: { dataZoom: { yAxisIndex: 'none', title: { zoom: t('collectorHistory.selectRange'), back: t('collectorHistory.resetRange') } } } } }))
  const chartOption = shallowRef(chartConfiguration.value), chartData = computed(() => ({ ...chart.value.data, xAxis: { id: 'time', min: source.value === 'stored' ? extent.value?.[0] : undefined, max: source.value === 'stored' ? extent.value?.[1] : undefined } }))
  watch(chartConfiguration, value => { if (!isEqual(chartOption.value, value)) chartOption.value = value })
  const tableRows = computed(() => samples.value.slice().reverse().map((row, index) => ({ ...row, rowIndex: index + 2 })))
  const hasMore = computed(() => source.value === 'stored' && effectiveAggregation.value === 'raw' && !ended.value && rows.value.length < total.value)
  const chartActive = computed(() => open.value && !preview.value && view.value === 'chart' && kind.value !== 'table' && source.value === 'stored')
  const chartLimited = computed(() => effectiveAggregation.value === 'raw' && samples.value.length >= chartLimit && (hasMore.value || samples.value.length > chartLimit))
  const recording = computed(() => open.value && !data.historyPaused.value && !data.paused.value && !data.valueError.value)
  const summary = computed(() => [point.value?.pointKey || point.value?.id, dataType.value?.type || dataType.value?.id, dataType.value?.unit || point.value?.unit].filter(Boolean).join(' · '))
  const sourceOptions = computed(() => [{ value: 'live', label: t('collectorHistory.live') }, { value: 'stored', label: t('collectorHistory.stored') }])
  const periodOptions = computed(() => ['1m','5m','15m','1h','24h','custom'].map(value => ({ value, label: t(`collectorHistory.period.${value}`) })))
  const aggregateOptions = computed(() => ['raw','avg','min','max'].map(value => ({ value, label: t(`collectorHistory.aggregate.${value}`) })))
  const intervalOptions = computed(() => ['1m','5m','1h','1d','1w','1M'].map(value => ({ value, label: t(`collectorHistory.interval.${value}`) })))
  function remember() {
    if (!target.value) return
    preferences.delete(key()); preferences.set(key(), { source: source.value, view: view.value, period: period.value, range: range.value, aggregation: aggregation.value, interval: interval.value, indices: [...indices.value] })
    if (preferences.size > 10) preferences.delete(preferences.keys().next().value!)
  }
  function cancel() { ++revision; zoomQuery.cancel(); detailRequest?.abort(); queryRequest?.abort(); detailRequest = undefined; queryRequest = undefined; loading.value = loadingMore.value = false; detailsLoading.value = false }
  function close() { remember(); open.value = false; data.historyPointId.value = ''; cancel() }
  async function show(value: PointRow, trigger?: HTMLElement, asPreview = false) {
    if (value.id.startsWith('_new:') || !data.collector.value) return
    if (asPreview && open.value && !preview.value) return
    if (trigger) returnFocus = trigger
    remember(); cancel(); target.value = { ...value, collectorId: data.collector.value.id }; details.value = undefined; decodedType.value = undefined
    preview.value = asPreview
    rows.value = []; total.value = 0; error.value = ''; detailsError.value = ''; nextPage = 0; indexInput.value = 0; extent.value = selectedRange.value = undefined; expandedId.value = undefined
    const saved = preferences.get(key())
    source.value = saved?.source || 'live'; view.value = saved?.view || 'chart'; period.value = saved?.period || (asPreview ? '15m' : '1h'); range.value = saved?.range
    aggregation.value = saved?.aggregation || 'raw'; interval.value = saved?.interval || '1m'; indices.value = saved?.indices || [0]
    open.value = true; detailsLoading.value = true; data.historyPointId.value = value.id
    const request = new AbortController(), current = revision; detailRequest = request
    try {
      const existing = data.selectedPoint.value
      if (existing?.id === value.id) details.value = existing
      else {
        const response = await loadWorkspacePoint(target.value.collectorId!, value.id, request.signal)
        if (current !== revision || request.signal.aborted) return
        if (!response.success || !response.result?.[0]) throw new Error(t('collectorWorkspace.loadFailed'))
        details.value = response.result[0]
      }
      if (details.value.managedConfiguration?.codec) {
        const response = await getPointDataType(details.value.managedConfiguration.codec, request.signal)
        if (current !== revision || request.signal.aborted) return
        if (!response.success) throw new Error(t('collectorWorkspace.loadFailed'))
        decodedType.value = response.result?.dataType
      }
      if (!saved) source.value = stored.value ? 'stored' : 'live'
    } catch (cause) { if (current === revision && !request.signal.aborted) detailsError.value = message(cause) }
    finally {
      if (current === revision) { detailsLoading.value = false; detailRequest = undefined }
    }
  }
  function message(cause: unknown) { return cause instanceof Error ? cause.message : String(cause) }
  function timeRange(): [number, number] | undefined {
    if (period.value === 'custom') return range.value ? [range.value[0].valueOf(), range.value[1].valueOf()] : undefined
    const now = Date.now(), duration = period.value === '1m' ? 60_000 : period.value === '5m' ? 300_000 : period.value === '15m' ? 15 * 60_000 : period.value === '24h' ? 86400_000 : 3600_000
    return [now - duration, now]
  }
  async function query(append = false) {
    if (!open.value || !target.value || source.value !== 'stored' || detailsLoading.value) return
    if (append && (loading.value || loadingMore.value || !hasMore.value)) return
    queryRequest?.abort(); const request = new AbortController(), current = revision; queryRequest = request
    const times = selectedRange.value || extent.value
    const aggregating = effectiveAggregation.value !== 'raw'
    error.value = ''
    if (!append) { rows.value = []; total.value = 0; nextPage = 0; ended.value = false; expandedId.value = undefined }
    if (!times || !times.every(Number.isFinite) || times[0] >= times[1]) { error.value = t('collectorHistory.invalidTime'); loading.value = false; return }
    if (append) loadingMore.value = true
    else { loading.value = true; loadingMore.value = false }
    const terms = [{ column: 'pointId', value: target.value.id }, { column: 'timestamp', termType: 'btw', value: times }]
    try {
      if (!aggregating) {
        const response = await queryPointHistory(target.value.collectorId!, { pageIndex: nextPage, pageSize, sorts: [{ name: 'timestamp', order: 'desc' }, { name: 'id', order: 'desc' }], terms }, request.signal)
        if (request.signal.aborted || current !== revision) return
        if (!response.success || !Array.isArray(response.result?.data)) throw new Error(response.message || t('collectorWorkspace.loadFailed'))
        const incoming = storedPointSamples(response.result.data as StoredPointData[], dataType.value, parseJsonWithPrecision)
        const merged = new Map((append ? rows.value : []).map(row => [row.id, row]))
        const before = merged.size
        for (const row of incoming) merged.set(row.id, row)
        rows.value = [...merged.values()].sort((a, b) => a.timestamp - b.timestamp || a.id.localeCompare(b.id))
        ended.value = merged.size === before || response.result.data.length < pageSize
        ++nextPage
        total.value = Number(response.result.total || 0)
      } else {
        const response = await queryPointAggregation(target.value.collectorId!, {
          columns: [{ column: 'numberValue', alias: 'value', aggregation: aggregation.value }], filter: { terms }, limit: 500,
          groupByTime: { column: 'timestamp', alias: 'timestamp', interval: interval.value, format: "yyyy-MM-dd'T'HH:mm:ssXXX", timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone, fromTimestamp: times[0], toTimestamp: times[1] },
        }, request.signal)
        if (request.signal.aborted || current !== revision) return
        if (!response.success || !Array.isArray(response.result)) throw new Error(response.message || t('collectorWorkspace.loadFailed'))
        rows.value = response.result.map((row: Record<string, unknown>, index: number) => ({ id: `aggregate:${index}`, timestamp: typeof row.timestamp === 'number' ? row.timestamp : Date.parse(String(row.timestamp)), value: row.value })).filter((row: PointHistorySample) => Number.isFinite(row.timestamp))
        total.value = rows.value.length
      }
    } catch (cause) { if (!request.signal.aborted && current === revision) error.value = message(cause) }
    finally { if (queryRequest === request) { queryRequest = undefined; loading.value = loadingMore.value = false } }
  }
  async function fillChart() {
    while (chartActive.value && !loading.value && !loadingMore.value && !error.value && hasMore.value && rows.value.length < chartLimit) await query(true)
  }
  function refresh() {
    zoomQuery.cancel()
    if (source.value === 'live') { queryRequest?.abort(); queryRequest = undefined; loading.value = loadingMore.value = false; return }
    if (!selectedRange.value) extent.value = timeRange()
    void query().then(fillChart)
  }
  function loadMore() { void query(true) }
  function resetZoom() { selectedRange.value = undefined; refresh() }
  const zoomQuery = debounce((window: [number, number]) => {
    if (!chartActive.value) return
    selectedRange.value = window
    void query().then(fillChart)
  }, 180)
  function zoom(payload: unknown) {
    if (!chartActive.value || !extent.value || !payload || typeof payload !== 'object') return
    const event = payload as ZoomEvent, value = event.batch?.[0] || event, [from, to] = extent.value
    const start = Math.max(from, Math.round(value.startValue ?? from + (to - from) * (value.start ?? 0) / 100))
    const end = Math.min(to, Math.round(value.endValue ?? from + (to - from) * (value.end ?? 100) / 100))
    if (Number.isFinite(start) && Number.isFinite(end) && start < end) zoomQuery([start, end])
  }
  const chartEvents = { datazoom: zoom }
  function addIndex() { if (canAddIndex.value) indices.value = [...indices.value, indexInput.value!] }
  function removeIndex(value: number) { indices.value = indices.value.filter(index => index !== value) }
  function configure() { if (point.value) { pendingSettings = point.value; close() } }
  function hidePreview(trigger?: HTMLElement) { if (preview.value && returnFocus === trigger) close() }
  function expand() { preview.value = false }
  async function afterOpenChange(value: boolean) {
    if (value) return
    if (pendingSettings) { const value = pendingSettings; pendingSettings = undefined; editPoint(value) }
    else { await nextTick(); if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true }) }
  }
  watch([open, detailsLoading, source, period, range, aggregation, interval], () => { if (open.value && !detailsLoading.value) { selectedRange.value = undefined; refresh() } })
  watch([view, preview], () => { if (view.value !== 'chart') zoomQuery.cancel(); void fillChart() })
  watch(() => data.collector.value?.id, () => { if (open.value) close() })
  onDeactivated(() => { pendingSettings = undefined; close(); preferences.clear() })
  onBeforeUnmount(() => { cancel(); data.historyPointId.value = ''; preferences.clear() })
  const state = { open, preview, point, summary, stored, source, sourceOptions, view, period, periodOptions, range, aggregation, effectiveAggregation, aggregateOptions, interval, intervalOptions, detailsLoading, detailsError, loading, loadingMore, error, samples, tableRows, total, hasMore, loadMore, chartLimit, chartLimited, selectedRange, resetZoom, chartEvents, expandedId, kind, isArray, indices, indexInput, maxIndex, canAddIndex, addIndex, removeIndex, chartOption, chartData, buffer, recording, paused: data.historyPaused, streamError: data.valueError, pagePaused: data.paused, show, close, hidePreview, expand, configure, afterOpenChange, refresh, formatTime: (value: number) => dayjs(value).format('YYYY-MM-DD HH:mm:ss.SSS'), formatClock: (value: number) => dayjs(value).format('HH:mm:ss.SSS'), formatDate: (value: number) => dayjs(value).format('YYYY-MM-DD') }
  provide(POINT_HISTORY, state)
  return state
}
