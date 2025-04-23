<template>
  <div style="min-width: 200px">
    <a-form
        class="form"
        layout="vertical"
        :model="formData"
        name="basic"
        ref="formRef"
    >
      <a-form-item
          :label="data.name"
          name="value"
          :rules="[
                    {
                        required: true,
                        message: $t('WritePoint.index.769007-5', [data.name]),
                    },
                ]"
          v-if="
                    data.provider === 'MODBUS_TCP' &&
                    data?.configuration.function === 'Coils'
                "
      >
        <j-card-select
            :showImage="false"
            v-model:value="formData.value"
            :column="2"
            :options="[
                {
                  label: 'true',
                  value: true
                },
                {
                  label: 'false',
                  value: false
                }
            ]"
        />
      </a-form-item>
      <a-form-item
          :label="data.name"
          name="value"
          :rules="[
                    {
                        required: true,
                        message: $t('WritePoint.index.769007-1', [data.name]),
                    },
                    {
                        validator: validatorOpc_UA,
                        trigger: 'change',
                    },
                ]"
          v-else-if="data.provider === 'OPC_UA'"
      >
        <div style="max-height: 150px; overflow-y: auto">
          <template v-for="(i, index) in formData.value">
            <div style="margin-top: 10px">
              <a-input-number
                  v-if="
                                [
                                    'double',
                                    'float',
                                    'llong',
                                    'long',
                                    'integer',
                                    'short',
                                ].includes(valueType)
                            "
                  style="width: 100%"
                  :stringMode="true"
                  :placeholder="$t('WritePoint.index.769007-2')"
                  v-model:value="formData.value[index]"
              />
              <a-select
                  v-else-if="['boolean'].includes(valueType)"
                  style="width: 100%"
                  v-model:value="formData.value[index]"
                  :options="[
                                {
                                    label: $t('WritePoint.index.769007-3'),
                                    value: true,
                                },
                                {
                                    label: $t('WritePoint.index.769007-4'),
                                    value: false,
                                },
                            ]"
                  :placeholder="$t('WritePoint.index.769007-5')"
                  allowClear
                  show-search
                  :filter-option="filterOption"
              />
              <a-date-picker
                  v-else-if="['datetime'].includes(valueType)"
                  style="width: 100%"
                  format="YYYY-MM-DD HH:mm:ss"
                  show-time
                  :placeholder="$t('WritePoint.index.769007-5')"
                  @change="(value, dateString)=>onChange(value,dateString,index)"
              />

              <a-input
                  v-else
                  :placeholder="$t('WritePoint.index.769007-2')"
                  v-model:value="formData.value[index]"
              />
            </div>
          </template>
          <a-space style="margin-top: 10px">
            <a-button @click="formData.value.push('')">+</a-button>
            <a-button
                v-if="formData.value.length !== 1"
                @click="
                            formData.value.splice(formData.value.length - 1, 1)
                        "
            >-
            </a-button
            >
          </a-space>
        </div>
      </a-form-item>
      <a-form-item
          :label="data.name"
          name="value"
          :rules="[
                    {
                        required: true,
                        message: $t('WritePoint.index.769007-1', [data.name]),
                    },
                ]"
          v-else-if="data.provider === 'snap7'"
      >
        <a-input-number
            v-if="s7Type.includes(data.configuration?.type)"
            style="width: 100%"
            :placeholder="$t('WritePoint.index.769007-2')"
            v-model:value="formData.value"
            :stringMode="true"
        />
        <a-select
            v-else-if="['Bool'].includes(data.configuration?.type)"
            style="width: 100%"
            v-model:value="formData.value"
            :options="[
                        {
                            label: $t('WritePoint.index.769007-3'),
                            value: true,
                        },
                        {
                            label: $t('WritePoint.index.769007-4'),
                            value: false,
                        },
                    ]"
            :placeholder="$t('WritePoint.index.769007-5')"
            allowClear
            show-search
            :filter-option="filterOption"
        />
        <a-input
            v-else
            :placeholder="$t('WritePoint.index.769007-2')"
            v-model:value="formData.value"
        />
      </a-form-item>
      <a-form-item
          :label="data.name"
          name="value"
          :rules="
                    ['hex'].includes(valueType)
                        ? [
                              {
                                  required: true,
                                  message: $t('WritePoint.index.769007-1', [data.name]),
                              },
                              {
                                  validator: validateHex,
                                  trigger: 'blur',
                              },
                          ]
                        : [
                              {
                                  required: true,
                                  message: $t('WritePoint.index.769007-1', [data.name]),
                              },
                          ]
                "
          v-else
      >
        <a-input-number
            v-if="valueTypeArray.includes(valueType)"
            style="width: 100%"
            :placeholder="$t('WritePoint.index.769007-2')"
            v-model:value="formData.value"
            stringMode
        />
        <a-select
            v-else-if="['boolean'].includes(valueType)"
            style="width: 100%"
            v-model:value="formData.value"
            :options="[
                        {
                            label: $t('WritePoint.index.769007-3'),
                            value: true,
                        },
                        {
                            label: $t('WritePoint.index.769007-4'),
                            value: false,
                        },
                    ]"
            :placeholder="$t('WritePoint.index.769007-5')"
            allowClear
            show-search
            :filter-option="filterOption"
        />
        <a-date-picker
            v-else-if="['datetime'].includes(valueType)"
            style="width: 100%"
            format="YYYY-MM-DD HH:mm:ss"
            show-time
            :placeholder="$t('WritePoint.index.769007-5')"
            @change="onChange"
        />

        <a-input
            v-else
            :placeholder="$t('WritePoint.index.769007-2')"
            v-model:value="formData.value"
        />
      </a-form-item>
      <a-form-item
          v-if="data?.provider === 'BACNetIp'"
          :rules="[
                    {
                        required: true,
                        message: $t('WritePoint.index.769007-6'),
                    },
                ]"
          :name="['others', 'priority']"
      >
        <template #label>
          <div>
            <span>{{ $t('WritePoint.index.769007-7') }}</span>
            <a-tooltip>
              <template #title
              >{{ $t('WritePoint.index.769007-8') }}
                <br/>
                {{ $t('WritePoint.index.769007-9') }}<br/>
                {{ $t('WritePoint.index.769007-10') }}<br/>
                {{ $t('WritePoint.index.769007-11') }}
              </template
              >
              <AIcon
                  type="QuestionCircleOutlined"
                  style="margin-left: 10px"
              ></AIcon>
            </a-tooltip>
          </div>
        </template>
        <a-select v-model:value="formData.others.priority">
          <a-select-option
              v-for="(i, index) in priority"
              :value="index + 1"
          >
            {{ index + 1 }}
          </a-select-option>
        </a-select>
      </a-form-item>
    </a-form>
  </div>
  <div style="display: flex; justify-content: flex-end; gap: 8px; border-top: 1px solid rgba(0, 0, 0, .06); padding-top: 12px">
    <a-button key="back" @click="handleCancel">{{ $t('WritePoint.index.769007-12') }}</a-button>
    <j-permission-button
        key="submit"
        type="primary"
        :loading="loading"
        @click="handleOk"
        style="margin-left: 8px"
        :hasPermission="`DataCollection:updatePoint`"
    >
      {{ $t('WritePoint.index.769007-13') }}
    </j-permission-button>
  </div>
