<template>
  <div class="death-area">
    <span class="tip" style="margin-bottom: 12px">{{$t('DataCollection.Right.Point.DeathArea.476751-1')}}</span>
    <div class="top">
      <div>
        <div>{{ $t('Save.SaveBACNet.4001416-13') }}</div>
        <div class="tip">{{ $t('Save.SaveBACNet.4001416-14') }}</div>
      </div>
      <a-switch v-model:checked="deathArea" @change="handleDeathArea"/>
    </div>
    <div v-if="deathArea" class="area">
      <div class="content">
        <a-form-item-rest>
          <a-radio-group v-model:value="tag" @change="handleTag">
            <a-radio-button value="currentValue">{{ $t('Save.DeathArea.4001417-0') }}</a-radio-button>
            <a-radio-button value="this['currentValue'] - this['lastValue']">{{$t('Save.DeathArea.4001417-1')}}</a-radio-button>
          </a-radio-group>
        </a-form-item-rest>
        <a-tooltip v-if="tag !== 'currentValue'"
                   :title="$t('Save.DeathArea.4001417-2')">
          <AIcon type="QuestionCircleOutlined" style="margin-left: 10px;font-size: 18px;color: rgb(153, 153, 153)"/>
        </a-tooltip>
      </div>
      <a-form-item-rest>
        <div v-if="tag === 'currentValue'" class="fixed">
          <div class="fixed-content">
            <template v-for="(item, index) in _value">
              <div class="fixed-content-item">
                <a-space v-if="item.terms.length == 1">
                  <a-input-number
                      v-model:value="item.terms[0].value"
                      style="width: 100%"
                      :placeholder="$t('Save.DeathArea.4001417-3')"
                      :max="item.terms[1] ? item.terms[1].value : 65536"
                      :min="1"
                      @change="handleChange"
                  />
                  <a-select
                      v-model:value="item.terms[0].termType"
                      :showArrow="false"
                      :options="item.terms.length !== 2 ? termTypeOptions(item.terms.length) : leftOptions"
                      :placeholder="$t('Save.DeathArea.4001417-4')"
                      @change="handleChange"
                  />
                </a-space>
                <a-space v-else>
                  <a-input-number
                      v-model:value="item.terms[0].value"
                      style="width: 100%"
                      :placeholder="$t('Save.DeathArea.4001417-3')"
                      :max="item.terms[1] ? item.terms[1].value : 65536"
                      :min="1"
                      @change="handleChange"
                  />
                  <a-select
                      v-model:value="item.terms[0].termType"
                      :showArrow="false"
                      :options="item.terms.length !== 2 ? termTypeOptions(item.terms.length) : leftOptions"
                      :placeholder="$t('Save.DeathArea.4001417-4')"
                      @change="handleChange"
                  />

                  <span style="white-space: nowrap">{{ $t('Save.DeathArea.4001417-5') }}</span>
                  <a-select
                      :showArrow="false"
                      v-model:value="item.terms[1].termType"
                      :options="termTypeOptions(item.terms.length)"
                      :placeholder="$t('Save.DeathArea.4001417-4')"
                      @change="handleChange"
                  />
                  <a-input-number
                      v-model:value="item.terms[1].value"
                      style="width: 100%"
                      :placeholder="$t('Save.DeathArea.4001417-3')"
                      :min="item.terms[0].value"
                      @change="handleChange"
                  />
                </a-space>
                <a-button @click="handleSwap(index)" shape="round">
                  <AIcon type="SwapOutlined"/>
                </a-button>
                <div v-if="_value.length !== 1" class="remove">
                  <a-button type="link" danger style="padding: 0;" @click="removeTerms(index)">
                    <AIcon style="font-size: 16px" type="CloseCircleFilled"></AIcon>
                  </a-button>
                </div>
              </div>
            </template>
          </div>
          <a-button :disabled="_value.length > 20" shape="circle" @click="addTerms">
            <AIcon type="PlusOutlined"></AIcon>
          </a-button>
        </div>
        <div v-else class="percent">
          <div class="percent-title">{{ $t('Save.DeathArea.4001417-5') }}</div>
          <a-input-number
              v-model:value="percentValue"
              style="width: 200px"
              addon-after="%"
              :placeholder="$t('Save.DeathArea.4001417-3')"
              :min="1"
              @change="handlePercent"
              :max="65535"
          />
        </div>
      </a-form-item-rest>
    </div>
  </div>
</template>

<script setup lang='ts'>
import {Form} from 'ant-design-vue';
import {useI18n} from "vue-i18n";

const formItemContext = Form.useInjectFormItemContext()

const {t: $t} = useI18n();

const props = defineProps({
  value: {
    type: Array,
    default: () => []
  }
})

const emits = defineEmits(['update:value', 'change']);
const _value = ref<any>(props.value)
const deathArea = ref(false);
const tag = ref<string>('currentValue')
const percentValue = ref()


