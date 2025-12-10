<template>
  <a-modal open title="新增">
    <a-form :model="formData" :rules="rules" ref="formRef" layout="vertical">
      <a-form-item label="名称" prop="name">
        <a-input v-model:value="formData.name"/>
      </a-form-item>
      <Collapsible title="高级配置">
        <a-form-item label="标签" prop="tags">
          <a-input v-model:value="formData.tags"/>
        </a-form-item>
      </Collapsible>
    </a-form>
  </a-modal>
</template>

<script setup>
import Collapsible from '@data-collector-ui/components/Collapsible/index.vue'
const formData = reactive({
  name: '',
  tags: []
})
const formRef = ref(null)

const rules = {
  name: [
    {required: true, message: '请输入名称', trigger: ['blur']}
  ]
}
</script>

<style lang="less" scoped>

</style>
