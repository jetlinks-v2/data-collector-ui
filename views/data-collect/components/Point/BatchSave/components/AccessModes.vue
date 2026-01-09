<script setup>
import { selectProps } from 'ant-design-vue/lib/select'
import { EventEmitter } from '@jetlinks-web/utils'

const props = defineProps({
  ...selectProps(),
  subscribeId: {
    type: String
  },
  parseKey: {
    type: String,
    default: 'accessModes'
  }
})

const options = ref([])

/**
 * 建立订阅
 */
EventEmitter.subscribe([props.subscribeId], (result) => {
  options.value = result[props.parseKey]
})

</script>

<template>
<a-select
  v-bind="props"
  :options="options"
>
</a-select>
</template>

<style scoped lang="less">

</style>
