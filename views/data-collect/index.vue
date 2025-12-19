<template>
  <j-page-container>
    <FullPage>
      <div class="collect-warp">
        <Left @change="onChange"/>
        <div class="right">
          <Right/>
        </div>
      </div>
    </FullPage>
  </j-page-container>
</template>

<script setup>
import Left from './Left/index.vue'
import Right from './Right.vue'
import {COLLECTOR_DATA, COLLECTOR_TYPE} from "@data-collector-ui/views/data-collect/data";

const current = ref({})
const type = ref('all')

provide(COLLECTOR_TYPE, type) // all/channel/collector
provide(COLLECTOR_DATA, current)

// 刷新页面
// 修改通道后刷新页面(新增通道, 编辑, 启用/禁用, 删除, 新增采集器, 导入, 详情页面操作后)
// 修改采集器后刷新页面(编辑, 启用/禁用, 删除, 导入, 详情页面操作后)

// 查询采集器和点位的数量(通过通道查询,通过采集器查询)
// 编辑通道,采集器,点位的信息后保存的方法

const onChange = (_type, row) => {
  type.value = _type || 'all'
  current.value = _type === 'all' ? {} : row
  console.log(_type, row)
}
</script>

<style lang="less" scoped>
.collect-warp {
  display: flex;
  height: 100%;
  padding: 24px;
  gap: 16px;
}

.right {
  flex: 1;
  min-width: 0;
  height: 100%;
}
</style>
