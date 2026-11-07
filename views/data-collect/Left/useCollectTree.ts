import type { EventDataNode } from 'ant-design-vue/es/tree'
import { computed, onScopeDispose, ref, watch } from 'vue'
import { queryNoPaging } from '@data-collector-ui/api/data-collect/channel'
import { queryCollectorTree } from '@data-collector-ui/api/data-collect/collector'
import { useCollectContext, type CollectRecord, type ScopeType } from '../hook/context'
import { getChannelActions, getCollectorActions } from '../utils'

export interface CollectNode extends CollectRecord { id: string; key: string; name: string; isChannel: boolean; children?: CollectNode[] }
/** 树维护真实对象与选择映射，搜索结果由原始节点派生，不能修改原始 children。 */
export function useCollectTree(emit: (type: ScopeType, node: CollectRecord) => void) {
  const { state, ready } = useCollectContext()
  const channels = ref<CollectNode[]>([]), collectors = ref<CollectNode[]>([])
  const loading = ref(false), failed = ref(false)
  const expandedKeys = ref<string[]>([])
  const saveChannelVisible = ref(false), saveCollectorVisible = ref(false), filterModalVisible = ref(false)
  const currentChannel = ref<CollectRecord>({}), currentCollector = ref<CollectRecord>({})
  const collectorSearch = ref('')
  let revision = 0
  const filterActive = computed(() => Object.values(state.filters).some(value => Array.isArray(value) ? value.length : value))
  const tree = computed(() => channels.value.map(channel => ({
    ...channel, key: channel.id, isChannel: true,
    pointStateCount: collectors.value.filter(item => item.channelId === channel.id).reduce((counts, item) => ({
      running: counts.running + (item.pointStateCount?.running || 0),
      stopped: counts.stopped + (item.pointStateCount?.stopped || 0),
    }), { running: 0, stopped: 0 }),
    children: collectors.value.filter(item => item.channelId === channel.id).map(item => ({
      ...item, key: item.id, isChannel: false, channelName: channel.name, isLeaf: true,
    })),
  })))
  const filteredTree = computed(() => {
    const keyword = state.treeSearch.trim().toLowerCase()
    const f = state.filters
    return tree.value.flatMap(channel => {
      if (f.provider.length && !f.provider.includes(channel.provider || '')) return []
      if (f.state.length && !f.state.includes(channel.state?.value || '')) return []
      if (f.runningState.length && !f.runningState.includes(channel.runningState?.value || '') && !f.runningState.includes(channel.state?.value || '')) return []
      if (f.channel && channel.runningState?.value === 'running' && channel.state?.value !== 'disabled') return []
      const channelMatch = !keyword || channel.name.toLowerCase().includes(keyword)
      const children = channel.children.filter(child => {
        const states = f.collector ? ['disabled', 'stopped'] : f.collectorState
        return (channelMatch || child.name.toLowerCase().includes(keyword)) &&
          (!states.length || states.includes(child.state?.value || '') || states.includes(child.runningState?.value || ''))
      })
      return channelMatch || children.length ? [{ ...channel, children }] : []
    })
  })
  const filteredCollectors = computed(() => filteredTree.value.flatMap(channel =>
    state.scopeType === 'all' || state.scopeId === channel.id ||
    collectors.value.find(item => item.id === state.scopeId)?.channelId === channel.id ? channel.children : [],
  ).filter(item => item.name.toLowerCase().includes(collectorSearch.value.toLowerCase())))
  const totalPoints = computed(() => collectors.value.reduce((sum, item) =>
    sum + (item.pointNumber ?? ((item.pointStateCount?.running || 0) + (item.pointStateCount?.stopped || 0))), 0))
  const selectedKeys = computed(() => [state.scopeId || 'all'])
  function restoreSelection() {
    const row = state.scopeType === 'channel' ? channels.value.find(item => item.id === state.scopeId)
      : state.scopeType === 'collector' ? collectors.value.find(item => item.id === state.scopeId) : undefined
    if (row) {
      if (row.channelId && !expandedKeys.value.includes(row.channelId)) expandedKeys.value.push(row.channelId)
      emit(state.scopeType, row)
    } else {
      if (state.scopeType !== 'all') state.page = 1
      emit('all', {})
    }
  }
  const loadAllData = async () => {
    const version = ++revision
    loading.value = true
    failed.value = false
    try {
      const params = { paging: false, sorts: [{ name: 'createTime', order: 'desc' }] }
      const [channelResponse, collectorResponse] = await Promise.all([queryNoPaging(params), queryCollectorTree(params)])
      if (version !== revision) return
      if (!channelResponse.success || !collectorResponse.success) throw new Error('Collection tree unavailable')
      channels.value = channelResponse.result as CollectNode[]
      collectors.value = collectorResponse.result as CollectNode[]
      if (!ready.value) {
        const previous = sessionStorage.getItem('collector-patch-add-key')
        if (previous && !state.scopeId) { state.scopeType = 'collector'; state.scopeId = previous }
        sessionStorage.removeItem('collector-patch-add-key')
        expandedKeys.value = channels.value.map(item => item.id)
      }
      restoreSelection()
    } catch {
      if (version === revision) failed.value = true
    } finally {
      if (version === revision) loading.value = false
    }
  }
  function select(node: CollectNode | { id: 'all' }) {
    const type = node.id === 'all' ? 'all' : ('isChannel' in node && node.isChannel ? 'channel' : 'collector')
    state.page = 1
    emit(type, node)
  }
  function treeSelect(_keys: unknown, event: { node: EventDataNode }) {
    select((event.node.dataRef || event.node) as CollectNode)
  }
  function addChannel() { currentChannel.value = {}; saveChannelVisible.value = true }
  function channelAction(key: string, node: CollectRecord) {
    currentChannel.value = node
    if (key === 'update') saveChannelVisible.value = true
    else if (key === 'add-collector') { currentCollector.value = {}; saveCollectorVisible.value = true }
    else void loadAllData()
  }
  function collectorAction(key: string, node: CollectRecord) {
    if (key === 'update') {
      currentCollector.value = node
      currentChannel.value = channels.value.find(item => item.id === node.channelId) || {}
      saveCollectorVisible.value = true
    } else void loadAllData()
  }
  function filterSave(filters: Partial<typeof state.filters>) {
    Object.assign(state.filters, filters, { channel: false, collector: false, point: false })
    filterModalVisible.value = false
    select({ id: 'all' })
  }
  watch(() => [state.scopeType, state.scopeId], () => { if (ready.value && !loading.value) restoreSelection() })
  watch(() => state.treeSearch, () => { if (state.treeSearch) expandedKeys.value = filteredTree.value.map(item => item.id) })
  onScopeDispose(() => { revision++ })
  void loadAllData()
  return {
    state, channels, loading, failed, expandedKeys, selectedKeys, filteredTree, filteredCollectors, totalPoints,
    saveChannelVisible, saveCollectorVisible, filterModalVisible, currentChannel, currentCollector,
    collectorSearch, filterActive, loadAllData, select, treeSelect, addChannel, filterSave,
    channelActions: (node: CollectRecord) => getChannelActions(node, channelAction),
    collectorActions: (node: CollectRecord) => getCollectorActions(node, collectorAction),
  }
}
