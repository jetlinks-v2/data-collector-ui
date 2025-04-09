<template>
  <div>
    <div v-if="!visible" @click="onClick" class="_value">
      <j-ellipsis>{{data.description || '--'}}</j-ellipsis>
    </div>
    <a-input ref="inputRef" @blur="onBlur" v-else v-model:value="_value" :maxlength="200"/>
  </div>
</template>

<script setup>
import {updatePoint} from "@/modules/data-collector-ui/api/data-collect/collector";
import {onlyMessage} from "@jetlinks-web/utils";

const props = defineProps({
  data: {
    type: Object,
    default: () => ({})
  }
})
const emits = defineEmits(['refresh'])
const visible = ref(false)
const inputRef = ref()
const _value = ref(props.data.description)

const onClick = () => {
  visible.value = true
  setTimeout(() => {
    inputRef.value?.focus()
  }, 0);
}

const onBlur = async () => {
  // 保存
  if(props.data.description !== _value.value){
    const resp = await updatePoint(props.data.id, { ...props.data, description: _value.value })
    if(resp.success){
      emits('refresh')
      visible.value = false
      onlyMessage($t('Point.index.400149-14'), 'success');
    }
  } else {
    visible.value = false
  }
}
</script>

<style lang="less" scoped>
._value {
  cursor: pointer;
}
</style>
