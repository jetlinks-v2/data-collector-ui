<template>
  <a-modal
    :title="$t('DataCollect.index.400150-17')"
    open
    width="50%"
    @cancel="emits('close')"
  >
    <div v-for="item in filterColumn" style="margin-bottom: 20px;" :key="item.key">
      <JTitle :data="item.title">{{item.title}}</JTitle>
      <JCardSelect multiple v-model:value="filterData[item.key]" :showImage="false" :options="item.options"></JCardSelect>
    </div>
    <template #footer>
      <div class="footer">
        <a-button @click="handleRest">{{ $t('DataCollect.index.400150-18') }}</a-button>
        <a-space>
          <a-button @click="emits('close')">{{ $t('DataCollect.index.400150-19') }}</a-button>
          <a-button type="primary" @click="handleOk">{{ $t('DataCollect.index.400150-20') }}</a-button>
        </a-space>
      </div>
    </template>
  </a-modal>
</template>

<script setup lang="ts">
import { useProvider } from "../../hook/useProvider";
import { getProviders } from '@data-collector-ui/api/data-collect/channel';
import { cloneDeep } from "lodash-es";
import { useI18n } from "vue-i18n";

const { t: $t } = useI18n()

const emits = defineEmits(['update:value', 'close', 'save'])
const { data } = useProvider();

const filterValue = inject('filter-value')

const filterData = reactive(cloneDeep(filterValue) || {
  provider: [],
  runningState: [],
  state: [],
  collectorState: [],
})


const filterColumn = computed(() => {
  return [
    {
      title: $t('DataCollect.index.400150-13'),
      key: 'provider',
      options: data.value?.map((item: any) => {
        return {
          label: item.name,
          value: item.id,
        }
      }),
    },
    {
      title: $t('DataCollect.index.400150-21'),
      key: 'runningState',
      options: [
        {
          label: $t('DataCollect.index.400150-8'),
          value: 'running',
        },
        {
          label: $t('DataCollect.index.400150-9'),
          value: 'stopped',
        }
      ]
    },
    {
      title: $t('DataCollect.index.400150-22'),
      key: 'state',
      options: [
        {
          label: $t('DataCollect.index.400150-24'),
          value: 'enabled',
        },
        {
          label: $t('DataCollect.index.400150-25'),
          value:'disabled',
        }
      ]
    },
    {
      title: $t('DataCollect.index.400150-23'),
      key:'collectorState',
      options: [
        {
          label: $t('DataCollect.index.400150-8'),
          value: 'running',
        },
        {
          label: $t('DataCollect.index.400150-25'),
          value:'disabled',
        },
        {
          label: $t('DataCollect.index.400150-9'),
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
  // emits('update:value', cloneDeep(filterData));
  Object.assign(filterValue, filterData)
  emits('save');
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
