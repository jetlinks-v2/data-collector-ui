<template>
  <Collapsible
      :title="$t('DataCollect.index.400154-8')"
      :tip="$t('DataCollect.index.400154-9')"
      v-model:value="data"
      :show-switch="showSwitch"
      @change="onSwitchChange"
      @outside="onOutsize"
      :show-extra="showExtra"
  >
    <template #extraTemplate>
      <a-descriptions :column="1">
        <a-descriptions-item :label="item.label" v-for="item in list" :key="item.value">
          <j-ellipsis>
            {{ collector?.features?.includes(item.value) ? $t('DataCollect.index.400154-0') : $t('DataCollect.index.400154-1') }}
          </j-ellipsis>
        </a-descriptions-item>
      </a-descriptions>
    </template>
    <a-form-item>
      <j-card-select
          :value="_features"
          :multiple="true"
          :options="list"
          @change="onChange"
      />
    </a-form-item>
  </Collapsible>
</template>

<script setup>
import Collapsible from "./Collapsible/index.vue";
import {inject} from "vue";
import {DATA_COLLECTOR_CONFIG_TYPE, PLUGIN_DETAIL_SAVE_EVENTS} from "@data-collector-ui/views/data-collect/data";
import {isEqual} from "./data";
import {useI18n} from "vue-i18n";

const {t: $t} = useI18n();

const props = defineProps({
  showSwitch: {
    type: Boolean,
    default: true
  }
})
const data = ref(!props.showSwitch)

const formData = inject('plugin-form', reactive({}))
const collector = inject('point-form-collector', {})
const events = inject(PLUGIN_DETAIL_SAVE_EVENTS);

const __type = inject(DATA_COLLECTOR_CONFIG_TYPE, false)
let firstRender = true // 第一次渲染

// 记录初始值快照，用于检测变化
const initialSnapshot = ref(null)

const list = [
  {
    label: $t('DataCollect.index.400154-2'),
    value: 'storageData',
    describe: $t('DataCollect.index.400154-3')
  },
  {
    label: $t('DataCollect.index.400154-4'),
    value: 'storageOutlier',
    describe: $t('DataCollect.index.400154-5')
  },
  {
    label: $t('DataCollect.index.400154-6'),
    value: 'storageDeadband',
    describe: $t('DataCollect.index.400154-7')
  }
]

const _list = ['storageData', 'storageOutlier', 'storageDeadband']

if (!('features' in formData)) {
  formData.features = []
}

const _features = computed(() => {
  return formData.features.filter(i => i !== 'changedOnly')
})

const showExtra = computed(() => {
  return !!collector?.features?.find(i => _list.includes(i))
})

const onChange = (val) => {
  const arr = formData.features.filter(i => i === 'changedOnly')
  formData.features = [...val, ...arr]
}

const onSwitchChange = (val) => {
  if (val === 'template') {
    formData.features = (collector.features || []).filter(i => _list.includes(i)) || []
  } else {
    formData.features = formData.features.filter(i => i === 'changedOnly')
  }
  if(val !== true){
    onOutsize()
  }
}

const onOutsize = () => {
  if (__type) {
    // 检查值是否真正发生变化
    const currentValue = {
      features: formData.features
    }

    // 如果没有初始快照或值发生了变化，才触发校验和传值
    if (!initialSnapshot.value || !isEqual(initialSnapshot.value, currentValue)) {
      const arr = [
        {
          name: ['features'],
          value: formData.features
        },
      ]
      events?.onValueChange?.(arr)
      // 更新快照
      initialSnapshot.value = JSON.parse(JSON.stringify(currentValue))
    }
  }
}

watch(() => formData.features, (val) => {
  if (firstRender && __type) {
    const flag = val.find(i => {
      return _list.includes(i)
    })
    data.value = !!flag
    firstRender = false
  }
}, {
  immediate: true
})

// 监听折叠板打开状态，打开时记录初始快照
watch(() => data.value, (newVal) => {
  if (newVal === true) {
    // 折叠板打开时，记录当前值的快照
    initialSnapshot.value = JSON.parse(JSON.stringify({
      features: formData.features
    }))
  }
}, {
  immediate: true  // 确保初始打开时也记录快照
})

</script>

<style lang="less" scoped>

</style>