</template>
<script setup>
import {writePoint} from '@collector/api/data-collect/collector';
import {useI18n} from 'vue-i18n';
import {onlyMessage} from "@jetlinks-web/utils";

const {t: $t} = useI18n();

const props = defineProps({
  data: {
    type: Object,
    default: () => {
    },
  },
});
const emits = defineEmits(['close', 'save'])

const valueType = (
    props.data?.provider === 'OPC_UA'
        ? props?.data?.configuration?.type || 'String'
        : props.data?.configuration?.codec?.provider || 'int8'
).toLocaleLowerCase();

const valueTypeArray = [
  'int8',
  'int16',
  'int32',
  'ieee754_float',
  'ieee754_double',
  'number',
];

const s7Type = [
  'Byte',
  'Word',
  'DWord',
  'USInt',
  'SInt',
  'Int',
  'UDInt',
  'DInt',
  'Real',
  'LReal',
];

const loading = ref(false);
const formRef = ref();
const priority = new Array(16);
const formData = ref({
  value: props.data.provider === 'OPC_UA' ? [''] : '',
  others: {
    priority: 1,
  },
});

const validateHex = async (rule, value) => {
  return /^0[xX][0-9A-Fa-f]+$|^[0-9A-Fa-f]+$/.test(value)
      ? Promise.resolve()
      : Promise.reject($t('WritePoint.index.769007-14'));
};

const validatorOpc_UA = async (rule, value) => {
  return value.length &&
  value.every((i) => {
    return i || i === 0;
  })
      ? Promise.resolve()
      : Promise.reject($t('WritePoint.index.769007-15', [props.data.name]));
};

const collectorId = props.data.collectorId;
const pointId = props.data.id;

const onChange = (value, dateString, index) => {
  if (props.data.provider === 'OPC_UA') {
    formData.value.value[index] = dateString;
  } else {
    formData.value.value = dateString;
  }
};

const handleOk = async () => {
  const data = await formRef.value?.validate();
  if (props.data.provider === 'OPC_UA') {
    data.value = data.value.length === 1 ? data.value[0] : data.value
  }
  const params = {
    ...data,
    pointId,
  };
  loading.value = true;
  const response = await writePoint(collectorId, [params]).finally(() => {
    loading.value = false;
  })
  if(response.success){
    emits('save');
    onlyMessage($t('Point.index.400149-14'), 'success');
  }
};

const handleCancel = () => {
  emits('close');
};

const filterOption = (input, option) => {
  return option.label.toLowerCase().indexOf(input.toLowerCase()) >= 0;
};
</script>

<style lang="less" scoped></style>
