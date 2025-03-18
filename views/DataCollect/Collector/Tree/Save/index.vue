<template>
  <a-modal
      :title="data.id ? $t('Save.index.4001415-0') : $t('Save.index.4001415-1')"
      :visible="true"
      width="700px"
      :maskClosable="false"
      @cancel="handleCancel"
  >
    <div style="max-height: 550px; overflow-y: auto">
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
              @change="onChange"
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
        <RenderComponents
            v-if="jsonData"
            :value="jsonData"
        />
        <template v-if="provider !== 'COLLECTOR_GATEWAY'">
          <a-form-item
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
          <p style="color: #616161">
            {{ getTypeTooltip(formData.configuration.inheritBreakerSpec.type) }}
          </p>
        </template>
        <template v-else>
          <a-form-item
              :label="$t('Channel.index.290640-4')"
              :name="['configuration','collectorProvider']"
              :rules="[{ required: true, message: $t('Channel.data.290641-3') }]"
          >
            <a-select
                style="width: 100%"
                v-model:value="formData.configuration.collectorProvider"
                :options="providerListItems"
                :placeholder="$t('Channel.data.290641-3')"
                allowClear
                show-search
                :filter-option="filterOption"
                :disabled="!!id"
            />
          </a-form-item>
          <a-form-item
              :name="['configuration', 'configuration', 'unitId']"
              :rules="LeftTreeRules.unitId"
              :label="$t('Save.index.4001415-30')"
          >
            <a-input-number
                style="width: 100%"
                :placeholder="$t('Save.index.4001415-30')"
                v-model:value="formData.configuration.configuration.unitId"
                :min="0"
                :max="255"
            />
          </a-form-item>

          <a-form-item
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
          <div style="color: #616161">
            <p>{{ $t('Save.index.4001415-41') }} {{ endianData }}</p>
            <p>
              {{ $t('Save.index.4001415-42') }}(int32、ieee754 float)
              {{ $t('Save.index.4001415-43') }}({{ $t('Save.index.4001415-44') }})
            </p>
          </div>
        </template>
        <a-form-item
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
    </div>
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
<script name="CollectorTreeSave" setup>
import {save, update, getProviders} from '@collector/api/data-collect/collector';
import {LeftTreeRules} from '../../data';
import {cloneDeep, omit} from "lodash-es";
import {useI18n} from 'vue-i18n';
import {devGetProtocol} from "@collector/utils/utils";
import RenderComponents from "@collector/components/RenderComponents";

const {t: $t} = useI18n();
const jsonData = ref();

const loading = ref(false);

const props = defineProps({
  data: {
    type: Object,
    default: () => {
    },
  },
  channelListAll: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(['change']);

const id = props.data.id;
const formRef = ref();
const provider = ref()
const providerListItems = ref()
const channel = ref({});
const getProviderList = async () => {
  const resp = await getProviders();
  if (resp.success) {
    providerListItems.value = resp.result.map((item) => ({label: item.name, value: item.id}))
  } else {
    providerListItems.value = []
  }
}

const _channelListAll = computed(() => {
  return props.channelListAll || [];
})

const channelList = computed(() => {
  const list = [];
  _channelListAll.value.forEach((item) => {
    // 编辑时为了防止禁用的数据可以回显问题
    if (props.data.id || item?.state?.value !== 'disabled') {
      list.push({
        ...item,
        provider: item.provider,
        value: item.id,
        label: item.name,
      })
    }
  });
  return list
})

const channelSelect = (key, detail) => {
  provider.value = detail.provider
}

const endianData = computed(() => {
  const {endian, endianIn} = formData.configuration;
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

const formData = reactive({
  channelId: undefined,
  name: '',
  collectorProvider: undefined,
  configuration: {
    unitId: '',
    type: undefined,
    endian: 'BIG',
    endianIn: 'BIG',
    requestTimeout: 2000,
    serializable: false,
    inheritBreakerSpec: {
      type: 'LowerFrequency',
    },
    configuration: {}
  },
  circuitBreaker: {
    // type: 'LowerFrequency',
    type: 'Ignore'
  },
  description: '',
});

const onChange = async (_, node) => {
  channel.value = node
  if (
      node?.provider && !["COLLECTOR_GATEWAY"].includes(node.provider)
  ) {
    jsonData.value = await devGetProtocol(node.provider, "collector");
  } else {
    jsonData.value = undefined
  }
};

const handleOk = async () => {
  const _data = await formRef.value?.validate();

  if (_data) {
    const {name} = _channelListAll.value.find(
        (item) => item.id === formData.channelId,
    );

    let _copyData = _data

    if (['COLLECTOR_GATEWAY'].includes(provider.value)) {
      const copyData = cloneDeep(_data)
      _copyData = omit(copyData, ['configuration', 'collectorProvider'])

      _copyData.configuration = {
        configuration: {
          ...omit(_data.configuration, 'collectorProvider'),
          inheritBreakerSpec: {
            type: 'Ignore'
          }
        },
        collectorProvider: _data.configuration?.collectorProvider
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
          : await update(id, {...props.data, ...params})
      loading.value = false;
      if (response.success) {
        emit('change', true);
      }
    } catch (e) {
      loading.value = false;
    }
  }
};

const getTypeTooltip = (value) => {
  switch (value) {
    case 'LowerFrequency':
      return $t('Save.index.4001415-51');
    case 'Break':
      return $t('Save.index.4001415-52')
    case 'Ignore':
      return $t('Save.index.4001415-53');
    default:
      return '';
  }
}

const handleCancel = () => {
  emit('change', false);
};

const changeCardSelectType = (value) => {
  formData.configuration.inheritBreakerSpec.type = value[0];
};
const changeCardSelectEndian = (value) => {
  formData.configuration.endian = value[0];
};
const changeCardSelectEndianIn = (value) => {
  formData.configuration.endianIn = value[0];
};

const filterOption = (input, option) => {
  return option.label.toLowerCase().indexOf(input.toLowerCase()) >= 0;
};

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

        provider.value = copyValue?.provider
        channel.value = props.channelListAll.find(item => item.id === value.channelId) || {id: value.channelId, name: value.channelName, provider: value.provider}

        if (copyValue.provider === 'COLLECTOR_GATEWAY') {
          Object.assign(formData, copyValue)

          formData.configuration = {
            ...copyValue.configuration,
            ...copyValue.configuration?.configuration
          }
        } else {
          Object.assign(formData, copyValue)
          onChange({},channel.value)
        }
      }
    },
    {immediate: true, deep: true},
);

watch(() => provider.value, () => {
  if (provider.value === 'COLLECTOR_GATEWAY') {
    getProviderList()
  }
}, {
  immediate: true
})

provide("plugin-form", formData);
provide("plugin-form-channel", channel);
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
