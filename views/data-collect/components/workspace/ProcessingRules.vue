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
    <div v-for="group in visibleGroups" :key="group.key" class="cw-processing-stage">
      <div v-if="visibleGroups.length > 1" class="cw-processing-stage-title">{{ group.title }}</div>
      <ProcessingRuleLine v-for="rule in group.rules" :key="rule.key" :rule="rule" :error="errors[rule.key]" @remove="remove(rule.key)">
        <template v-if="rule.key === 'outlier' && managed.outlier.provider === 'range'" #label>
          <ConfigSelect v-model:value="cleaningAction" :options="cleaningOptions" size="small" class="cw-inline-mode" :bordered="false" :aria-label="$t('collectorProcessing.cleaningAction')" />
        </template>
        <template v-else-if="rule.key === 'converter'" #label>
          <a-dropdown :trigger="['click']" :disabled="formulas.converter.editing.value">
            <a-button type="text" size="small" :disabled="formulas.converter.editing.value"><a-tag color="purple"><AIcon :type="simpleConversion ? 'CalculatorOutlined' : 'FunctionOutlined'" />{{ $t(simpleConversion ? 'collectorProcessing.simpleConversion' : 'collectorProcessing.formulaConversion') }}<AIcon type="DownOutlined" /></a-tag></a-button>
            <template #overlay><a-menu @click="changeConversionMode(String($event.key))"><a-menu-item v-for="option in conversionModes" :key="option.value" :disabled="option.disabled"><span class="collector-config-option"><AIcon :type="option.icon" class="collector-config-option-icon" /><span class="collector-config-option-copy"><span>{{ option.label }}</span><small>{{ option.description }}</small></span></span></a-menu-item></a-menu></template>
          </a-dropdown>
        </template>
        <template v-if="rule.key === 'outlier' && managed.outlier.provider === 'range'">
          <span class="cw-processing-phrase"><a-input-number v-model:value="managed.outlier.configuration.min" string-mode :controls="false" size="small" :aria-label="$t('collectorProcessing.min')" />{{ managed.outlier.configuration.action ? '～' : '＜' }}<template v-if="!managed.outlier.configuration.action">{{ $t('collectorWorkspace.value') }} ＜</template><a-input-number v-model:value="managed.outlier.configuration.max" string-mode :controls="false" size="small" :aria-label="$t('collectorProcessing.max')" /></span>
        </template>
        <ProcessingFormula v-else-if="rule.key === 'converter' || rule.key === 'outlier' || rule.key === 'deadband'" :editor="formulas[rule.key]">
          <template v-if="rule.key === 'converter' && managed.converter.provider === 'scale'" #default>
          <I18nT keypath="collectorProcessing.scaleSentence" scope="global" tag="span" class="cw-processing-clause">
            <template #factor><a-input-number v-model:value="managed.converter.configuration.factor" :controls="false" size="small" :aria-label="$t('collectorProcessing.factor')" /></template>
            <template #precision><a-input-number v-model:value="managed.converter.configuration.scale" :min="0" :precision="0" :controls="false" size="small" :aria-label="$t('collectorProcessing.precision')" /></template>
          </I18nT>
          </template>
        </ProcessingFormula>
          <span v-else-if="rule.key === 'changedOnly'">{{ $t('collectorWorkspace.changedOnly') }}<a-tooltip :title="rule.description"><AIcon class="cw-muted" type="InfoCircleOutlined" /></a-tooltip></span>
          <I18nT v-else-if="rule.key === 'storage'" keypath="collectorProcessing.storageSentence" scope="global" tag="span" class="cw-processing-clause">
            <template #types><ConfigSelect v-model:value="storageValues" mode="multiple" :max-tag-count="1" :options="storageOptions" size="small" class="cw-storage-select" :aria-label="$t('collectorProcessing.storage')" /></template>
          </I18nT>
          <ProcessingAlarm v-else-if="rule.key === 'handler' && managed.handler.provider === 'alarm'" :editor="alarm" />
          <span v-else class="cw-muted">{{ $t('collectorProcessing.customProvider', { provider: managed[rule.key]?.provider }) }}</span>
          <template v-if="rule.key === 'converter' && managed.converter.provider === 'expression'" #details>
            <small v-if="!simpleConversion" class="cw-muted">{{ $t('collectorProcessing.formulaIgnoreHint') }}</small>
            <template v-if="writable"><span class="cw-muted">{{ $t('collectorProcessing.writeFormula') }}</span><ProcessingFormula :editor="writeFormula" formula-only /></template>
          </template>
      </ProcessingRuleLine>
    </div>
    <p v-if="!visibleGroups.length" class="cw-muted cw-rule-empty">{{ $t('collectorWorkspace.noProcessing') }}</p>
  </section>
</template>
<script setup lang="ts">
import { I18nT } from 'vue-i18n'
import type { CollectorObject, PointCapabilities } from '../../../../types/workspace'
import { useProcessingRules } from '../../hook/useProcessingRules'
import ProcessingRuleLine from './ProcessingRuleLine.vue'
import ProcessingFormula from './ProcessingFormula.vue'
import ProcessingAlarm from './ProcessingAlarm.vue'
import ConfigSelect from '../../../../components/ConfigSelect.vue'
const props = defineProps<{ model: CollectorObject; capabilities?: PointCapabilities }>()
const { managed, groups, visibleGroups, enabled, add, remove, storageValues, storageOptions, cleaningAction, cleaningOptions, conversionModes, simpleConversion, changeConversionMode, formulas,writeFormula,writable, alarm, errors, validate } = useProcessingRules(() => props.model, () => props.capabilities || {})
defineExpose({ validate })
</script>
<style scoped lang="less">
.cw-processing { container:collector-processing / inline-size; }
.cw-processing-heading { margin-bottom:6px; }
.cw-processing-add { padding-inline:4px; color:var(--jet-theme-text-secondary,var(--cw-muted)); }
.cw-processing-add:hover { color:var(--jet-theme-primary,var(--cw-blue)); }
.cw-processing-stage + .cw-processing-stage { margin-top:10px; }
.cw-processing-stage-title { display:flex; align-items:center; gap:4px; margin-block:0 4px; color:var(--jet-theme-text-secondary,var(--cw-muted)); font-size:12px; line-height:16px; }
.cw-processing-stage-title::after { content:''; flex:1; border-top:1px solid var(--line,var(--cw-line)); }
.cw-storage-select { min-width:160px; max-width:100%; }
</style>
