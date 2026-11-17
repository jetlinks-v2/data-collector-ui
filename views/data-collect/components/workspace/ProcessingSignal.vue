<template>
  <span class="cw-signal-config">
    <template v-if="algorithm === 'spike'">
      <span class="cw-signal-number">{{ $t('collectorSignal.tolerance') }}<a-input-number :value="configuration.limit" string-mode :min="0" :controls="false" size="small" :aria-label="$t('collectorSignal.tolerance')" @update:value="update('limit',$event)" /></span>
      <span class="cw-signal-number">{{ $t('collectorSignal.confirmSamples') }}<a-input-number :value="configuration.samples" :min="2" :max="1000000" :precision="0" :controls="false" size="small" :aria-label="$t('collectorSignal.confirmCount')" @update:value="update('samples',$event)" />{{ $t('collectorSignal.samplesUnit') }}</span>
    </template>
    <template v-else-if="algorithm === 'integral'">
      <ConfigSelect :value="configuration.unitMillis ?? 1000" :options="integralUnits" size="small" :aria-label="$t('collectorSignal.inputRateUnit')" @update:value="update('unitMillis',$event)" />
      <ConfigSelect :value="configuration.method || 'trapezoid'" :options="integralMethods" size="small" :aria-label="$t('collectorSignal.integralMethod')" @update:value="update('method',$event)" />
    </template>
    <template v-else-if="algorithm === 'hampel'">
      <ConfigSelect :value="configuration.action || 'ignore'" :options="outlierActions" size="small" :aria-label="$t('collectorSignal.outlierAction')" @update:value="update('action',$event)" />
      <span class="cw-signal-number">{{ $t('collectorSignal.window') }}<a-input-number :value="configuration.window" :min="3" :max="31" :step="2" :precision="0" :controls="false" size="small" :aria-label="$t('collectorSignal.window')" @update:value="update('window',$event)" /></span>
      <span class="cw-signal-number"><span class="cw-muted">σ ×</span><a-input-number :value="configuration.sigma" :min="0" :controls="false" size="small" :aria-label="$t('collectorSignal.sigma')" @update:value="update('sigma',$event)" /></span>
      <span class="cw-signal-number">{{ $t('collectorSignal.tolerance') }}<a-input-number :value="configuration.tolerance" :min="0" :controls="false" size="small" :aria-label="$t('collectorSignal.tolerance')" @update:value="update('tolerance',$event)" /></span>
    </template>
    <template v-else-if="algorithm === 'trimmed-mean'">
      <span class="cw-signal-number">{{ $t('collectorSignal.window') }}<a-input-number :value="configuration.window" :min="3" :max="31" :precision="0" :controls="false" size="small" :aria-label="$t('collectorSignal.window')" @update:value="update('window',$event)" /></span>
      <span class="cw-signal-number">{{ $t('collectorSignal.trimEachSide') }}<a-input-number :value="configuration.trim" :min="1" :max="Math.floor(((configuration.window || 7)-1)/2)" :precision="0" :controls="false" size="small" :aria-label="$t('collectorSignal.trimEachSide')" @update:value="update('trim',$event)" /></span>
    </template>
    <template v-else-if="algorithm === 'slew-rate'">
      <span v-for="direction in ['rise','fall'] as const" :key="direction" class="cw-signal-number">{{ $t(`collectorSignal.${direction}`) }}<a-input-number :value="configuration[direction]" :min="0" :controls="false" size="small" :aria-label="$t(`collectorSignal.${direction}`)" @update:value="update(direction,$event)" /><span class="cw-muted">/s</span></span>
    </template>
    <I18nT v-else-if="algorithm === 'ema'" keypath="collectorSignal.emaSentence" scope="global" tag="span" class="cw-signal-phrase">
      <template #duration><span class="cw-signal-number"><a-input-number :value="configuration.timeMillis" :min="1" :precision="0" :controls="false" size="small" :aria-label="$t('collectorSignal.timeConstant')" @update:value="update('timeMillis',$event)" /><span class="cw-muted">ms</span></span></template>
    </I18nT>
    <template v-else-if="confirming">
      <I18nT v-if="algorithm === 'stable'" keypath="collectorSignal.stableSentence" scope="global" tag="span" class="cw-signal-phrase"><template #limit><a-input-number :value="configuration.limit" string-mode :min="0" :controls="false" size="small" :aria-label="$t('collectorSignal.tolerance')" @update:value="update('limit',$event)" /></template></I18nT>
      <ConfigSelect :value="configuration.confirmation || 'time'" :options="confirmations" size="small" :aria-label="$t('collectorSignal.confirmation')" @update:value="changeConfirmation" />
      <span v-if="configuration.confirmation === 'samples'" class="cw-signal-number"><a-input-number :value="configuration.samples ?? 3" :min="1" :max="1000000" :precision="0" :controls="false" size="small" :aria-label="$t('collectorSignal.confirmCount')" @update:value="update('samples',$event)" />{{ $t('collectorSignal.samplesUnit') }}</span>
      <span v-else class="cw-signal-number"><a-input-number :value="configuration.timeMillis" :min="0" :precision="0" :controls="false" size="small" :aria-label="$t('collectorSignal.stableTime')" @update:value="update('timeMillis',$event)" /><span class="cw-muted">ms</span></span>
    </template>
    <I18nT v-else-if="algorithm === 'median' || algorithm === 'moving-average'" :keypath="algorithm === 'median' ? 'collectorSignal.medianSentence' : 'collectorSignal.movingAverageSentence'" scope="global" tag="span" class="cw-signal-phrase">
      <template #window><ConfigSelect v-if="algorithm === 'median'" :value="configuration.window || 3" :options="windows" size="small" :aria-label="$t('collectorSignal.median')" @update:value="update('window',$event)" /><span v-else class="cw-signal-number"><a-input-number :value="configuration.window" :min="2" :max="64" :precision="0" :controls="false" size="small" :aria-label="$t('collectorSignal.window')" @update:value="update('window',$event)" />{{ $t('collectorSignal.samplesUnit') }}</span></template>
    </I18nT>
    <I18nT v-else-if="algorithm === 'hysteresis'" keypath="collectorSignal.hysteresisSentence" scope="global" tag="span" class="cw-signal-phrase">
      <template #lower><a-input-number :value="configuration.lower" :placeholder="$t('collectorSignal.lower')" :aria-label="$t('collectorSignal.lower')" :controls="false" size="small" @update:value="update('lower',$event)" /></template><template #upper><a-input-number :value="configuration.upper" :placeholder="$t('collectorSignal.upper')" :aria-label="$t('collectorSignal.upper')" :controls="false" size="small" @update:value="update('upper',$event)" /></template>
    </I18nT>
    <template v-else-if="algorithm === 'difference' || algorithm === 'rate'">
      <ConfigSelect :value="configuration.decrease || 'allow'" :options="decreases" size="small" :aria-label="$t('collectorSignal.decrease')" @update:value="update('decrease',$event)" />
      <a-input-number v-if="configuration.decrease === 'rollover'" :value="configuration.modulus" string-mode :min="0" :controls="false" size="small" :placeholder="$t('collectorSignal.modulus')" :aria-label="$t('collectorSignal.modulus')" @update:value="update('modulus',$event)" />
    </template>
    <I18nT v-else :keypath="`collectorSignal.${algorithm === 'max-rate' ? 'maxRate' : 'maxStep'}Sentence`" scope="global" tag="span" class="cw-signal-phrase"><template #limit><a-input-number :value="configuration.limit" string-mode :min="0" :placeholder="$t('collectorSignal.limit')" :aria-label="$t('collectorSignal.limit')" :controls="false" size="small" @update:value="update('limit',$event)" /></template></I18nT>
    <ProcessingTiming v-if="algorithm !== 'hysteresis'" :value="configuration.resetAfterMillis ?? (algorithm === 'debounce' ? 0 : 60000)" :label="$t('collectorSignal.resetAfter')" :hint="$t('collectorSignal.resetHint')" @update:value="update('resetAfterMillis',$event)" />
  </span>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import { I18nT, useI18n } from 'vue-i18n'
