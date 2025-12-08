<template>
  <j-page-container>
    <FullPage>
      <div class="collect-warp">
        <Left @change="onChange"/>
        <div class="right">
          <Right/>
        </div>
      </div>
    </FullPage>
  </j-page-container>
</template>

<script setup>
import Left from './Left.vue'
import Right from './Right.vue'
import {COLLECTOR_DATA, COLLECTOR_TYPE} from "./data";

const current = ref({
  id: 'all'
})
const type = ref('all')

provide(COLLECTOR_TYPE, type) // all/channel/collector
provide(COLLECTOR_DATA, current)

const onChange = (_type) => {
  type.value = _type
  if(_type === 'channel') {
    current.value = {
      "id": "1993224439875837952",
      "name": "这是通道",
      "provider": "MODBUS_TCP",
      "configuration": {
        "host": "192.168.33.81",
        "port": 502
      },
      "creatorId": "1199596756811550720",
      "createTime": 1764056713438,
      "state": {
        "text": "正常",
        "value": "enabled"
      },
      "runningState": {
        "text": "运行中",
        "value": "running"
      },
      "circuitBreaker": {
        "type": "Ignore",
        "maxConsecutiveErrors": 20,
        "lowerFrequencyRetryInterval": 60,
        "breakMaxErrorDuration": 600
      },
      "collectorNumber": 1
    }
  } else if(_type === 'collector') {
    current.value = {
      "id": "1993224613490663424",
      "name": "这是采集器",
      "description": "",
      "provider": "MODBUS_TCP",
      "channelId": "1993224439875837952",
      "channelName": "这是通道",
      "configuration": {
        "inheritBreakerSpec": {
          "type": "LowerFrequency"
        },
        "requestTimeout": 2000,
        "unitId": 2,
        "endian": "BIG",
        "endianIn": "BIG"
      },
      "creatorId": "1199596756811550720",
      "createTime": 1764056754831,
      "state": {
        "text": "正常",
        "value": "enabled"
      },
      "runningState": {
        "text": "运行中",
        "value": "running"
      },
      "uniformState": {
        "text": "--",
        "value": "none"
      },
      "serverId": "jetlinks-1",
      "circuitBreaker": {
        "type": "Ignore",
        "maxConsecutiveErrors": 20,
        "lowerFrequencyRetryInterval": 60,
        "breakMaxErrorDuration": 600
      },
      "pointNumber": 0
    }
  }
}
</script>

<style lang="less" scoped>
.collect-warp {
  display: flex;
  height: 100%;
  padding: 24px;
  gap: 16px;
}

.right {
  flex: 1;
  min-width: 0;
  height: 100%;
}
</style>
