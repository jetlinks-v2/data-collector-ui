<template>
  <a-modal open :title="$t('DataCollect.index.400151-23')" width="800px" @cancel="emits('close')" @ok="onSave">
    <p>{{ $t('DataCollect.index.400151-24') }}</p>
    <Item
        :title="$t('DataCollect.index.400151-25')"
        provider="base"
        :value="_value"
        ref="baseRef"
    />
    <div v-for="item in _options" :key="item.id">
      <Item
          :title="item.name"
          :provider="item.id"
          :value="_value"
          ref="itemRef"
      />
    </div>
  </a-modal>
</template>

<script setup>
import {useI18n} from "vue-i18n";
import {useProvider} from "@data-collector-ui/views/data-collect/hook/useProvider";
import Item from "./Item.vue";
import {map} from "lodash-es";

const {t: $t} = useI18n();

const props = defineProps({
  data: {
    type: Array,
    default: () => [],
  },
  collectorData: {
    type: Object,
    default: () => {
    },
  }
})
const emits = defineEmits(['close', 'save']);

const {data: options} = useProvider();
const baseRef = ref()
const itemRef = ref()

const _options = computed(() => {
  const _provider = props.collectorData.provider
  return (options.value || []).filter(i => !_provider || i.id === _provider)
})
const _value = computed(() => map(props.data, 'key'))

const onSave = () => {
  const arr = []
  const base = baseRef.value?.onSave();
  arr.push(...base);
  (itemRef.value || []).map(i => {
    const _item = i.onSave()
    arr.push(..._item)
  })
  const _arr = arr.filter(i => i)
  emits('save', [..._arr]);
}
</script>

<style lang="less" scoped>

</style>
