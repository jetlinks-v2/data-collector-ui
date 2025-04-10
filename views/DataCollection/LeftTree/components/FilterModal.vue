<template>
  <a-modal
    title="筛选"
    visible
    width="50%"
    @close="emits('close')"
  >
    <div v-for="item in filterColumn" :key="item.key">
      <h3>{{item.title}}</h3>
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
import { useRequest } from "@jetlinks-web/hooks";
import { getProviders } from '@collector/api/data-collect/channel';

const props = defineProps({
  value: {
    type: Object,
    default: () => ({})
  }
})

const emits = defineEmits(['update:value', 'close'])
const { data } = useRequest(getProviders, {
  onSuccess: (res) => {
    return res.result.map((item: any) => {
      return {
        label: item.name,
        value: item.id,
      };
    });
  }
});

const filterData = reactive(props.value || {
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
      options: data.value,
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
  emits('update:value', filterData);
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