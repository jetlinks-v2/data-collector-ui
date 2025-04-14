<template>
  <a-modal
    :title="$t('DataCollection.LeftTree.components.FilterModal.594410-0')"
    visible
    width="50%"
    @cancel="emits('close')"
  >
    <div v-for="item in filterColumn" style="margin-bottom: 20px;" :key="item.key">
      <JTitle :data="item.title">{{item.title}}</JTitle>
      <CardSelect multiple v-model:value="filterData[item.key]" :showImage="false" :options="item.options"></CardSelect>
    </div>
    <template #footer>
      <div class="footer">
        <a-button @click="handleRest">{{ $t('DataCollection.LeftTree.components.FilterModal.594410-1') }}</a-button>
        <a-space>
          <a-button @click="emits('close')">{{ $t('Save.index.290643-38') }}</a-button>
          <a-button type="primary" @click="handleOk">{{ $t('Save.index.290643-39') }}</a-button>
        </a-space>
      </div>
    </template>
  </a-modal>
</template>

<script setup lang="ts">
import CardSelect from "@/components/CardSelect/CardSelect.vue";
import { useRequest } from "@jetlinks-web/hooks";
import { getProviders } from '@collector/api/data-collect/channel';
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

const filterData = reactive(cloneDeep(props.value) || {
  provider: [],
  runningState: [],
  state: [],
  collectorState: [],
})

const filterColumn = computed(() => {
  return [
    {
      title: $t('Channel.index.290640-4'),
      key: 'provider',
      options: data.value,
    },
    {
      title: $t('DataCollection.LeftTree.components.FilterModal.594410-2'),
      key: 'runningState',
      options: [
        {
          label: $t('Channel.index.290640-9'),
          value: 'running',
        },
        {
          label: $t('Channel.index.290640-10'),
          value: 'stopped',
        }
      ]
    },
    {
      title: $t('DataCollection.LeftTree.components.FilterModal.594410-3'),
      key: 'state',
      options: [
        {
          label: $t('Channel.index.290640-6'),
          value: 'enabled',
        },
        {
          label: $t('Channel.index.290640-7'),
          value:'disabled',
        }
      ]
    },
    {
      title: $t('DataCollection.LeftTree.components.FilterModal.594410-4'),
      key:'collectorState',
      options: [
        {
          label: $t('Channel.index.290640-9'),
          value: 'running',
        },
        {
          label: $t('Channel.index.290640-7'),
          value:'disabled',
        },
        {
          label: $t('Channel.index.290640-10'),
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