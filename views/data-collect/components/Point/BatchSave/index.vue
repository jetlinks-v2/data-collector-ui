<template>
  <j-page-container :showBack="true">
    <template #title>
      <div style="display: flex; align-items: center; gap: 16px">
        <j-ellipsis>
          {{ collector.name }}
        </j-ellipsis>
        <a-tag>{{ collector.provider }}</a-tag>
        <a-tag>{{ collector.id }}</a-tag>
      </div>
    </template>
    <full-page>
      <div class="batch-add-box">
        123
      </div>
    </full-page>
  </j-page-container>
</template>

<script setup>
// 查询采集器
import {detail} from "@data-collector-ui/api/data-collect/collector";

const route = useRoute();
const collector = ref({})
const getDetail = async (id) => {
  const res = await detail(id);
  if(res.success) {
    collector.value = res.result;
  }
}

// 通用字段+ 协议特定字段 + 其余配置/操作列

watch(() => route.params.id, (val) => {
  if(val) {
    getDetail(val)
  }
}, {immediate: true})
</script>

<style lang="less" scoped>
.batch-add-box {
  padding: 24px;
}
</style>
