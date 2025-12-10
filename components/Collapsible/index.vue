<template>
  <div class="collapsed">
    <div class="header">
      <div>
        <AIcon type="CodeSandboxOutlined"/>
        <slot name="title"></slot>
      </div>
      <div>
        <slot name="extra"></slot>
      </div>
    </div>
    <div v-if="visible" class="content">
      <slot></slot>
    </div>
  </div>
</template>

<script setup>
const visible = ref(true)

</script>

<style lang="less" scoped>
.collapsed {
  border: 1px solid #f5f6f8;
}
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #f5f6f8;
  padding: 12px 24px;
}

.content {
  padding: 24px;
}
</style>
