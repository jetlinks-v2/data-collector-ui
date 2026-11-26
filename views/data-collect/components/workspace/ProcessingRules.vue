<template>
  <section class="cw-processing" :aria-label="$t('collectorWorkspace.processing')">
    <div class="cw-between cw-processing-heading"><h2><AIcon type="SlidersOutlined" />{{ $t('collectorWorkspace.processing') }}</h2>
      <a-dropdown :trigger="['click']">
        <a-button type="text" size="small" class="cw-processing-add"><AIcon type="PlusOutlined" />{{ $t('collectorWorkspace.add') }}</a-button>
        <template #overlay><a-menu class="cw-processing-menu">
          <a-menu-item-group v-for="group in groups" :key="group.key" :title="group.title">
            <a-menu-item v-for="rule in group.rules" :key="rule.key" :disabled="enabled(rule.key) || rule.disabled" @click="add(rule.key)">
              <span class="collector-config-option"><AIcon :type="rule.icon" class="collector-config-option-icon" /><span class="collector-config-option-copy"><span>{{ rule.title }}</span><small>{{ rule.disabled ? $t('collectorProcessing.numericOnly') : rule.description }}</small></span><AIcon v-if="enabled(rule.key)" type="CheckOutlined" /></span>
            </a-menu-item>
          </a-menu-item-group>
        </a-menu></template>
      </a-dropdown>
    </div>
    <div class="cw-processing-stages">
    <div v-for="group in visibleGroups" :key="group.key" class="cw-processing-stage">
      <div class="cw-processing-stage-title"><span>{{ group.title }}</span><a-tooltip :title="group.description"><span tabindex="0" :aria-label="group.description"><AIcon type="InfoCircleOutlined" /></span></a-tooltip></div>
      <ProcessingRuleLine v-for="rule in group.rules" :key="rule.key" :rule="rule" :error="errors[rule.key]" @remove="remove(rule.key)">
        <template v-if="rule.key === 'outlier' && ['range','valid-number','signal'].includes(managed.outlier.provider)" #label>
          <ProcessingAlgorithmChoice v-model:value="cleaningAction" :options="documentedCleaningOptions" :label="$t('collectorProcessing.cleaningAction')" :context="group.description" :guide="managed.outlier.provider === 'signal' ? guideFor(cleaningAction) : undefined" @active="cleaningMenuOpen=$event" @retry="signalDocumentation.retry" />
        </template>
        <template v-else-if="rule.key === 'processor' && managed.processor.provider === 'signal'" #label>
          <ProcessingAlgorithmChoice v-model:value="signalAlgorithm" :options="documentedSignalOptions" :label="$t('collectorSignal.title')" :context="group.description" :guide="guideFor(signalAlgorithm)" @active="signalMenuOpen=$event" @retry="signalDocumentation.retry" />
        </template>
        <template v-else-if="rule.key === 'deadband'" #label>
          <ConfigSelect v-model:value="pushMode" :options="pushModes" size="small" class="cw-inline-mode" :bordered="false" :aria-label="$t('collectorProcessing.conditions')" />
        </template>
        <template v-else-if="rule.key === 'converter'" #label>
          <a-dropdown :trigger="['click']" :disabled="formulas.converter.editing.value">
            <a-button type="text" size="small" :disabled="formulas.converter.editing.value"><AIcon :type="simpleConversion ? 'CalculatorOutlined' : 'FunctionOutlined'" />{{ $t(simpleConversion ? 'collectorProcessing.simpleConversion' : 'collectorProcessing.formulaConversion') }}<AIcon type="DownOutlined" /></a-button>
            <template #overlay><a-menu @click="changeConversionMode(String($event.key))"><a-menu-item v-for="option in conversionModes" :key="option.value" :disabled="option.disabled"><span class="collector-config-option"><AIcon :type="option.icon" class="collector-config-option-icon" /><span class="collector-config-option-copy"><span>{{ option.label }}</span><small>{{ option.description }}</small></span></span></a-menu-item></a-menu></template>
          </a-dropdown>
        </template>
        <template v-if="rule.key === 'outlier' && managed.outlier.provider === 'range'">
          <span class="cw-processing-phrase"><a-input-number v-model:value="managed.outlier.configuration.min" string-mode :controls="false" size="small" :aria-label="$t('collectorProcessing.min')" />{{ managed.outlier.configuration.action ? '～' : '＜' }}<template v-if="!managed.outlier.configuration.action">{{ $t('collectorWorkspace.value') }} ＜</template><a-input-number v-model:value="managed.outlier.configuration.max" string-mode :controls="false" size="small" :aria-label="$t('collectorProcessing.max')" /></span>
        </template>
        <span v-else-if="rule.key === 'outlier' && managed.outlier.provider === 'valid-number'" class="cw-valid-numbers">
          <a-select :value="managed.outlier.configuration.invalidValues || []" mode="tags" :open="false" :options="[]" :token-separators="[',','，',';']" :max-tag-count="1" size="small" :placeholder="$t('collectorSignal.invalidMarkersPlaceholder')" :aria-label="$t('collectorSignal.invalidMarkers')" @update:value="managed.outlier.configuration.invalidValues=$event" />
          <a-tooltip :title="$t('collectorSignal.validNumberHint')"><AIcon type="InfoCircleOutlined" class="cw-muted" /></a-tooltip>
        </span>
        <ProcessingSignal v-else-if="(rule.key === 'processor' || rule.key === 'outlier') && managed[rule.key].provider === 'signal'" v-model:configuration="managed[rule.key].configuration" />
        <ProcessingChange v-else-if="rule.key === 'deadband' && managed.deadband.provider === 'change'" v-model:configuration="managed.deadband.configuration" />
        <ProcessingFormula v-else-if="rule.key === 'converter' || rule.key === 'outlier' || rule.key === 'deadband'" :editor="formulas[rule.key]">
          <template v-if="rule.key === 'converter' && managed.converter.provider === 'scale'" #default>
          <I18nT keypath="collectorProcessing.scaleSentence" scope="global" tag="span" class="cw-processing-clause">
            <template #factor><a-input-number v-model:value="managed.converter.configuration.factor" :controls="false" size="small" :aria-label="$t('collectorProcessing.factor')" /></template>
            <template #precision><a-input-number v-model:value="managed.converter.configuration.scale" :min="0" :precision="0" :controls="false" size="small" :aria-label="$t('collectorProcessing.precision')" /></template>
          </I18nT>
          </template>
        </ProcessingFormula>
          <span v-else-if="rule.key === 'changedOnly'">{{ $t('collectorWorkspace.changedOnly') }}<a-tooltip :title="rule.description"><AIcon class="cw-muted" type="InfoCircleOutlined" /></a-tooltip></span>
          <ProcessingAlarm v-else-if="rule.key === 'handler' && managed.handler.provider === 'alarm'" :editor="alarm" />
          <span v-else class="cw-muted">{{ $t('collectorProcessing.customProvider', { provider: managed[rule.key]?.provider }) }}</span>
          <template v-if="rule.key === 'converter' && managed.converter.provider === 'expression' && (!simpleConversion || writable)" #details>
            <small v-if="!simpleConversion" class="cw-muted">{{ $t('collectorProcessing.formulaIgnoreHint') }}</small>
            <template v-if="writable"><span class="cw-muted">{{ $t('collectorProcessing.writeFormula') }}</span><ProcessingFormula :editor="writeFormula" formula-only /></template>
          </template>
      </ProcessingRuleLine>
    </div>
    </div>
    <p v-if="!visibleGroups.length" class="cw-muted cw-rule-empty">{{ $t('collectorWorkspace.noProcessing') }}</p>
  </section>
  <PointHistoryStorage v-model:value="storageValues" :options="storageOptions" />
