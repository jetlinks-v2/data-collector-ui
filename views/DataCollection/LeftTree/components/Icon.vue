<template>
  <AIcon :type="type" scriptUrl="//at.alicdn.com/t/c/font_4697576_rt4hxxozpo.js"></AIcon>
</template>

<script setup lang="ts">
const props = defineProps({
  type: {
    type: String,
  }
})
</script>