<template>
  <a-flex style="width: 100%;margin-bottom: 8px;" justify="flex-end">
    <a-space>
      <div class="search-input-wrapper" :class="{ expanded: isSearchMode }">
        <a-button
          v-if="!isSearchMode"
          type="text"
          shape="circle"
          @click="handleSearchClick"
        >
          <AIcon type="SearchOutlined"/>
        </a-button>
        <a-input
          v-else
          ref="searchInputRef"
          allow-clear
          v-model:value="searchValue"
          class="search-input"
          :placeholder="$t('DataCollect.index.400150-10')"
          @blur="handleSearchBlur"
          @keyup.enter="handleSearchEnter"
        >
          <template #prefix>
            <AIcon type="SearchOutlined"/>
          </template>
        </a-input>
      </div>
      <j-permission-button type="text" shape="circle" @click="handleAdd">
        <AIcon type="PlusOutlined"></AIcon>
      </j-permission-button>
      <a-dropdown>
        <template #overlay>
          <a-menu @click="handleMenuClick">
            <a-menu-item key="importChannel">
              <a-space>
                <AIcon type="ImportOutlined"/>
                {{ $t('DataCollect.index.400150-11') }}
              </a-space>
            </a-menu-item>
            <a-menu-item key="importCollector">
              <a-space>
                <AIcon type="ImportOutlined"/>
                {{ $t('DataCollect.index.400150-12') }}
              </a-space>
            </a-menu-item>
          </a-menu>
        </template>
        <j-permission-button type="text" shape="circle">
          <AIcon type="MoreOutlined"></AIcon>
        </j-permission-button>
      </a-dropdown>
    </a-space>
  </a-flex>
  <Import
    v-if="importVisible"
    :title="activeKey === 'importChannel' ? $t('DataCollect.index.400150-11') : $t('DataCollect.index.400150-12')"
    :download-url-builder="activeKey === 'importChannel' ? (format) => channelDownloadImportTemplate(form.provider, format) : (format) => collectorDownloadImportTemplate(form.provider, format)"
    :show-upload="showUpload"
    :request="activeKey === 'importChannel' ? () => channelImport(form.provider) : () => collectorImport(form.channelId, form.provider)"
    @close="importVisible = false"
    @save="handleImportSuccess"
  >
    <template #content>
      <a-form :model="form" layout="vertical" ref="formRef">
        <a-form-item :label="$t('DataCollect.index.400150-13')" name="provider" required>
          <a-select v-model:value="form.provider" :options="providers" :field-names="{label: 'name', value: 'id'}" :placeholder="$t('DataCollect.index.400150-14')"></a-select>
        </a-form-item>
        <a-form-item v-if="activeKey === 'importCollector'" :label="$t('DataCollect.index.400150-15')" name="channelId" required>
          <a-select v-model:value="form.channelId" :options="providerChannelList" :field-names="{label: 'name', value: 'id'}" :placeholder="$t('DataCollect.index.400150-16')"></a-select>
        </a-form-item>
      </a-form>
    </template>
  </Import>
</template>

<script setup lang="ts">
import { collectorImport, collectorDownloadImportTemplate } from "@data-collector-ui/api/data-collect/collector";
import { channelImport, channelDownloadImportTemplate } from "@data-collector-ui/api/data-collect/channel";
import Import from '../../components/Import/index.vue';
import { useCollectorProvider } from "@data-collector-ui/hooks";
import { REFRESH_HANDLER } from "../../data";
import {useI18n} from "vue-i18n";

const {t: $t} = useI18n();
interface Props {
  modelValue?: string;
  channelList?: any[];
}

interface Emits {
  (e: 'update:modelValue', value: string): void;
  (e: 'add'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();
const { providers } = useCollectorProvider('data-collect/channel');

const refreshHandler = inject(REFRESH_HANDLER);
const formRef = ref()
const form = reactive({
  provider: undefined,
  channelId: undefined
})
const activeKey = ref<'importChannel' | 'importCollector' | undefined>()
const importVisible = ref(false)
const searchValue = ref(props.modelValue || '');
const isSearchMode = ref(props.modelValue ? true : false);
const searchInputRef = ref();

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

// 监听外部 modelValue 变化
watch(() => props.modelValue, (newValue) => {
  searchValue.value = newValue || '';
  isSearchMode.value = newValue ? true : false;
});

// 向外发送更新
watch(searchValue, (newValue) => {
  emit('update:modelValue', newValue);
});

//点击搜索按钮
const handleSearchClick = () => {
  isSearchMode.value = true;
  nextTick(() => {
    searchInputRef.value?.focus();
  });
}

//搜索输入框失焦
const handleSearchBlur = () => {
  if (!searchValue.value.trim()) {
    isSearchMode.value = false;
  }
}

//搜索输入框回车
const handleSearchEnter = () => {
  if (searchValue.value.trim()) {
    // 回车时可以���行搜索逻辑（如果有需要的话）
  }
}

//新增按钮点击
const handleAdd = () => {
  emit('add');
}

const handleMenuClick = (e: any) => {
  activeKey.value = e.key;
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
</script>

<style scoped lang="less">
.search-input-wrapper {
  position: relative;
  width: 32px;
  overflow: hidden;
  transition: width 0.3s ease-in-out;
  &.expanded {
    width: 200px;
  }

  .search-input {
    width: 100%;
    animation: expandWidth 0.3s ease-in-out forwards;
  }
}

@keyframes expandWidth {
  from {
    width: 0;
    opacity: 0;
  }
  to {
    width: 100%;
    opacity: 1;
  }
}
</style>