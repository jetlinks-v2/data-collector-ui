<template>
  <section class="cw-signal-guide" :aria-label="$t('collectorSignalGuide.title')">
    <a-skeleton v-if="loading" active :paragraph="{rows:4}" />
    <div v-else-if="error || !documentation" class="cw-guide-empty"><AIcon type="InfoCircleOutlined" /><span>{{ $t(error ? 'collectorSignalGuide.loadFailed' : 'collectorSignalGuide.unavailable') }}</span><a-button v-if="error" size="small" type="link" @click="$emit('retry')">{{ $t('collectorWorkspace.retry') }}</a-button></div>
    <template v-else>
    <header><strong>{{ documentation.name }}</strong><span v-if="example">{{ $t('collectorSignalGuide.example') }}<LatexView v-if="example.parameters" :latex="example.parameters" /></span></header>
    <p>{{ documentation.description }}</p>
    <svg v-if="example" viewBox="0 0 348 158" role="img" :aria-label="$t('collectorSignalGuide.chart')">
      <g v-for="(track, index) in tracks" :key="track.id" :class="track.id">
        <text x="0" :y="12 + index * 66" class="cw-guide-caption">{{ $t('collectorSignalGuide.' + track.id) }}</text>
        <text x="45" :y="26 + index * 66" text-anchor="end">{{ track.maximum }}</text>
        <text x="45" :y="60 + index * 66" text-anchor="end">{{ track.minimum }}</text>
        <path :d="'M54 ' + (60 + index * 66) + ' H338'" class="cw-guide-axis" />
        <path :d="track.path" class="cw-guide-series" />
        <g v-for="point in track.points" :key="point.time">
          <title>{{ point.time / 1000 }} s · {{ point.value == null ? $t('collectorSignalGuide.ignored') : point.value }}</title>
          <circle v-if="point.value != null" :cx="point.x" :cy="point.y" r="2.5" />
          <path v-else :d="'M' + (point.x - 3) + ' ' + (point.y - 3) + ' l6 6 m0 -6 l-6 6'" class="cw-guide-skipped" />
        </g>
      </g>
      <text x="54" y="145">0</text><text x="338" y="145" text-anchor="end">{{ example.samples.at(-1)!.offsetMillis / 1000 }} s</text>
    </svg>
    <div v-if="example" class="cw-guide-legend"><span><i class="before" />{{ $t('collectorSignalGuide.before') }}</span><span><i class="after" />{{ $t('collectorSignalGuide.after') }}</span><span v-if="example.samples.some(sample=>!sample.accepted)"><b>×</b>{{ $t('collectorSignalGuide.ignored') }}</span><small v-if="booleanOutput">{{ $t('collectorSignalGuide.booleanValues') }}</small></div>
    <div v-if="documentation.formula" class="cw-guide-formula"><small>{{ $t('collectorSignalGuide.formula') }}</small><LatexView :latex="documentation.formula" /><dl><div v-for="symbol in documentation.symbols" :key="symbol.symbol"><dt><LatexView :latex="symbol.symbol" /></dt><dd>{{ symbol.description }}</dd></div></dl></div>
    <footer v-if="example">{{ $t('collectorSignalGuide.note') }}</footer>
    </template>
  </section>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import { LatexView } from '@jetlinks-web-core/components/Expression'
import type { ProcessorDocumentation } from '../../../../types/processorDocumentation'

const props=defineProps<{documentation?:ProcessorDocumentation;loading:boolean;error:boolean}>()
defineEmits<{ retry:[] }>()
const documentation=computed(()=>props.documentation)
const example=computed(()=>documentation.value?.examples.find(value=>value.samples.length>1))
const booleanOutput=computed(()=>example.value?.samples.some(sample=>sample.accepted && typeof sample.output === 'boolean'))
const tracks=computed(()=>['before','after'].map((id,index)=>{
  if(!example.value)return {id,minimum:0,maximum:0,points:[],path:''}
  const source=example.value.samples.map(sample=>index ? sample.accepted ? sample.output : null : sample.input)
  const values=source.filter(value=>value != null).map(Number)
  // Each labelled track owns its scale: a conversion may change the unit or magnitude.
  const domain=source.some(value=>typeof value === 'boolean') ? [0,1] : values.length ? values : [0]
  const minimum=Math.min(...domain)
  const maximum=Math.max(...domain)
  const span=maximum-minimum || 1,last=example.value.samples.at(-1)!.offsetMillis || 1
  const points=source.map((value,i)=>({value,time:example.value!.samples[i].offsetMillis,x:54+example.value!.samples[i].offsetMillis/last*284,y:value == null ? 44+index*66 : 60+index*66-(Number(value)-minimum)/span*34}))
  let drawing=false
  const discrete=source.some(value=>typeof value === 'boolean')
  const path=points.map(point=>{
    if(point.value == null){drawing=false;return ''}
    const segment=!drawing ? 'M'+point.x+' '+point.y : discrete ? 'H'+point.x+'V'+point.y : 'L'+point.x+' '+point.y
    drawing=true;return segment
  }).join(' ')
  return {id,minimum,maximum,points,path}
}))
</script>
<style scoped>
.cw-signal-guide{width:360px;max-width:calc(100vw - 56px);max-height:calc(100vh - 100px);overflow:auto;overscroll-behavior:contain;color:var(--jet-theme-text);font-size:12px}
.cw-signal-guide header{display:flex;align-items:center;justify-content:space-between;gap:12px}
.cw-signal-guide header>span{display:inline-flex;align-items:center;gap:6px;color:var(--jet-theme-text-secondary)}
.cw-signal-guide p{margin:6px 0 4px;color:var(--jet-theme-text-secondary);line-height:1.6}
.cw-signal-guide svg{display:block;width:100%;font-size:10px;fill:var(--jet-theme-text-secondary)}
.cw-guide-caption{font-size:11px}
.cw-guide-axis{stroke:var(--line);stroke-width:1;fill:none}
.cw-guide-series{stroke:currentColor;stroke-width:1.5;fill:none;stroke-linejoin:round}
.before{color:var(--jet-theme-text-secondary)}
.after{color:var(--jet-theme-primary)}
.before .cw-guide-series{stroke-dasharray:3 3}
.cw-signal-guide circle{fill:currentColor}
.cw-guide-skipped{stroke:var(--jet-theme-text-secondary);stroke-width:1.5;fill:none}
.cw-guide-legend{display:flex;align-items:center;flex-wrap:wrap;gap:6px 12px;color:var(--jet-theme-text-secondary)}
.cw-guide-legend>span{display:inline-flex;align-items:center;gap:4px}
.cw-guide-legend i{display:block;width:12px;border-top:2px solid currentColor}
.cw-guide-legend .before{border-top-style:dashed}
.cw-guide-legend small{margin-inline-start:auto;font-size:10px}
.cw-guide-formula{display:grid;gap:4px;margin-top:10px;padding-top:8px;border-top:1px solid var(--line)}
.cw-guide-formula small,.cw-signal-guide footer{color:var(--jet-theme-text-secondary);font-size:11px;line-height:1.7}
.cw-signal-guide footer{margin-top:8px}
.cw-guide-formula dl{margin:0;font-size:11px;color:var(--jet-theme-text-secondary)}
.cw-guide-formula dt{font-weight:400}
.cw-guide-formula dd{margin:0;line-height:1.7}
.cw-guide-empty{display:flex;align-items:center;gap:6px;min-height:80px;color:var(--jet-theme-text-secondary)}
</style>
