<template>
  <a-form :model="formData" ref="formRef" layout="vertical">
    <AbnormalJudgment/>
    <DeadZone/>
    <template v-if="formData.accessModes?.includes('read') || formData.accessModes?.includes('subscribe')">
      <StorageConfiguration/>
    </template>
    <ResultProcessing/>
  </a-form>
</template>

<script setup lang="ts">
import DeadZone from '../../../Config/DeadZone.vue'
import ResultProcessing from '../../../Config/ResultProcessing.vue'
import StorageConfiguration from '../../../Config/StorageConfiguration.vue'
import AbnormalJudgment from '../../../Config/AbnormalJudgment.vue'
import { usePointDetailForm } from '../usePointDetailForm'
const { formData, formRef, flush, isDirty, discard } = usePointDetailForm()
defineExpose({ flush, isDirty, discard })
</script>
