<template>
  <IconValueView v-if="object?.icon" :value="object.icon" :size="size" :fallback-text="object.name" />
  <svg v-else class="cw-glyph" :width="size" :height="size" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path :d="path" />
  </svg>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import { IconValueView } from '@jetlinks-web-core/components/IconValue'
import type { CollectorObject } from '../../../../types/workspace'
const props = withDefaults(defineProps<{ object?: CollectorObject; kind?: 'point' | 'provider'; name?: string; size?: number }>(), { size: 20, kind: 'provider' })
const paths: Record<string, string> = {
  diagnostic: 'M4 7V4h3m10 0h3v3m0 10v3h-3M7 20H4v-3m3-5h10',
  menu: 'M3 4h18M10 9h11M10 15h11M3 20h18M3 8l5 4-5 4Z',
  tcp: 'm15 20 3-3h2a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h2l3 3ZM6 8v1m4-1v1m4-1v1m4-1v1',
  rtu: 'M17 19h4v-5h-4ZM19 14V6.5a3.5 3.5 0 0 0-7 0v11a3.5 3.5 0 0 1-7 0V10M3 5h4v5H3ZM3 3v2m4-2v2m10 14v2m4-2v2',
  opc: 'M3 3h8v8H3ZM7 11v4a2 2 0 0 0 2 2h4m0-4h8v8h-8Z',
  cpu: 'M4 4h16v16H4Zm4 4h8v8H8ZM7 2v2m5-2v2m5-2v2M7 20v2m5-2v2m5-2v2M2 7h2m-2 5h2m-2 5h2m16-10h2m-2 5h2m-2 5h2',
  building: 'M6 21V3h12v18M2 21V10h4m12-3h4v14M10 8h4m-4 4h4m-4 9v-4h4v4',
  pole: 'M12 2v20M2 5h20M3 3v2m4-2v2m10-2v2m4-2v2m-2 0-7 7-7-7',
  flask: 'M9 2h6m-5 0v7L4 19a2 2 0 0 0 2 3h12a2 2 0 0 0 2-3L14 9V2M7 15h10',
  temperature: 'M10 15V5a2 2 0 0 1 4 0v10a4 4 0 1 1-4 0m2-5v8',
  pressure: 'M4 18a9 9 0 1 1 16 0M12 13l4-6M5 13h1m1-6 1 1m4-4v1m6 8h1M6 20h12',
  flow: 'M2 7h14a3 3 0 1 0-3-3M2 12h17a3 3 0 1 1-3 3M2 17h7',
  power: 'm13 2-9 12h7l-1 8 10-12h-8Z',
  current: 'M4 5h16v14H4Zm4 10 4-7 4 7m-6-3h4',
  state: 'M12 2v10M6 5a9 9 0 1 0 12 0',
  alarm: 'M5 16h14l-2-3V8a5 5 0 0 0-10 0v5Zm5 4h4M12 1v2',
  text: 'M4 5h16M12 5v15M8 20h8',
  grid: 'M3 3h7v7H3Zm11 0h7v7h-7ZM3 14h7v7H3Zm11 0h7v7h-7Z',
}
const providerGlyphs: Record<string, string> = { modbus_tcp: 'tcp', modbus_rtu: 'rtu', opc_ua: 'opc', s7: 'cpu', snap7: 'cpu', bacnetip: 'building', iec104: 'pole', virtual: 'flask' }
const semantics: Array<[string, RegExp]> = [
  ['alarm', /报警|告警|故障|\b(alarm|fault|trip)\b/i], ['temperature', /温度|水温|油温|\b(temp|temperature)\b/i],
  ['pressure', /压力|压强|\b(pressure|press)\b/i], ['flow', /流量|流速|\b(flow|flowrate)\b/i],
  ['current', /电流|\b(current|ampere)\b/i], ['power', /电压|功率|电能|\b(voltage|power|energy)\b/i],
  ['state', /状态|运行|就绪|\b(status|state|running|ready)\b/i],
]
const path = computed(() => {
  if (props.name) return paths[props.name] || paths.grid
  if (props.kind !== 'point') return paths[providerGlyphs[props.object?.provider?.toLowerCase() || '']] || paths.opc
  // Name takes precedence over a technical identifier; normalize camelCase and separators.
  for (const value of [props.object?.name, props.object?.pointKey]) {
    const words = (value || '').normalize('NFKC').replace(/([a-z\d])([A-Z])/g, '$1 $2').replace(/[_\-.:/]/g, ' ')
    const matched = semantics.find(([, pattern]) => pattern.test(words))
    if (matched) return paths[matched[0]]
  }
  return paths.grid
})
</script>
