import { inject, ref, reactive, computed, watch, onScopeDispose, type Ref } from 'vue'
import type { CollectRecord } from '../hook/context'

import {
  ChannelState,
  COLLECTOR_DATA,
  COLLECTOR_TYPE,
  getState, REFRESH_HANDLER,
} from "@data-collector-ui/views/data-collect/data";
import {getCountList} from "@data-collector-ui/views/data-collect/utils";
import {useI18n} from "vue-i18n";
import { useCollectContext } from '../hook/context'


export function useCollectHeader() {
const {t: $t} = useI18n();
const context = useCollectContext()

const refreshHandler = inject<any>(REFRESH_HANDLER)
const type = inject(COLLECTOR_TYPE, ref('all'))
const data = inject<Ref<CollectRecord>>(COLLECTOR_DATA, ref({}))
const filterValue = inject<any>('filter-value', reactive({
  channel: false,
  collector: false,
  point: false,
  provider: [],
  runningState: [],
  state: [],
  collectorState: []
}))

const visible = inject<any>('detail-visible')


const title = computed(() => {
  if (type.value === 'all') {
    return $t('PointWorkspace.allPoints')
  } else {
    return data.value?.name || "--"
  }
})

const countList = ref<any[]>([]);
const getActive = (itemType: string) => {
  return !!filterValue[itemType]
}

const onClick = (item: any) => {
  context.state.page = 1
  Object.keys(filterValue).forEach(i => {
    if(['channel', 'collector', 'point'].includes(i)){
      filterValue[i] = item.type === i ? !filterValue[item.type] : false
    }
  })
}

const onRefresh = () => {
  refreshHandler?.refreshAll?.()
}

const onDetail = () => {
  visible.point = false
  if (type.value === 'channel') {
    visible.channel = true
    visible.collector = false
  } else if (type.value === 'collector') {
    visible.channel = false
    visible.collector = true
  }
}

let revision = 0
const loadData = async () => {
  const version = ++revision
  try {
    const result = await getCountList(type.value || 'all', data.value.id || '', true, filterValue)
    if (version === revision) countList.value = result
  } catch {
    if (version === revision) countList.value = []
  }
}
onScopeDispose(() => { revision++ })
watch(() => [
  type.value,
  data.value.id,
  filterValue.channel,
  filterValue.collector,
  filterValue.point,
  filterValue.provider,
  filterValue.runningState,
  filterValue.state,
  filterValue.collectorState,
], () => {
  loadData()
}, {
  immediate: true,
  deep: true
})



return { $t, title, type, data, visible, countList, getActive, onClick, onDetail, onRefresh, loadData, getState, ChannelState }
}
