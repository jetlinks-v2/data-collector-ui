<template>
  <a-button
      v-if="!value"
      style="width: 100%"
      @click="showModal"
  >
    {{ $t('Save.GateWayFormItem.290644-0') }}
  </a-button>
  <div v-else class="gateway-form-item">
    <span>
      <j-ellipsis>
        {{ name }}
      </j-ellipsis>
    </span>
    <a-button type="link" @click="showModal">
      {{ $t('Save.GateWayFormItem.290644-1') }}
    </a-button>
  </div>
  <DeviceModal
      v-if="visible"
      :name="name"
      :value="value"
      @cancel="cancel"
      @confirm="confirm"
  />
</template>

<script name="GateWayFormItem" setup>
import DeviceModal from './GateWayDeviceModal.vue'
import { useI18n } from 'vue-i18n';

const {t: $t} = useI18n();

const props = defineProps({
  value: {
    type: String,
    default: undefined
  },
  name: {
    type: String,
    default: undefined
  }
})

const emit = defineEmits(['update:value', 'update:name'])

const visible = ref(false)

const showModal = () =>{
  visible.value = true
}

const cancel = () => {
  visible.value = false
}

const confirm = (select) => {
  console.log(select)
  emit('update:value', select.id)
  emit('update:name', select.name)
  cancel()
}

</script>

<style lang="less" scoped>
.gateway-form-item {
  display: flex;
  >span {
    line-height: 32px;
    max-width: calc(100% - 88px);
  }
}
</style>