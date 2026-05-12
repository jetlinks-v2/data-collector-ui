<template>
  <div class="from-page">
    <a-input
      v-if="inputType === 'String'"
      v-model:value="dataValue"
      @change="updateData"
      :maxlength="64"
      autocomplete="off"
      :placeholder="$t('Virtual.TypeForm.400159-0')"
    />
    <a-input-number
      v-else-if="inputType === 'Number'"
      style="width: 100%"
      v-model:value="dataValue"
      @change="updateData"
      :placeholder="$t('Virtual.TypeForm.400159-0')"
      :controls="false"
      maxLength="20"
    />
    <a-date-picker
      v-else-if="inputType === 'DateTime' || inputType === 'Date'"
      showTime
      value-format="YYYY-MM-DD HH:mm:ss"
      v-model:value="dataValue"
      @change="updateData"
      :placeholder="$t('DataCollect.index.400156-20')"
      style="width: 100%"
    />
    <!-- 时间 -->
    <a-time-picker
      v-else-if="inputType === 'Time'"
      showTime
      value-format="HH:mm:ss"
      @change="updateData"
      v-model:value="dataValue"
      :placeholder="$t('DataCollect.index.400156-20')"
      style="width: 100%"
    />
    <!-- Boolean -->
    <a-select
      v-else-if="inputType === 'Boolean'"
      ref="select"
      v-model:value="dataValue"
      @change="updateData"
      style="width: 100%"
      :placeholder="$t('DataCollect.index.400156-20')"
    >
      <a-select-option :value="true">{{ $t('DataCollect.index.400156-18') }}</a-select-option>
      <a-select-option :value="false">{{ $t('DataCollect.index.400156-19') }}</a-select-option>
    </a-select>
  </div>
</template>
<script setup>
import {useI18n} from 'vue-i18n';

const {t: $t} = useI18n();

const props = defineProps({
  value: {
    type: [String, Number, Boolean, Date, undefined],
    default: undefined,
  },
  inputType: {
    type: String,
    default: "",
  },
});
const dataValue = ref();

const emits = defineEmits(["update:value", "change"]);

const updateData = () => {
  emits("update:value", dataValue.value);
};

watch(
  () => props.value,
  (val) => {
    dataValue.value = val;
  },
  { immediate: true }
);
</script>
<style scoped lang="less"></style>
