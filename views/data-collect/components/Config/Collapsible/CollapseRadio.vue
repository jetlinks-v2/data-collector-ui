<template>
  <!--  <template v-if="type === 'point'">-->
  <div
      class="radio"
      :style="{
        'grid-template-columns': `repeat(${list.length}, 1fr)`
      }"
  >
    <div
        v-for="item in list"
        :key="item.value"
        @click="onChange(item.value)"
        :class="{'active': item.value === _value}"
    >
      <j-ellipsis>{{ item.label }}</j-ellipsis>
      <a-popover v-if="showExtra && item.value === 'template'" trigger="hover">
        <template #content>
          <slot name="extraTemplate"></slot>
        </template>
        <AIcon type="QuestionCircleOutlined"/>
      </a-popover>
    </div>
  </div>
  <!--  </template>-->
  <!--  <template v-if="type === 'collector'">-->
  <!--    <a-switch v-model:checked="_value" @change="onChange"/>-->
  <!--  </template>-->
</template>

<script setup>
import {DATA_COLLECTOR_SAVE_TYPE} from "@data-collector-ui/views/data-collect/data";
import {useI18n} from "vue-i18n";

const {t: $t} = useI18n();

const props = defineProps({
  value: {
    type: Boolean,
    default: 'template',
  },
  showExtra: {
    type: Boolean,
    default: true,
  }
})
const emit = defineEmits(['update:value', 'change'])
const type = inject(DATA_COLLECTOR_SAVE_TYPE)
const list = computed(() => {
  const arr = [
    {
      label: $t('DataCollect.index.400154-19'),
      value: true,
    },
    {
      label: $t('DataCollect.index.400154-20'),
      value: false,
    }
  ]
  if (props.showExtra) {
    arr.push({
      label: $t('DataCollect.index.400154-21'),
      value: 'template'
    })
  }
  return arr
})

const _value = ref('false')

watch(() => props.value, (val) => {
  _value.value = val ?? 'template'
}, {
  immediate: true
})


const onChange = (e) => {
  const val = e
  emit('update:value', val)
  emit('change', val)
}
</script>

<style lang="less" scoped>
.radio {
  display: grid;
  border: 1px solid #d9d9d9;
  min-width: 240px;

  div {
    padding: 4px 8px;
    cursor: pointer;
    background-color: #ffffff;
    display: flex;
    align-items: center;
    justify-content: center;

    &:not(:last-child) {
      border-right: 1px solid #d9d9d9;
    }

    &:hover {
      background-color: #ffffff;
      color: @primary-color;
    }

    &.active {
      background-color: @primary-color;
      color: #fff;
    }
  }
}
</style>
