<template>
  <a-input-search style="width: 50%;" :placeholder="$t('DataCollection.LeftTree.SaveChannel.Provider.594410-1')" @search="handleSearch"></a-input-search>
  <div v-for="item in filterOptions" :key="item.id" :class="{'provider-item': true, active: item.id === value}" @click="handleChooseProvider(item.id)">
    <img v-if="ImageMap.get(item.id)" :src="ImageMap.get(item.id)" alt="">
    <div v-else class="no-image"></div>
    <div>
      <p>
        {{item.name}}
      </p>
      <p>{{ $t('DataCollection.LeftTree.SaveChannel.Provider.594410-0', [item.name]) }}</p>
    </div>
  </div>
  <div style="margin: 40% 0">
    <j-empty v-if="!filterOptions.length"></j-empty>
  </div>
</template>

<script setup lang="ts">
import { ImageMap } from '../type';
import {PropType} from "vue";

const props = defineProps({
  value: {
    type: String,
    default: ''
  },
  options: {
    type: Array as PropType<Record<string, any>[]>,
    default: () => ([])
  }
})
const emits = defineEmits(['update:value', 'change']);
const searchValue = ref('');

const filterOptions = computed(() => {
  return props.options?.filter(item => {
    return item.name.includes(searchValue.value)
  })
})

const handleChooseProvider = (val: string) => {
  emits('update:value', val);
  emits('change')
};

const handleSearch = (val: string) => {
  searchValue.value = val;
};
</script>

<style lang="less" scoped>
.provider-item {
  border: 1px solid #e8e8e8;
  padding: 10px;
  border-radius: 5px;
  width: 100%;
  margin-top: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
  &.active {
    border: 1px solid #409eff;
  }
  img {
    width: 80px;
    height: 80px;
  }
  .no-image {
    width: 80px;
    height: 80px;
    background: #e8e8e8
  }
}
</style>