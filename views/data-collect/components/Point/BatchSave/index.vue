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
        <div class="batch-add-content">
          <RenderComponents v-if="jsonData" :value="jsonData" ref="pointBatchRef"/>
        </div>
        <div>
          <a-button type="primary" @click="handleSave">
            保存
          </a-button>
        </div>
      </div>
    </full-page>
  </j-page-container>
</template>

<script setup>
import { detail, savePointBatch } from '@data-collector-ui/api/data-collect/collector'
import {useI18n} from "vue-i18n";
import {devGetProtocol} from "@data-collector-ui/utils/utils";
import RenderComponents from "@data-collector-ui/components/RenderComponents/RenderComponents.vue";
import { onlyMessage } from '@jetlinks-web/utils'
import { omit } from 'lodash-es'

const {t: $t} = useI18n();
const route = useRoute();
const collector = ref({})
const jsonData = ref()
const pointBatchRef = ref()

provide('point-batch-collector-data', collector)
const getPointBatch = async (val) => {
  jsonData.value = await devGetProtocol(val, "pointBatch");
};

const handleSave = async () => {
  // 保存数据
  const resp = await pointBatchRef.value?.onSave?.()
  if (resp) {
    savePointBatch(resp.map(item => omit(item, ['__dataIndex', '__serial', 'sames', 'id']))).then((r) => {
      if (r.success) {
        onlyMessage('操作成功')

      }
    })
  }
  console.log(pointBatchRef.value, resp, 'resp')
}

const getDetail = async (id) => {
  const res = await detail(id);
  if (res.success) {
    collector.value = res.result;
    await getPointBatch(collector.value.provider || 'OPC_UA')
  }
}

watch(() => route.params.id, (val) => {
  if (val) {
    getDetail(val)
  }
}, {immediate: true})
</script>

<style lang="less" scoped>
.batch-add-box {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;

  .batch-add-content {
    min-height: 0;
    flex: 1;
    overflow-y: auto;
  }
}
</style>
