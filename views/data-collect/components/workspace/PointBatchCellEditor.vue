<template>
  <div ref="host" class="cw-batch-cell-editor" :class="{'is-compact':compact}" data-batch-editor @focusout="blur"><a-form ref="form" :model="model" @submit.prevent>
    <a-form-item name="value" :rules="rules" :help="''">
      <component :is="column.template!.components" v-bind="column.template?.props || {}" :value="model.value" :checked="column.template?.check ? model.value : undefined" :record="readonly(record)" :collector="collector ? readonly(collector) : undefined" @update:value="change" @update:checked="change" @change="change" />
    </a-form-item>
  </a-form></div>
</template>
<script setup lang="ts">
import { readonly } from 'vue'
import type { PointBatchPluginColumn } from '../../../../types/pointBatch'
import type { CollectorObject, PointRow } from '../../../../types/workspace'
import { usePointBatchCellEditor } from '../../hook/usePointBatchCellEditor'
const props=withDefaults(defineProps<{value:unknown;column:PointBatchPluginColumn;record:PointRow;collector?:CollectorObject;compact?:boolean}>(),{compact:true})
const emit=defineEmits<{'update:value':[value:unknown];commit:[]}>()
const {host,form,model,rules,change,blur,validate}=usePointBatchCellEditor(props,value=>emit('update:value',value),()=>emit('commit'))
defineExpose({validate})
</script>
<style scoped>
.cw-batch-cell-editor{min-width:0;width:100%}.cw-batch-cell-editor :deep(.ant-form-item){margin:0}.cw-batch-cell-editor.is-compact :deep(.ant-form-item-explain),.cw-batch-cell-editor.is-compact :deep(.ant-form-item-margin-offset){display:none}.cw-batch-cell-editor :deep(.ant-input),.cw-batch-cell-editor :deep(.ant-input-number),.cw-batch-cell-editor :deep(.ant-select){width:100%;font-size:12px}.cw-batch-cell-editor :deep(.ant-input){height:26px}
</style>
