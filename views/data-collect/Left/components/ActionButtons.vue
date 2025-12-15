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
          placeholder="请输入搜索内容"
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
      <j-permission-button type="text" shape="circle">
        <AIcon type="MoreOutlined"></AIcon>
      </j-permission-button>
    </a-space>
  </a-flex>
</template>

<script setup lang="ts">
import { ref, nextTick, watch } from 'vue';

interface Props {
  modelValue?: string;
}

interface Emits {
  (e: 'update:modelValue', value: string): void;
  (e: 'add'): void;
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
    // 回车时可以���行搜索逻辑（如果有需要的话）
  }
}

//新增按钮点击
const handleAdd = () => {
  emit('add');
}
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