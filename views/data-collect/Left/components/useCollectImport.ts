import { computed, inject, reactive, ref, watch } from 'vue'

import { collectorImport, collectorDownloadImportTemplate } from "@data-collector-ui/api/data-collect/collector";
import { channelImport, channelDownloadImportTemplate } from "@data-collector-ui/api/data-collect/channel";

import { useCollectorProvider } from "@data-collector-ui/hooks";
import { REFRESH_HANDLER } from "../../data";
import {useI18n} from "vue-i18n";

type CollectImportType = 'importChannel' | 'importCollector'

export function useCollectImport(props: { channelList?: any[] }) {
const {t: $t} = useI18n();

const { providers } = useCollectorProvider('data-collect/channel');

const refreshHandler = inject<{refreshAll: () => Promise<void>}>(REFRESH_HANDLER);
const formRef = ref<any>()
const form = reactive<{provider?: string; channelId?: string}>({
  provider: undefined,
  channelId: undefined
})
const activeKey = ref<CollectImportType>()
const importVisible = ref(false)




const providerChannelList = computed(() => {
  return props.channelList?.filter(item => item.provider === form.provider) || []
})

const showUpload = computed(() => {
  if(activeKey.value === 'importCollector') {
    return !!form.channelId && !!form.provider
  } else {
    return !!form.provider
  }
})

const openImport = (type: CollectImportType) => {
  activeKey.value = type;
  importVisible.value = true;
}

const handleImportSuccess = async () => {
  await refreshHandler?.refreshAll?.()
}

watch(() => importVisible.value, (newValue) => {
  if(!newValue) {
    formRef.value?.resetFields()
  }
})

return { $t, form, formRef, activeKey, importVisible, providers, providerChannelList, showUpload,
  openImport, handleImportSuccess, channelDownloadImportTemplate, collectorDownloadImportTemplate, channelImport, collectorImport }
}