import ConfigSelect from '../../../../components/ConfigSelect.vue'
import ProcessingTiming from './ProcessingTiming.vue'
import { type SignalConfiguration } from '../../../../utils/signalProcessing'
const props=defineProps<{ configuration:SignalConfiguration }>()
const emit=defineEmits<{ 'update:configuration':[value:SignalConfiguration] }>()
const {t}=useI18n()
const algorithm=computed(()=>props.configuration.algorithm)
const confirming=computed(()=>algorithm.value === 'debounce' || algorithm.value === 'stable')
const windows=computed(()=>[3,5].map(value=>({value,label:t('collectorSignal.windowSamples',{count:value}),icon:'DotChartOutlined',description:t('collectorSignal.medianHint')})))
const confirmations=computed(()=>['time','samples'].map((value,index)=>({value,label:t('collectorSignal.confirm'+(index ? 'Samples' : 'Time')),icon:index ? 'OrderedListOutlined' : 'ClockCircleOutlined',description:t('collectorSignal.confirmationHint')})))
const decreases=computed(()=>['allow','restart','rollover'].map((value,index)=>({value,label:t('collectorSignal.decrease'+index),icon:['SwapOutlined','ReloadOutlined','SyncOutlined'][index],description:t('collectorSignal.decreaseHint'+index)})))
const outlierActions=computed(()=>['ignore','replace'].map((value,index)=>({value,label:t('collectorSignal.outlierAction'+index),icon:index ? 'EditOutlined' : 'FilterOutlined',description:t('collectorSignal.outlierActionHint'+index)})))
const integralUnits=computed(()=>[1000,60000,3600000].map((value,index)=>({value,label:['/s','/min','/h'][index],icon:'ClockCircleOutlined',description:t('collectorSignal.inputRateUnit')})))
const integralMethods=computed(()=>['trapezoid','left'].map(value=>({value,label:t('collectorSignal.'+value),icon:value === 'left' ? 'StepForwardOutlined' : 'AreaChartOutlined',description:t('collectorSignal.'+value+'Hint')})))
function changeConfirmation(mode:'time'|'samples'){emit('update:configuration',{...props.configuration,confirmation:mode,samples:props.configuration.samples ?? 3,timeMillis:props.configuration.timeMillis ?? 1000})}
function update(key:keyof SignalConfiguration,value:unknown){emit('update:configuration',{...props.configuration,[key]:value ?? undefined})}
</script>
<style scoped>
.cw-signal-config{display:flex;align-items:center;flex-wrap:wrap;gap:4px;min-width:0}
.cw-signal-number{display:inline-flex;align-items:center;gap:4px;white-space:nowrap}
.cw-signal-phrase{display:inline;line-height:var(--rule-control-height,24px);overflow-wrap:anywhere}
.cw-signal-config :deep(.ant-select){min-width:74px;max-width:100%;vertical-align:middle}
.cw-signal-config :deep(.ant-input-number){width:64px;max-width:100%}
.cw-signal-config :deep(.ant-btn){padding-inline:4px}
</style>
