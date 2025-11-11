<template>
  <div class="from-page">
    <a-input
      v-if="inputType === 'String'"
      v-model:value="dataValue"
      @change="updateData"
      :maxlength="64"
      autocomplete="off"
      placeholder="请输入值"
    />
    <a-input-number
      v-else-if="inputType === 'Number'"
      style="width: 100%"
      v-model:value="dataValue"
      @change="updateData"
      placeholder="请输入值"
      :controls="false"
      maxLength="20"
    />
    <a-date-picker
      v-else-if="inputType === 'DateTime' || inputType === 'Date'"
      showTime
      value-format="YYYY-MM-DD HH:mm:ss"
      v-model:value="dataValue"
      @change="updateData"
      placeholder="请选择"
      style="width: 100%"
    />
    <!-- 时间 -->
    <a-time-picker
      v-else-if="inputType === 'Time'"
      showTime
      value-format="HH:mm:ss"
      @change="updateData"
      v-model:value="dataValue"
      placeholder="请选择"
      style="width: 100%"
    />
    <!-- Boolean -->
    <a-select
      v-else-if="inputType === 'Boolean'"
      ref="select"
      v-model:value="dataValue"
      @change="updateData"
      style="width: 100%"
      placeholder="请选择"
    >
      <a-select-option :value="true">是</a-select-option>
      <a-select-option :value="false">否</a-select-option>
    </a-select>
  </div>
</template>
<script setup>
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