const termTypeOptions = computed(() => {
  return (val: number) => {
    if (val === 1) {
      return [
        {label: '=', value: 'neq'},
        {label: '>', value: 'lte'},
        {label: '<', value: 'gte'},
        {label: '≥', value: 'lt'},
        {label: '≤', value: 'gt'},
      ];
    } else {
      return [
        {label: '<', value: 'gte'},
        {label: '≤', value: 'gt'},
      ];
    }
  }
});

const leftOptions = [
  {label: '<', value: 'lte'},
  {label: '≤', value: 'lt'},
];

const handleDeathArea = (e: any) => {
  if (e) {
    _value.value = [{
      terms: [{
        column: 'currentValue',
        value: undefined,
        termType: undefined,
        type: 'and',
      }]
    }]
  } else {
    _value.value = []
  }
  handleChange()
}

const handleSwap = (index: number) => {
  if (_value.value[index].terms.length === 1) {
    _value.value[index].terms[0].termType = undefined
    _value.value?.[index].terms?.push({
      column: 'currentValue',
      value: undefined,
      termType: undefined,
      type: 'or',
    })
    _value.value[index].terms[0].type = 'or'
  } else {
    _value.value[index].terms[0].type = 'and'
    _value.value[index].terms.splice(1, 1)
  }
  handleChange()
}

const handleTag = (e: any) => {
  if (e.target.value === 'currentValue') {
    _value.value = [{
      terms: [{
        column: 'currentValue',
        value: undefined,
        termType: undefined,
        type: 'and',
      }]
    }]
  } else {
    _value.value = [
      {
        terms: [
          {
            column: `this['currentValue'] - this['lastValue']*init/100`,
            value: 0,
            termType: 'lt',
            type: 'or',
          },
          {
            column: `this['currentValue'] - this['lastValue']*0/100`,
            value: 0,
            termType: 'gt',
            type: 'or',
          }
        ]
      }
    ]
  }
  handleChange()
}

const handlePercent = (e: any) => {
  if (e) {
    _value.value = [
      {
        terms: [
          {
            column: `this['currentValue'] - this['lastValue'] * ${100 - e}/100`,
            value: 0,
            termType: 'lt',
            type: 'or',
          },
          {
            column: `this['currentValue'] - this['lastValue'] * ${e + 100}/100`,
            value: 0,
            termType: 'gt',
            type: 'or',
          }
        ]
      }
    ]
  } else {
    _value.value = [
      {
        terms: [
          {
            column: `this['currentValue'] - this['lastValue'] * 99/100`,
            value: 0,
            termType: 'lt',
            type: 'or',
          },
          {
            column: `this['currentValue'] - this['lastValue'] * 101/100`,
            value: 0,
            termType: 'gt',
            type: 'or',
          }
        ]
      }
    ]
  }
  handleChange()
}

const handlePercentProps = (arr: any) => {
  const obj = arr.find((item: any) => item.termType === 'lt')
  const val = obj.column.split('*')[1].split('/')[0]
  percentValue.value = val !== 'init' ? 100 - val : undefined
}

const handleChange = () => {
  emits('update:value', _value.value)
  emits('change', _value.value)
  formItemContext.onFieldChange()
}

const addTerms = () => {
  _value.value.push({
    terms: [{
      column: 'currentValue',
      value: undefined,
      termType: undefined,
      type: 'and',
    }],
  })
}

const removeTerms = (_index: number) => {
  _value.value.splice(_index, 1)
}

watch(
    () => props.value,
    (val: any) => {
      if (val && val.length !== 0) {
        deathArea.value = true
        if (val && val[0].terms[0]?.column === 'currentValue') {
          tag.value = 'currentValue'
          _value.value = val
        } else {
          handlePercentProps(val?.[0].terms)
          tag.value = `this['currentValue'] - this['lastValue']`
        }
      }
    },
    {deep: true, immediate: true}
)


</script>

<style scoped lang='less'>
.death-area {

  .top {
    padding: 12px;
    display: flex;
    align-items: center;
    border: 1px solid #d9d9d9;
    border-radius: 6px;
    justify-content: space-between;

    .tip {
      color: #333333;
      font-size: 12px;
    }
  }

  .area {
    border: 1px solid #d9d9d9;
    border-top: 0;
    width: 100%;
    padding: 12px;
  }
}


.fixed {

  .fixed-content {
    max-height: 220px;
    overflow-y: auto;
    padding: 12px 12px 12px 0;

    .fixed-content-item {
      display: flex;
      gap: 12px;
      padding: 12px;
      border: 1px solid #d9d9d9;
      border-radius: 6px;
      position: relative;
      margin-bottom: 12px;

      .remove {
        position: absolute;
        display: none;
        right: -6px;
        top: -12px;
        z-index: 8;
      }

      &:hover {
        .remove {
          display: block;
        }
      }
    }
  }
}

.percent {
  display: flex;
  align-items: center;
  padding: 12px;

  .percent-title {
    margin-right: 10px;
  }
}
</style>
