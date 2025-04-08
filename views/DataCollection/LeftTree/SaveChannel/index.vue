<template>
  <a-drawer
    visible
    :title="data?.id ? '编辑' : '新增'"
    width="40%"
  >
    <a-input-search placeholder="请输入名称"></a-input-search>
    <div v-for="item in data" :key="item.id">
      {{item.name}}
    </div>
  </a-drawer>
</template>

<script setup lang="ts">
import {PropType} from "vue";
import { getProviders } from '@collector/api/data-collect/channel';
import { useRequest } from '@jetlinks-web/hooks';
const props = defineProps({
  data: {
    type: Object as PropType<Record<string, any>>,
    default: () => {},
  }
})

const { data } = useRequest(getProviders);
</script>