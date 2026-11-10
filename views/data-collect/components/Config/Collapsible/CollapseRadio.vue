<template>
  <a-segmented
      class="collapse-radio"
      :value="segmentedValue"
      :options="options"
      block
      @change="onChange"
  >
    <template #label="{ value, payload }">
      <span class="option-label">
        <j-ellipsis>{{ payload }}</j-ellipsis>
        <a-popover v-if="showExtra && value === 'template'" trigger="hover">
          <template #content>
            <slot name="extraTemplate"></slot>
          </template>
          <AIcon class="template-help" type="QuestionCircleOutlined"/>
        </a-popover>
      </span>
    </template>
  </a-segmented>
</template>

<script setup lang="ts">
import {computed} from "vue";
import type {PropType} from "vue";
import {useI18n} from "vue-i18n";

type ConfigSwitchValue = boolean | 'template';

const {t: $t} = useI18n();

const props = defineProps({
  value: {
    type: [Boolean, String] as PropType<ConfigSwitchValue>,
    default: 'template',
  },
  showExtra: {
    type: Boolean,
    default: true,
  },
  disabledList: {
    type: Array as PropType<ConfigSwitchValue[]>,
    default: () => []
  }
})
const emit = defineEmits<{
  (event: 'update:value', value: ConfigSwitchValue): void
  (event: 'change', value: ConfigSwitchValue): void
}>()

// Segmented 使用字符串选项，对外仍保留布尔值与 template 的配置契约。
const segmentedValue = computed(() => {
  if (props.value === true) return 'on'
  if (props.value === false) return 'off'
  return 'template'
})

const options = computed(() => {
  const arr = [
    {
      payload: $t('DataCollect.index.400154-19'),
      value: 'on',
      disabled: props.disabledList.includes(true)
    },
    {
      payload: $t('DataCollect.index.400154-20'),
      value: 'off',
      disabled: props.disabledList.includes(false)
    }
  ]
  if (props.showExtra) {
    arr.push({
      payload: $t('DataCollect.index.400154-21'),
      value: 'template',
      disabled: props.disabledList.includes('template')
    })
  }
  return arr
})

const onChange = (value: string | number) => {
  const nextValue = value === 'template' ? 'template' : value === 'on'
  emit('update:value', nextValue)
  emit('change', nextValue)
}
</script>

<style lang="less" scoped>
.collapse-radio {
  width: 264px;
}

.collapse-radio :deep(.ant-segmented-item) {
  flex: 1 1 0;
  min-width: 0;
}

.option-label {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
}

.template-help {
  flex: none;
}
</style>
