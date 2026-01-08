<template>
  <div class="header">
    <div>{{ title }}</div>
    <div v-if="showTimeSelect">
      <JDashboardTimeSelect
          key="flow-static"
          :quickBtnList="[
              { label: $t('components.Card.772454-1'), value: 'hour' },
              { label: $t('components.Card.772454-2'), value: 'today' },
              { label: $t('components.Card.772454-3'), value: 'week' }
          ]"
          type="hour"
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
  showTimeSelect: {
    type: Boolean,
    default: true
  }
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
