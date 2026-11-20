<template>
  <aside v-if="notice" class="cw-runtime-failure" :class="notice.active ? 'bad' : 'warn'">
    <AIcon type="WarningOutlined" />
    <div><header><strong>{{ $t(notice.active ? 'collectorRuntimeNotice.current' : 'collectorRuntimeNotice.recent') }}</strong><time v-if="notice.failure.timestamp > 0" :title="time.full">{{ time.short }}</time></header>
      <p>{{ reason }}</p><small><template v-if="stage">{{ stage }} · </template>0x{{ code }}</small>
    </div>
  </aside>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import dayjs from 'dayjs'
import type { CollectorObject } from '../../../../types/workspace'
import { runtimeFailureNotice, runtimeFailureReason } from '../../../../utils/runtimePresentation'
const props = defineProps<{ object: CollectorObject; attentionOnly?:boolean }>()
const { t, te } = useI18n()
const notice = computed(() => runtimeFailureNotice(props.object,!props.attentionOnly))
const reason = computed(() => runtimeFailureReason(notice.value?.failure.reason, t, te))
const stage = computed(() => {
  const key = `collectorRuntime.stages.${notice.value?.failure.stage}`
  return te(key) ? t(key) : ''
})
const code = computed(() => ((notice.value?.failure.code || 0) >>> 0).toString(16).toUpperCase())
const time = computed(() => ({ short: dayjs(notice.value?.failure.timestamp).format('HH:mm:ss'), full: dayjs(notice.value?.failure.timestamp).format('YYYY-MM-DD HH:mm:ss') }))
</script>
