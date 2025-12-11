<template>
  <template v-if="type === 'point'">
    <div class="radio">
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
  </template>
  <template v-if="type === 'collector'">
    <a-switch v-model:checked="_value" @change="onChange"/>
  </template>
</template>

<script setup>
import {DATA_COLLECTOR_SAVE_TYPE} from "@data-collector-ui/views/data-collect/data";

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
const list = [
  {
    label: '开',
    value: true,
  },
  {
    label: '关',
    value: false,
  },
  {
    label: '复用模板',
    value: 'template'
  },
]

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
  grid-template-columns: repeat(3, 1fr);
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
