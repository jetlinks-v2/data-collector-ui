<script setup>
import { selectProps } from 'ant-design-vue/lib/select'
import { EventEmitter } from '@jetlinks-web/utils'

const props = defineProps({
  ...selectProps(),
  id: {
    type: String
  }
})

const options = ref([])

/**
 * 建立订阅
 */
EventEmitter.subscribe(props.id, (_options) => {
  options.value = _options
})

</script>

<template>
<a-select
  v-bind="props"
>
</a-select>
</template>

<style scoped lang="less">

</style>
