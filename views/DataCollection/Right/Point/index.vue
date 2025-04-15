<template>
  <div class="point">
    <div class="point-top">
      <div class="title">{{ $t('DataCollection.Right.Point.index.476751-1') }}</div>
      <div class="extra">
        <div class="extra-item">
          <span><AIcon type="BranchesOutlined" style="margin-right: 10px"/>{{ $t('DataCollection.Right.Point.index.476751-2') }}</span>
          <a @click="onClick('total')">{{ count.total }}</a>
        </div>
        <div class="extra-item">
          <a-badge status="success" :text="$t('Channel.index.290640-9')"/>
          <a @click="onClick('running')">{{ count.running }}</a></div>
        <div class="extra-item">
          <a-badge status="error" :text="$t('Channel.index.290640-10')"/>
          <a @click="onClick('stopped')">{{ count.stopped }}</a></div>
      </div>
    </div>
    <div class="point-box">
      <Point :key="key" />
    </div>
  </div>
</template>

<script setup>
import Point from './Point.vue'
import {queryPointCount} from "@collector/api/data-collect/collector";
import {useRouteQuery} from "@vueuse/router";
import {useI18n} from "vue-i18n";

const count = reactive({
  total: 0,
  running: 0,
  stopped: 0
})
const {t: $t} = useI18n();
const _data = inject('collector-data', ref({}))
const type = inject('collector-type', ref(''))

const key = ref(0)
const search = useRouteQuery('q')
const searchTarget = useRouteQuery('target');
const queryCount = async (data, type) => {
  const resp = await queryPointCount(data)
  if (resp.success) {
    count[type] = resp.result || 0
  }
}

const handleSearch = () => {
  const params = []
  if(_data.value.id && _data.value.id !== '*'){
    params.push({
      column: type.value === 'channel' ? "collectorId$in-channel-collector" : "collectorId",
      value: _data.value.id,
      type: 'and'
    })
  }
  queryCount({terms: params}, 'total')
  queryCount({
    terms: [
      {
        column: "runningState",
        termType: "eq",
        value: "running"
      },
        ...params
    ]
  }, 'running')
  queryCount({
    terms: [
      {
        column: "runningState",
        termType: "eq",
        value: "stopped"
      },
        ...params
    ]
  }, 'stopped')
}

watch(() => _data.value, () => {
  handleSearch()
}, {
  immediate: true,
  deep: true
})
const handleRouteQuery = (v) => {
  const terms = [
    {
      terms: [{
        column: 'runningState',
        termType: 'eq',
        value: v
      }, null, null],
    },
    {
      terms: [null, null, null],
    }
  ]
  searchTarget.value = 'search-data-collect-point';
  search.value = encodeURI(JSON.stringify({terms}))
  setTimeout(() => {
    key.value++;
  })
}

const onClick = (type) => {
  const obj = {
    total: undefined,
    running: 'running',
    stopped: 'stopped'
  }
  handleRouteQuery(obj[type])
}

watch(
    () => _data.value?.id,
    () => {
      key.value++;
    },
    {immediate: true, deep: true},
);
</script>

<style lang="less" scoped>
.flex-box {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.point {
  display: flex;
  flex-direction: column;
  height: calc(100% - 48px);
  min-height: 600px;

  .point-top {
    display: flex;
    justify-content: space-between;
    margin-bottom: 16px;

    .title {
      font-weight: bold;
    }

    .extra {
      display: flex;
      gap: 24px;
      background-color: rgba(246, 246, 246, .5);
      padding: 8px 16px;
      border-radius: 8px;

      .extra-item {
        display: flex;
        gap: 16px;
      }
    }
  }

  .point-box {
    .flex-box();
  }
}
</style>
