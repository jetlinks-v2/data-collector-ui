<template>
  <span class="sorts-icon">
    <AIcon type="CaretUpOutlined" :class="{'active': value === 'asc'}" />
    <AIcon style="margin-top: -4px" type="CaretDownOutlined" :class="{'active': value === 'desc'}" />
  </span>
</template>

<script setup>
const props = defineProps({
  value: {
    type: String,
    default: 'asc',
  }
})
</script>

<style lang="less" scoped>
.sorts-icon {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.29);

  .active {
    color: @primary-color;
  }
}
</style>
