<template>
  <Collapsible title="存储配置" tip="配置点位数据存储类型" v-model:value="data" :show-switch="showSwitch"
               @change="onSwitchChange">
    <template #extraTemplate>
      <a-descriptions :column="1">
        <a-descriptions-item :label="item.label" v-for="item in list" :key="item.value">
          <j-ellipsis>
            {{ collector?.features?.includes(item.value) ? '是' : '否' }}
          </j-ellipsis>
        </a-descriptions-item>
      </a-descriptions>
    </template>
    <a-form-item>
      <j-card-select
          :value="_accessModes"
          :multiple="true"
          :options="list"
          @change="onChange"
      />
    </a-form-item>
  </Collapsible>
</template>

<script setup>
import Collapsible from "./Collapsible/index.vue";

const props = defineProps({
  showSwitch: {
    type: Boolean,
    default: true
  }
})
const data = ref(!props.showSwitch)

const formData = inject('plugin-form', reactive({}))
const collector = inject('point-form-collector', {})
let firstRender = true // 第一次渲染

const list = [
  {
    label: '存储点位数据',
    value: 'storageData',
    describe: '将采集到的点位数据保存到平台'
  },
  {
    label: '存储异常数据',
    value: 'storageOutlier',
    describe: '将异常数据上报平台并存储'
  },
  {
    label: '存储死区数据',
    value: 'storageDeadband',
    describe: '将死区数据上报平台并存储'
  }
]

const _list = ['storageData', 'storageOutlier', 'storageDeadband']

if (!('features' in formData)) {
  formData.features = []
}

const _accessModes = computed(() => {
  return formData.features.filter(i => i !== 'changedOnly')
})

const onChange = (val) => {
  const arr = formData.features.filter(i => i === 'changedOnly')
  formData.features = [...val, ...arr]
}

const onSwitchChange = (val) => {
  if (val === 'template') {
    formData.features = (collector.features || []).filter(i => _list.includes(i)) || []
  } else {
    formData.features = []
  }
}

watch(() => formData.features, (val) => {
  if (firstRender) {
    const flag = val.find(i => {
      return _list.includes(i)
    })
    data.value = !!flag
    firstRender = false
  }
}, {
  immediate: true
})

</script>

<style lang="less" scoped>

</style>
