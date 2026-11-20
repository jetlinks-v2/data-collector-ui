<template>
  <a-modal v-model:open="state.open.value" :title="$t('collectorPointLookup.title')" :width="520" :footer="null" :destroy-on-close="true" :focus-trigger-after-close="!state.destination.value" :after-close="state.finishLocate">
    <a-input-search v-model:value="state.keyword.value" autofocus allow-clear :placeholder="$t('collectorPointLookup.placeholder')" :aria-label="$t('collectorPointLookup.placeholder')" :loading="state.loading.value" :disabled="state.locating.value" @search="state.search" />
    <a-alert v-if="state.error.value" type="error" show-icon :message="state.error.value" class="cw-lookup-feedback" />
    <a-spin :spinning="state.loading.value || state.locating.value">
      <div class="cw-lookup-results" :aria-label="$t('collectorPointLookup.title')">
        <button v-for="point in state.results.value" :key="point.id" type="button" class="cw-lookup-result" :disabled="state.locating.value" @click="state.choose(point)"><AIcon type="AimOutlined" /><span><strong>{{ point.name }}</strong><small>{{ state.collectorNames.value.get(point.collectorId || '') || point.collectorId }} · {{ point.pointKey || point.id }}</small></span><AIcon type="ArrowRightOutlined" /></button>
        <a-empty v-if="!state.results.value.length && !state.loading.value" :description="$t(state.keyword.value.trim() ? 'collectorPointLookup.empty' : 'collectorPointLookup.hint')" :image-style="{height:'48px'}" />
      </div>
    </a-spin>
    <small v-if="state.total.value > state.results.value.length" class="cw-lookup-hint">{{ $t('collectorPointLookup.more', {count:state.results.value.length,total:state.total.value}) }}</small>
  </a-modal>
</template>
<script setup lang="ts">
import type { useWorkspacePointLookup } from '../../hook/useWorkspacePointLookup'
defineProps<{state:ReturnType<typeof useWorkspacePointLookup>}>()
</script>
<style scoped>
.cw-lookup-feedback{margin-top:12px}.cw-lookup-results{margin-top:12px;min-height:128px;max-height:52vh;overflow:auto}.cw-lookup-result{display:flex;align-items:center;gap:12px;width:100%;padding:10px 8px;border:0;border-bottom:1px solid var(--ant-color-border-secondary,#f0f0f0);background:transparent;text-align:left;color:var(--ant-color-text,#262626);cursor:pointer;border-radius:4px}.cw-lookup-result:hover,.cw-lookup-result:focus-visible{background:var(--ant-color-primary-bg,#e6f4ff);outline:none}.cw-lookup-result>span:not(.anticon){flex:1;min-width:0}.cw-lookup-result strong,.cw-lookup-result small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px;font-weight:400}.cw-lookup-result small{font-size:12px;margin-top:2px;color:var(--ant-color-text-tertiary,#8c8c8c)}.cw-lookup-result>.anticon{color:var(--ant-color-text-tertiary,#8c8c8c)}.cw-lookup-hint{display:block;margin-top:12px;color:var(--ant-color-text-secondary,#595959);font-size:12px}
</style>
