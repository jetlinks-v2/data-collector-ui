<template>
  <a-modal
    title="筛选"
    open
    width="50%"
    @cancel="emits('close')"
  >
    <div v-for="item in filterColumn" style="margin-bottom: 20px;" :key="item.key">
      <JTitle :data="item.title">{{item.title}}</JTitle>
      <CardSelect multiple v-model:value="filterData[item.key]" :showImage="false" :options="item.options"></CardSelect>
    </div>
    <template #footer>
      <div class="footer">
        <a-button @click="handleRest">重置</a-button>
        <a-space>
          <a-button @click="emits('close')">取消</a-button>
          <a-button type="primary" @click="handleOk">确定</a-button>
        </a-space>
      </div>
    </template>
  </a-modal>
</template>

<script setup lang="ts">
import CardSelect from "@/components/CardSelect/CardSelect.vue";
import { useProvider } from "../../hook/useProvider";
import { getProviders } from '@data-collector-ui/api/data-collect/channel';
import { cloneDeep } from "lodash-es";
import { useI18n } from "vue-i18n";

const { t: $t } = useI18n()
const props = defineProps({
  value: {
    type: Object,
    default: () => ({})
  }
})

const emits = defineEmits(['update:value', 'close'])
const { data } = useProvider();

const filterData = reactive(cloneDeep(props.value) || {
  provider: [],
  runningState: [],
  state: [],
  collectorState: [],
})

const filterColumn = computed(() => {
  return [
    {
      title: '通讯协议',
      key: 'provider',
      options: data.value?.map((item: any) => {
        return {
          label: item.name,
          value: item.id,
        }
      }),
    },
    {
      title: '通道运行状态',
      key: 'runningState',
      options: [
        {
          label: '运行中',
          value: 'running',
        },
        {
          label: '已停止',
          value: 'stopped',
        }
      ]
    },
    {
      title: '通道状态',
      key: 'state',
      options: [
        {
          label: '正常',
          value: 'enabled',
        },
        {
          label: '禁用',
          value:'disabled',
        }
      ]
    },
    {
      title: '采集器状态',
      key:'collectorState',
      options: [
        {
          label: '运行中',
          value: 'running',
        },
        {
          label: '禁用',
          value:'disabled',
        },
        {
          label: '已停止',
          value:'stopped',
        }
      ]
    }
  ]
})

const handleOk = () => {
  Object.keys(filterData).forEach((key) => {
    filterData[key] = filterData[key].filter((item: string) => !!item)
  })
  emits('update:value', cloneDeep(filterData));
  emits('close');
}

const handleRest = () => {
  Object.keys(filterData).forEach((key) => {
    filterData[key] = []
  })
}
</script>

<style lang="less" scoped>
.footer {
  display: flex;
  justify-content: space-between;
}
</style>