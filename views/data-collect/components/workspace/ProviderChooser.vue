<template>
  <section>
    <div class="cw-between"><h2>{{ $t('collectorWorkspace.selectPlugin') }}</h2><a-button type="text" @click="$emit('cancel')"><AIcon type="ArrowLeftOutlined" />{{ $t('collectorWorkspace.back') }}</a-button></div>
    <div class="cw-plugins"><a-button v-for="provider in providers" :key="provider.id" @click="$emit('select', provider)"><WorkspaceIcon :object="{id:provider.id,name:provider.name,provider:provider.id,configuration:{}}" :size="24" />{{ provider.name || provider.id }}</a-button></div>
    <a-empty v-if="!providers.length" :description="$t('collectorWorkspace.noPlugins')" />
  </section>
</template>
<script setup lang="ts">
import type { ProviderDescriptor } from '../../../../types/workspace'
import WorkspaceIcon from './WorkspaceIcon.vue'
defineProps<{ providers: ProviderDescriptor[] }>()
defineEmits<{ select: [value: ProviderDescriptor]; cancel: [] }>()
</script>
