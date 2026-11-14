<template>
  <AIcon :type="type"/>
</template>

<script setup>

defineOptions({ name: 'BatchIcon' })

defineProps({
  type: {
    type: String
  }
})
</script>

<style scoped>

</style>
