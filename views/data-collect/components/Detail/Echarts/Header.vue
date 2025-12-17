<template>
  <div class="header">
    <div>{{title}}</div>
    <div>
      <JDashboardTimeSelect
          key="flow-static"
          :quickBtnList="[
              { label: $t('DashBoard.index.954313-6'), value: 'day' },
              { label: $t('DashBoard.index.954313-7'), value: 'week' },
              { label: '近一年', value: 'year' }
          ]"
          :type="'day'"
          @change="onChange"
      />
    </div>
  </div>
</template>

<script setup>
import {useI18n} from "vue-i18n";

const {t: $t} = useI18n();

const props = defineProps({
  title: {
    type: String,
    default: '点位历史数据'
  },
})
const emit = defineEmits(['change'])
const onChange = (val) => {
  emit('change', val)
}
</script>

<style lang="less" scoped>
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
