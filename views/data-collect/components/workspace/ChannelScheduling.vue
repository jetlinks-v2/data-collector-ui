<template>
  <a-form-item :label="$t('collectorScheduling.allowed')" class="cw-channel-scheduling">
    <a-spin :spinning="loading">
      <ConditionFilter v-model="terms" :fields="fields" :placeholder="$t('collectorScheduling.unrestricted')" :disabled="disabled" />
    </a-spin>
    <a-alert v-if="error" type="warning" :message="error" show-icon>
      <template #action><a-button type="link" size="small" @click="load">{{ $t('collectorWorkspace.retry') }}</a-button></template>
    </a-alert>
    <small>{{ $t('collectorScheduling.hint') }}</small>
    <small v-if="!loading && !error && !nodes.length">{{ $t('collectorScheduling.noNodes') }}</small>
  </a-form-item>
</template>
<script setup lang="ts">
import ConditionFilter from '@jetlinks-web-core/components/ConditionFilter'
import type { CollectorObject } from '../../../../types/workspace'
import { useChannelScheduling } from '../../hook/useChannelScheduling'
const props=defineProps<{model:CollectorObject;disabled?:boolean}>()
const {terms,fields,nodes,loading,error,load}=useChannelScheduling(()=>props.model)
</script>
<style scoped>
.cw-channel-scheduling small { display:block;margin-top:6px;color:var(--jet-theme-text-secondary,var(--cw-muted));font-size:12px }
</style>
