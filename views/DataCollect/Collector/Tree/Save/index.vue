<template>
    <a-modal
        :title="data.id ? $t('Save.index.4001415-0') : $t('Save.index.4001415-1')"
        :visible="true"
        width="700px"
        :maskClosable="false"
        @cancel="handleCancel"
    >
        <a-form
            class="form"
            layout="vertical"
            :model="formData"
            name="basic"
            autocomplete="off"
            ref="formRef"
        >
            <a-form-item
                :label="$t('Save.index.4001415-2')"
                name="channelId"
                :rules="LeftTreeRules.channelId"
            >
                <a-select
                    style="width: 100%"
                    v-model:value="formData.channelId"
                    :options="channelList"
                    :placeholder="$t('Save.index.4001415-3')"
                    allowClear
                    show-search
                    :filter-option="filterOption"
                    :disabled="!!id"
                    @select="channelSelect"
                />
            </a-form-item>
            <a-form-item
                :label="$t('Save.index.4001415-4')"
                name="name"
                :rules="LeftTreeRules.name"
            >
                <a-input
                    :placeholder="$t('Save.index.4001415-5')"
                    v-model:value="formData.name"
                />

            </a-form-item>
            <a-form-item  v-if="provider === 'snap7'" label="IP" :name="['configuration', 'host']" :rules="LeftTreeRules.host" >
              <a-input v-model:value="formData.configuration.host" autocomplete="off" :placeholder="$t('Save.index.4001415-6')" :disabled="false"/>
            </a-form-item>
            <a-form-item v-if="provider === 'snap7'" :label="$t('Save.index.4001415-7')" :name="['configuration', 'port']" :rules="LeftTreeRules.port">
              <a-input-number style="width: 100%" v-model:value="formData.configuration.port" :precision="0" autocomplete="off" :placeholder="$t('Save.index.4001415-8')"/>
            </a-form-item>
            <a-form-item v-if="provider === 'snap7'" :label="$t('Save.index.4001415-9')" :name="['configuration', 'rack']" :rules="LeftTreeRules.rack">
              <a-input-number style="width: 100%" v-model:value="formData.configuration.rack" autocomplete="off" :placeholder="$t('Save.index.4001415-10')" :maxlength="64" />
            </a-form-item>
            <a-form-item v-if="provider === 'snap7'" :label="$t('Save.index.4001415-11')" :name="['configuration', 'type']" :rules="LeftTreeRules.type">
              <a-select v-model:value="formData.configuration.type" :placeholder="$t('Save.index.4001415-12')" @change="typeChange">
                <a-select-option v-for="item in typeOptions" :key="item.value" :value="item.value">{{ item.label }}</a-select-option>
              </a-select>
            </a-form-item>
            <a-form-item v-if="provider === 'snap7'" :label="$t('Save.index.4001415-13')" :name="['configuration', 'slot']" :rules="LeftTreeRules.slot">
              <a-input-number style="width: 100%" v-model:value="formData.configuration.slot" autocomplete="off" :placeholder="$t('Save.index.4001415-14')" :maxlength="64" :disabled="formData.configuration.type == 'S200' || formData.configuration.type == 'S1200'"/>
            </a-form-item>
            <a-form-item v-if="provider === 'snap7'" :label="$t('Save.index.4001415-15')" :name="['configuration', 'timeout']" :rules="LeftTreeRules.timeout">
              <a-input-number style="width: 100%" v-model:value="formData.configuration.timeout" autocomplete="off" :placeholder="$t('Save.index.4001415-16')" :maxlength="64" />
            </a-form-item>
            <a-form-item v-if="provider === 'snap7'" :label="$t('Save.index.4001415-17')" :name="['configuration', 'serializable']">
              <a-radio-group v-model:value="formData.configuration.serializable">
                <a-radio-button :value="false">{{ $t('Save.index.4001415-18') }}</a-radio-button>
                <a-radio-button :value="true">{{ $t('Save.index.4001415-19') }}</a-radio-button>
              </a-radio-group>
            </a-form-item>
            <template v-if="provider === 'iec104'">
              <a-form-item :label="$t('Save.index.4001415-20')" :name="['configuration', 'host']" :rules="LeftTreeRules.host">
                <a-input v-model:value="formData.configuration.host" autocomplete="off" :placeholder="$t('Save.index.4001415-21')" :disabled="false"/>
              </a-form-item>
              <a-form-item :label="$t('Save.index.4001415-22')" :name="['configuration', 'port']" :rules="LeftTreeRules.port" >
                <a-input-number style="width: 100%" v-model:value="formData.configuration.port" :min="1" :max="65535" :precision="0" autocomplete="off" :placeholder="$t('Save.index.4001415-23')"/>
              </a-form-item>
              <a-form-item :label="$t('Save.index.4001415-24')" :name="['configuration', 'terminnalAddress']" :rules="LeftTreeRules.terminnalAddress">
                <a-input-number style="width: 100%" :min="0" :max="65535" :precision="0" v-model:value="formData.configuration.terminnalAddress" autocomplete="off" :placeholder="$t('Save.index.4001415-25')"></a-input-number>
              </a-form-item>
              <a-form-item :label="$t('Save.index.4001415-26')" :name="['configuration', 'frameAmountMax']" :rules="LeftTreeRules.frameAmountMax">
                <a-input-number style="width: 100%" v-model:value="formData.configuration.frameAmountMax" :placeholder="$t('Save.index.4001415-27')" :min="1" :maxlength="16" :precision="0"></a-input-number>
              </a-form-item>
            </template>
            <a-form-item
                v-if="provider === 'COLLECTOR_GATEWAY'"
                :label="$t('Save.index.4001415-28')"
                :name="['collectorProvider']"
                :rules="[{ required: true, message: $t('Save.index.4001415-29') }]"
            >
              <a-select
                  style="width: 100%"
                  v-model:value="formData.collectorProvider"
                  :options="providerListItems"
                  :placeholder="$t('Save.index.4001415-29')"
                  allowClear
                  show-search
                  :filter-option="filterOption"
                  :disabled="!!id"
              />
            </a-form-item>
            <a-form-item
                v-if="visibleUnitId"
                :name="['configuration', 'unitId']"
                :rules="LeftTreeRules.unitId"
                :label="$t('Save.index.4001415-20')"
            >
              <a-input-number
                  style="width: 100%"
                  :placeholder="$t('Save.index.4001415-30')"
                  v-model:value="formData.configuration.unitId"
                  :min="0"
                  :max="255"
              />
            </a-form-item>
            <template v-if="provider === 'BACNetIp'">
              <a-form-item
                :label="$t('Save.index.4001415-31')"
                :name="['configuration', 'instanceNumber']"
                :rules="[{ required: true, trigger: 'change' }]"
              >
                <a-input-number
                  style="width: 100%"
                  v-model:value="formData.configuration.instanceNumber"
                  :placeholder="$t('Save.index.4001415-32')"
                  :min="0"
                  :precision="0"
                  :disabled="route.query.id ? true : false"
                />
              </a-form-item>
              <a-form-item :label="$t('Save.index.4001415-33')" :name="['configuration', 'address']"  :rules="LeftTreeRules.address">
                <a-input
                  style="width: 100%"
                  v-model:value="formData.configuration.address"
                  :maxlength="64"
                  :placeholder="$t('Save.index.4001415-34')"
                >
                </a-input>
              </a-form-item>
            </template>
            <a-form-item
                v-if="provider !== 'COLLECTOR_GATEWAY'"
                :name="['configuration', 'inheritBreakerSpec', 'type']"
                :rules="LeftTreeRules.type"
                :label="$t('Save.index.4001415-35')"
            >
              <j-card-select
                  :showImage="false"
                  v-model:value="formData.configuration.inheritBreakerSpec.type"
                  :options="[
                                      { label: $t('Save.index.4001415-36'), value: 'LowerFrequency' },
                                      { label: $t('Save.index.4001415-37'), value: 'Break' },
                                      { label: $t('Save.index.4001415-38'), value: 'Ignore' },
                                  ]"
                  @change="changeCardSelectType"
              />
            </a-form-item>
            <p style="color: #616161" v-if="provider !== 'COLLECTOR_GATEWAY'">
              {{ getTypeTooltip(formData.configuration.inheritBreakerSpec.type) }}
            </p>
            <a-form-item
                v-if="visibleEndian"
                :name="['configuration', 'endian']"
                :rules="LeftTreeRules.endian"
                :label="$t('Save.index.4001415-39')"
            >
            <j-card-select
                :showImage="false"
                v-model:value="formData.configuration.endian"
                :options="[
                                    { label: 'AB', value: 'BIG' },
                                    { label: 'BA', value: 'LITTLE' },
                                ]"
                @change="changeCardSelectEndian"
                :column="2"
            />
            </a-form-item>
            <a-form-item
                v-if="visibleEndian"
                :name="['configuration', 'endianIn']"
                :rules="LeftTreeRules.endianIn"
                :label="$t('Save.index.4001415-40')"
            >
            <j-card-select
                :showImage="false"
                v-model:value="formData.configuration.endianIn"
                :options="[
                                    { label: 'AB', value: 'BIG' },
                                    { label: 'BA', value: 'LITTLE' },
                                ]"
                @change="changeCardSelectEndianIn"
                :column="2"
            />
            </a-form-item>
            <div v-if="visibleEndian" style="color: #616161">
            <p>{{ $t('Save.index.4001415-41') }} {{ endianData }}</p>
            <p>
              {{ $t('Save.index.4001415-42') }}(int32、ieee754 float)
              {{ $t('Save.index.4001415-43') }}({{ $t('Save.index.4001415-44') }})
            </p>
            </div>
            <a-form-item
                v-if="provider !== 'snap7'"
                :name="['configuration', 'requestTimeout']"
                :rules="LeftTreeRules.requestTimeout"
                :label="$t('Save.index.4001415-45')"
            >
                <a-input-number
                    style="width: 100%"
                    :placeholder="$t('Save.index.4001415-46')"
                    v-model:value="formData.configuration.requestTimeout"
                    addon-after="ms"
                    :max="60000"
                    :min="2000"
                />
            </a-form-item>
            <a-form-item :label="$t('Save.index.4001415-47')" name="description">
                <a-textarea
                    :placeholder="$t('Save.index.4001415-48')"
                    v-model:value="formData.description"
                    :maxlength="200"
                    :rows="3"
                    showCount
                />
            </a-form-item>
        </a-form>
        <template #footer>
            <a-button key="back" @click="handleCancel">{{ $t('Save.index.4001415-49') }}</a-button>
            <j-permission-button
                key="submit"
                type="primary"
                :loading="loading"
                @click="handleOk"
                style="margin-left: 8px"
                :hasPermission="`DataCollect/Collector:${
                    id ? 'update' : 'add'
                }`"
            >
                {{ $t('Save.index.4001415-50') }}
            </j-permission-button>
        </template>
    </a-modal>
</template>
<script lang="ts" name="CollectorTreeSave" setup>
import { save, update, getProviders } from '../../../../../api/data-collect/collector';
import { LeftTreeRules } from '../../data';
import type { FormInstance } from 'ant-design-vue';
import {cloneDeep, omit} from "lodash-es";
// import {protocolList} from "@/utils/consts";
import { useI18n } from 'vue-i18n';

const { t: $t } = useI18n();
const route = useRoute()

const loading = ref(false);
const visibleEndian = ref(false);
const visibleUnitId = ref(false);

const props = defineProps({
    data: {
        type: Object,
        default: () => {},
    },
    channelListAll: {
        type: Array,
        default: () => []
    }
});

const emit = defineEmits(['change']);

const typeOptions = ref([
  {value: 'S200', label: 'S7-200'},
  {value: 'S300', label: 'S7-300'},
  {value: 'S400', label: 'S7-400'},
  {value: 'S1200', label: 'S7-1200'},
  {value: 'S1500', label: 'S7-1500'},
])

const id = props.data.id;
const formRef = ref<FormInstance>();
const provider = ref()
const providerListItems = ref()

const geyProviderList = async () => {
  const resp: any = await getProviders();
  if (resp.success) {
    providerListItems.value = resp.result.map((item: any) => ({ label: item.name, value: item.id }))
  } else {
    providerListItems.value = []
  }
}

const _channelListAll = computed(() => {
    return props.channelListAll || [];
})

const channelList = computed(() => {
  const  list:any = [];
  _channelListAll.value.forEach((item: any) => {
    if(item?.state?.value !== 'disabled'){
      list.push({
        provider: item.provider,
        value: item.id,
        label: item.name,
    })
    }
  });
  return list
})

const channelSelect = (key: string, detail: any) => {
  console.log(detail)
  provider.value = detail.provider
}

const endianData = computed(() => {
    const { endian, endianIn } = formData.value.configuration;
    if (endian) {
        if (endianIn) {
            if (endian === 'BIG') {
                return endianIn === 'BIG' ? 'ABCD' : 'BADC';
            } else {
                return endianIn === 'BIG' ? 'CDAB' : 'DCBA';
            }
        } else {
            return endian === 'BIG' ? 'ABCD' : 'DCBA';
        }
    }
});

const formData = ref<any>({
    channelId: undefined,
    name: '',
    collectorProvider: undefined,
    configuration: {
        unitId: '',
        type: undefined,
        endian: 'BIG',
        endianIn: 'BIG',
        requestTimeout: 2000,
        serializable:false,
        inheritBreakerSpec: {
          type: 'LowerFrequency',
        }
    },
    circuitBreaker: {
        // type: 'LowerFrequency',
      type: 'Ignore'
    },
    description: '',
});

const handleOk = async () => {
    const _data: any = await formRef.value?.validate();

    if (_data) {
      const { name } = _channelListAll.value.find(
          (item: any) => item.id === formData.value.channelId,
      );

      let _copyData = _data

      if (['COLLECTOR_GATEWAY'].includes(provider.value)) {
        const copyData = cloneDeep(_data)
        _copyData = omit(copyData, ['configuration', 'collectorProvider'])

        _copyData.configuration = {
          configuration: {
            ..._data.configuration,
            inheritBreakerSpec: {
              type: 'Ignore'
            }
          },
          collectorProvider: _data.collectorProvider
        }
      }

      const params = {
        ..._copyData,
        provider: provider.value,
        channelName: name,
        circuitBreaker: {
          type: 'Ignore'
        }
      };

      loading.value = true;

      try {
        const response = !id
            ? await save(params)
            : await update(id, { ...props.data, ...params })
        loading.value = false;
        if (response.success) {
          emit('change', true);
        }
      } catch (e) {
        loading.value = false;
      }
    }
};

const getTypeTooltip = (value: string) => {
  switch (value) {
    case 'LowerFrequency': return $t('Save.index.4001415-51');
    // case 'Break': return '连续10分钟异常，停止采集数据进入断开状态，设备重新启用后恢复采集状态。'
    case 'Break': return $t('Save.index.4001415-52')
    case 'Ignore': return $t('Save.index.4001415-53');
    default: return '';
  }
}

const handleCancel = () => {
    emit('change', false);
};

const changeCardSelectType = (value: Array<string>) => {
  formData.value.configuration.inheritBreakerSpec.type = value[0];
};
const changeCardSelectEndian = (value: Array<string>) => {
    formData.value.configuration.endian = value[0];
};
const changeCardSelectEndianIn = (value: Array<string>) => {
    formData.value.configuration.endianIn = value[0];
};

const filterOption = (input: string, option: any) => {
    return option.label.toLowerCase().indexOf(input.toLowerCase()) >= 0;
};

const typeChange = (val:any)=>{
  if(val == 'S200' || val == 'S1200') {
    formData.value.configuration.slot = 1
  }
}

watch(
    () => formData.value.channelId,
    (value) => {
        const dt:any = _channelListAll.value.find((item:any) => item.id === value);
        visibleUnitId.value = visibleEndian.value =
            dt?.provider && ['MODBUS_TCP', 'COLLECTOR_GATEWAY'].includes(dt?.provider);
    },
    { deep: true },
);

watch(
    () => props.data,
    (value) => {
        if (value.id) {
          let copyValue = cloneDeep(value)
          if (!copyValue?.configuration?.inheritBreakerSpec && copyValue.provider !== 'COLLECTOR_GATEWAY') {
            copyValue.configuration = {
              ...copyValue.configuration,
              inheritBreakerSpec: {
                type: value.circuitBreaker?.type
              }
            }
            copyValue.circuitBreaker.type = 'Ignore'
          }

          if (copyValue.provider === 'COLLECTOR_GATEWAY') {
            formData.value = {
              ...omit(copyValue, ['configuration']),
              ...copyValue.configuration,
            }
          } else {
            formData.value = copyValue
          }

          provider.value = copyValue?.provider
        };
    },
    { immediate: true, deep: true },
);

watchEffect(() => {
  if (provider.value === 'COLLECTOR_GATEWAY') {
    geyProviderList()
  }
})

</script>

<style lang="less" scoped>
.form {
    .form-radio-button {
        width: 148px;
        height: 80px;
        padding: 0;
        img {
            width: 100%;
            height: 100%;
        }
    }
    .form-upload-button {
        margin-top: 10px;
    }
    .form-submit {
        background-color: @primary-color !important;
    }
}
</style>
