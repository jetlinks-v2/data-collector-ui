<template>
  <div class="task-remote">
    <div class="gateway-items-warp">
      <div
        v-for="(item, index) in formDataModel"
        :key="item.value"
        :class="{
          'gateway-item':true,
          'active': index === activeIndex,
          'error': errorKeys.includes(index)
        }"
        @click="activeIndex = index">
        {{ item.label }}
      </div>
    </div>
    <div class="gateway-form" v-if="formDataModel.length">
      <a-form
        layout="vertical"
        ref="formRef"
        :model="formDataModel[activeIndex]"
        :rules="rules"
      >
        <a-form-item :label="$t('Remote.index.973615-0')" name="type">
          <CheckButton
            v-model:value="formDataModel[activeIndex].type"
            :options="[
                {label: $t('Remote.index.973615-1'), value: 'plugin'},
                {label: $t('Remote.index.973615-2'), value: 'remote'},
              ]"
          />
        </a-form-item>
        <a-row :gutter="[16]">
          <a-col :span="8">
            <a-form-item :label="$t('Remote.index.973615-3')" name="responseTime">
              <a-input-number v-model:value="formDataModel[activeIndex].responseTime" :placeholder="$t('Remote.index.973615-4')" style="width: 100%" >
                <template #addonAfter>
                  {{ $t('Remote.index.973615-5') }}
                </template>
              </a-input-number>
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item :label="$t('Remote.index.973615-6')" name="updateTime">
              <a-input-number v-model:value="formDataModel[activeIndex].updateTime" placeholder="请输入升级超过时间（{{ $t('Remote.index.973615-5') }}）" style="width: 100%" >
                <template #addonAfter>
                  {{ $t('Remote.index.973615-5') }}
                </template>
              </a-input-number>
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item :label="$t('Remote.index.973615-8')" name="firmware">
          <Firmware v-model:value="formDataModel[activeIndex].firmware" />
        </a-form-item>
      </a-form>
    </div>
  </div>
</template>

<script setup name="TaskRemote">
import Firmware from './Firmware.vue';
import { useI18n } from 'vue-i18n';

const { t: $t } = useI18n();

const props = defineProps({
  options: {
    type: Array,
    default: () => []
  }
})

const formRef = ref()
const formDataModel = ref([])
const activeIndex = ref(0)
const errorKeys = ref([])

const rules = {
  type: [
    { required: true, message: $t('Remote.index.973615-9') },
  ],
  responseTime: [
    {
      required: true,
      validator: (_rule, value) => {
        if (value === undefined || value === null) {
          return Promise.reject($t('Remote.index.973615-10'));
        } else {
          return Promise.resolve();
        }
      },
    }
  ],
  updateTime: [
    {
      required: true,
      validator: (_rule, value) => {
        if (value === undefined || value === null) {
          return Promise.reject($t('Remote.index.973615-11'));
        } else {
          return Promise.resolve();
        }
      },
    }
  ],
  firmware: [
    {
      required: true,
      validator: (_rule, value) => {
        if (!value.length) {
          return Promise.reject($t('Remote.index.973615-12'));
        } else {
          return Promise.resolve();
        }
      },
    }
  ]
}

const handleOptions = () => {
  const arr = []
  props.options.forEach(item => {
    arr.push({
      label: item.label,
      value: item.label,
      type: 'plugin',
      responseTime: undefined,
      updateTime: undefined,
      firmware: undefined
    })
  })
  formDataModel.value = arr
}

watch(() => props.options, () => {
  handleOptions()
}, {immediate: true, deep: true})

defineExpose({

})

</script>

<style scoped lang="less">
.gateway-items-warp {
  display: flex;
  gap: 12px;

  .gateway-item {
    border: 1px solid #f1f1f1;
    border-radius: 6px;
    padding: 6px 12px;
    cursor: pointer;

    &.error {
      border-color: @error-color-active;
    }

    &.active {
      border-color: @primary-color;
    }
  }
}
</style>
