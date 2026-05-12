<template>
  <a-modal
    visible
    :title="title"
    centered
    :width="1000"
    :maskClosable="false"
    @cancel="emits('close')"
  >
    <template #footer>
      <a-space>
        <a-button @click="emits('close')">{{ $t('Save.index.290643-38') }}</a-button>
        <a-button
          type="primary"
          :disabled="!selectedOperator?.code"
          @click="emits('updateCode', selectedOperator?.code)"
          >{{ $t('components.LogDetail.1651510-0') }}</a-button
        >
      </a-space>
    </template>
    <div class="body_height_60">
      <template v-for="(item,index) in operatorList" :key="item.id">
        <div class="selectName">{{ item.name }}</div>
        <a-row :gutter="[24, 24]">
          <a-col :span="6" v-for="i in item.list" :key="i.id">
            <div
              class="options_item"
              :class="{
                options_item_selected:
                  selectedOperator?.id === i.id || item.selectedKey === i.id,
              }"
              @click="() => handleClick(i, item,index)"
            >
              {{ i.name }}
            </div>
          </a-col>
        </a-row>
      </template>
      <div class="markdown" v-if="selectedOperator?.description">
        <j-markdown :source="selectedOperator?.description"></j-markdown>
      </div>
    </div>
  </a-modal>
</template>

<script setup>
const props = defineProps({
  title: {
    type: String,
    default: "",
  },
  name: {
    type: String,
    default: "",
  },
  list: {
    type: Array,
    default: [],
  },
  type: {
    type: String,
    default: "",
  },
});
const emits = defineEmits(["close", "updateCode"]);
const operatorList = ref([]);
const selectedOperator = ref();
const handleClick = (operator, operatorObj,level) => {
  operatorObj.selectedKey = operator.id;
  if(level === 0){
    operatorList.value = operatorList.value.slice(0,1)
    selectedOperator.value = ''
  }
  if (operator.children?.length > 0) {
    operatorList.value.push({
      name: operator.name,
      list: operator.children,
    });
  } else {
    selectedOperator.value = operator;
  }
};
onMounted(() => {
  operatorList.value.push({
    name: props.name,
    list: props.list,
  });
});
</script>
<style lang="less" scoped>
.options_item {
  border: 0.0625rem solid rgb(171, 171, 171);
  text-align: center;
  height: 2.5rem;
  line-height: 2.5rem;
  border-radius: 1.25rem;
}
.options_item_selected {
  border-color: rgb(0, 0, 0);
}
.markdown {
  margin-top: 2rem;
}
.selectName {
  margin: 1rem 0;
}
</style>
