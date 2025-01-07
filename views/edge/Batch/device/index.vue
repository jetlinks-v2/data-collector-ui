<template>
  <div class="type-select-warp">
      <div class="tips"> <AIcon type="icon-bianyuanwangguan"/> {{ $t('device.index.407672-0') }}</div>
      <div class="card-warp">
        <div
          v-for="item in options"
          :class="{
            'card-item': true,
            'active': selectKey === item.value
          }"
          @click="() => typeSelect(item.value)"
        >
            <div class="icon"></div>
            <div class="content">
              <div class="title">{{ item.label }}</div>
              <div class="tip">{{ item.tip }}</div>
            </div>
        </div>
        <div class="card-item more">
          <div class="content">
            <div class="title">{{ $t('device.index.407672-1') }}</div>
            <div class="tip">{{ $t('device.index.407672-2') }}</div>
          </div>
        </div>
      </div>
    <div>
      <DeviceSelect v-if="selectKey === 'device'"/>
    </div>
  </div>
</template>

<script setup name="BatchDevice">
import DeviceSelect from './device.vue';
import { useI18n } from 'vue-i18n';

const { t: $t } = useI18n();

const options = [
  {
    label: $t('device.index.407672-3'),
    tip: $t('device.index.407672-4'),
    icon: '',
    value: 'device'
  }
]

const selectKey = ref(options[0].value)

const typeSelect = (e) => {
  selectKey.value = e
}

</script>

<style scoped lang="less">
.type-select-warp {
  flex: 1 1 0;
  display: flex;
  flex-direction: column;

  .tips {
    margin-bottom: 16px;
  }

  .card-warp {
    display: grid;
    padding: 12px 0;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 16px;

    .card-item {
      border: 1px solid #D9D9D9;
      display: flex;
      cursor: pointer;
      padding: 36px 24px;
      gap: 16px;
      align-items: center;
      border-radius: 6px;

      > .icon {
        width: 40px;
        height: 40px;
        border-radius: 6px;
        background-color: #E6F4FF;
      }

      .content {
        .title {
          color: @font-gray-900;
          font-size: 20px;
        }

        .tip {
          color: @font-gray-600;
          font-size: 16px;
        }
      }

      &.more {
        justify-content: center;
        background-color: #F5F5F5;
        border-color: #F5F5F5;
      }

      &.active {
        border-color: @primary-color-active;
      }
    }
  }

  .header {
    margin-bottom: 12px;
  }
}
</style>
