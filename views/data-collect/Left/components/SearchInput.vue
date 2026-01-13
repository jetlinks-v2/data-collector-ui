<template>
  <div class="search-input-container">
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
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, watch } from 'vue';
import {useI18n} from "vue-i18n";

const {t: $t} = useI18n();

interface Props {
  modelValue?: string;
}

interface Emits {
  (e: 'update:modelValue', value: string): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const searchValue = ref(props.modelValue || '');
const isSearchMode = ref(false);
const searchInputRef = ref();

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
    // 回车时可以进行搜索逻辑（如果有需要的话）
  }
}
</script>

<style scoped lang="less">
.search-input-container {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 8px;

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