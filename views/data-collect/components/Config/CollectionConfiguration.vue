<template>
  <Collapsible title="采集配置" tip="设置访问类型,采集频率及数据推送等设置" v-model:value="data">
    <a-row :gutter="24">
      <a-col :span="12">
        <a-form-item label="访问类型" name="accessModes" :rules="[
            {
              required: true,
              message: '请选择',
            }
          ]"
        >
          <!-- todo: 根据provider访问类型?-->
          <j-check-button
              v-model:value="formData.accessModes"
              :multiple="true"
              :options="[
                { label: '读', value: 'read' },
                { label: '写', value: 'write' },
                { label: '订阅', value: 'subscribe'},
              ]"
          />
        </a-form-item>
      </a-col>
      <a-col :span="12">
        <a-form-item
            :label="$t('Save.SaveModBus.4001413-30')"
            :name="['configuration', 'interval']"
            :rules="[
        {
            required: true,
            message: $t('Collector.data.400141-13'),
        },
        {
            pattern: /^\d+$/,
            message: $t('Collector.data.400141-14'),
        },
    ]"
        >
          <a-input-number
              style="width: 100%"
              :placeholder="$t('Save.SaveModBus.4001413-31')"
              v-model:value="formData.configuration.interval"
              addon-after="ms"
              :max="2147483648"
              :min="0"
          />
        </a-form-item>
      </a-col>
      <a-col>
        <a-form-item label="" :name="['features']">
          <a-checkbox-group v-model:value="formData.features">
            <a-checkbox value="changedOnly" name="type">
              {{ $t('Save.SaveModBus.4001413-32') }}
            </a-checkbox>
          </a-checkbox-group>
        </a-form-item>
      </a-col>
    </a-row>
  </Collapsible>
</template>

<script setup>
import Collapsible from "./Collapsible/index.vue";
import {useI18n} from "vue-i18n";

const {t: $t} = useI18n();

const formData = inject('formData', reactive({
  configuration: {
    interval: 3000
  },
  features: []
}))

const data = ref('template')
</script>

<style lang="less" scoped>

</style>

