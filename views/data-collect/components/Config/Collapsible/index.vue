<template>
  <div class="collapsed" :class="{'visible': visible}">
    <div class="header">
      <div class="title">
        <AIcon type="CodeSandboxOutlined"/>
        <j-ellipsis>{{ title }}</j-ellipsis>
      </div>
      <div class="tip">
        <j-ellipsis>{{ tip }}</j-ellipsis>
      </div>
      <div>
        <slot name="extra" :onSwitch="onSwitch">
          <CollapseRadio v-model:value="_value" @change="onChange" :show-extra="showExtra">
            <template #extraTemplate>
              <slot name="extraTemplate"></slot>
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
  initialVisible: {
    type: Boolean,
    default: false
  },
  showExtra: {
    type: Boolean,
    default: true,
  }
})

const emit = defineEmits(['update:value', 'change'])

const _value = ref(props.value)

const visible = computed(() => _value.value === true)

const onSwitch = (flag) => {
  _value.value = flag
}

const onChange = (val) => {
  console.log(val)
  _value.value = val
  emit('update:value', val)
  emit('change', val)
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