</template>
<script setup lang="ts">
import { I18nT, useI18n } from 'vue-i18n'
import { computed, ref } from 'vue'
import type { CollectorObject, PointCapabilities } from '../../../../types/workspace'
import { useProcessingRules } from '../../hook/useProcessingRules'
import PointHistoryStorage from './PointHistoryStorage.vue'
import { useProcessorDocumentation } from '../../hook/useProcessorDocumentation'
import ProcessingRuleLine from './ProcessingRuleLine.vue'
import ProcessingFormula from './ProcessingFormula.vue'
import ProcessingAlarm from './ProcessingAlarm.vue'
import ProcessingSignal from './ProcessingSignal.vue'
import ProcessingChange from './ProcessingChange.vue'
import ConfigSelect from '../../../../components/ConfigSelect.vue'
import ProcessingAlgorithmChoice from './ProcessingAlgorithmChoice.vue'
const props = defineProps<{ model: CollectorObject; capabilities?: PointCapabilities }>()
const { t } = useI18n()
const signalMenuOpen=ref(false),cleaningMenuOpen=ref(false)
const signalDocumentation=useProcessorDocumentation(()=>'signal',()=>props.model.managedConfiguration?.processor?.configuration?.algorithm,()=>signalMenuOpen.value || cleaningMenuOpen.value || !!props.model.managedConfiguration?.processor?.enabled || !!(props.model.managedConfiguration?.outlier?.enabled && props.model.managedConfiguration?.outlier?.provider === 'signal'))
const { managed, groups, visibleGroups, enabled, add, remove, signalAlgorithm, signalOptions, pushMode, pushModes, storageValues, storageOptions, cleaningAction, cleaningOptions, conversionModes, simpleConversion, changeConversionMode, formulas,writeFormula,writable, alarm, errors, validate } = useProcessingRules(() => props.model, () => props.capabilities || {},algorithm=>signalDocumentation.catalog.value[algorithm]?.inputTypes)
function documentedOptions(options:typeof signalOptions.value | typeof cleaningOptions.value){return options.map(option=>{
  const documentation=signalDocumentation.catalog.value[option.value]
  return {...option,label:documentation?.name || option.label,description:documentation?.description || option.description,formula:documentation?.formula,
    disabledReason:option.disabled ? t('collectorSignal.unsupportedInput') : undefined}
})}
const documentedSignalOptions=computed(()=>documentedOptions(signalOptions.value))
const documentedCleaningOptions=computed(()=>documentedOptions(cleaningOptions.value))
const guideFor=(algorithm:string)=>({documentation:signalDocumentation.catalog.value[algorithm],loading:signalDocumentation.loading.value,error:signalDocumentation.error.value})
defineExpose({ validate })
</script>
<style scoped lang="less">
.cw-processing { container:rule-fields / inline-size; }
.cw-processing-heading { margin-bottom:6px; }
.cw-processing-add { padding-inline:4px; color:var(--jet-theme-text-secondary,var(--cw-muted)); }
.cw-processing-add:hover { color:var(--jet-theme-primary,var(--cw-blue)); }
.cw-signal-guide { width:20px; min-width:20px; }
.cw-processing-stages { display:flex; flex-direction:column; min-width:0; }
.cw-processing-stage { display:flex; flex-direction:column; gap:2px; min-width:0; }
.cw-processing-stage + .cw-processing-stage { margin-top:4px; }
.cw-processing-stage-title { grid-column:1 / -1; display:flex; align-items:center; gap:4px; margin-block:0 4px; color:var(--jet-theme-text-secondary,var(--cw-muted)); font-size:12px; line-height:16px; }
.cw-processing-stage-title::after { content:''; flex:1; border-top:1px solid var(--line,var(--cw-line)); }
.cw-storage-select { min-width:160px; max-width:100%; }
.cw-valid-numbers { display:flex; align-items:center; gap:4px; min-width:0; }
.cw-valid-numbers :deep(.ant-select) { flex:1; min-width:100px; max-width:220px; }
</style>
<style>
.cw-algorithm-options .select-option__text small { display:grid; gap:4px; white-space:normal; overflow:visible; }
.cw-algorithm-options .latex-view { font-size:12px; }
.cw-algorithm-options .select-option__text small > span { display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; font-size:12px; line-height:18px; }
.cw-algorithm-options .latex-view { max-width:100%; overflow-x:auto; }
.cw-algorithm-options .cw-algorithm-context { margin:0 8px 4px; padding:4px 0 8px; border-bottom:1px solid var(--line,var(--jet-theme-border-color-split)); color:var(--jet-theme-text-secondary,var(--text-color-secondary)); font-size:12px; line-height:18px; white-space:normal; }
</style>
