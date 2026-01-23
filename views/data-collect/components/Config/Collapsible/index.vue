<template>
  <div class="collapsed" :class="{'visible': visible}" ref="collapsedRef">
    <div class="header">
      <div class="title">
        <AIcon type="CodeSandboxOutlined"/>
        <j-ellipsis>{{ title }}</j-ellipsis>
      </div>
      <div class="tip">
        <j-ellipsis>{{ tip }}</j-ellipsis>
      </div>
      <div>
        <slot v-if="showSwitch" name="extra" :onSwitch="onSwitch">
          <CollapseRadio :value="_value" @change="onSwitch" :show-extra="showExtra" :disabledList="disabledList">
            <template #extraTemplate>
              <div style="width: 200px">
                <slot name="extraTemplate"></slot>
              </div>
            </template>
          </CollapseRadio>
        </slot>
      </div>
    </div>
    <div v-if="visible" class="content">
      <slot></slot>
    </div>
  </div>
</template>

<script setup>
import CollapseRadio from "./CollapseRadio.vue";
import {onClickOutside} from "@vueuse/core";

const props = defineProps({
  value: {
    type: [Boolean, String],
    default: false
  },
  title: {
    type: String,
    default: ''
  },
  tip: {
    type: String,
    default: ''
  },
  showSwitch: { // 是否展示开关
    type: Boolean,
    default: true
  },
  showExtra: {
    type: Boolean,
    default: true,
  },
  disabledList: {
    type: Array,
    default: []
  }
})

const emit = defineEmits(['update:value', 'change', 'outside'])

const _value = ref(props.value)
const collapsedRef = ref(null)

const visible = computed(() => props.value === true)

onClickOutside(collapsedRef, () => {
  if(visible.value){
    emit('outside')
  }
})
const onSwitch = (flag) => {
  _value.value = flag
  emit('update:value', flag)
  emit('change', flag)
}
</script>

<style lang="less" scoped>
.collapsed {
  border: 1px solid #f5f6f8;
  margin-bottom: 24px;

  &.visible {
    border-color: #e4e7ed;
  }
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #f5f6f8;
  padding: 8px 12px;
  gap: 16px;

  .title {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 20px;
    font-weight: bold;
    min-width: 100px;
  }

  .tip {
    font-size: 12px;
  }
}

.content {
  padding: 24px;
}
</style>
