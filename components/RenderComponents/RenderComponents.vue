<template>
  <Suspense v-if="!!props.value && myComponents">
    <component :is="myComponents" ref="componentRef" v-bind="$attrs" @vue:mounted="emit('ready')"></component>
  </Suspense>
</template>

<script>
// Definitions are shared; form state stays in each component's injected model.
const resources = new Map()
function retainResource(source, create) {
  let entry = resources.get(source)
  if (!entry) {
    entry = { references: 0, styles: [], promise: undefined }
    resources.set(source, entry)
    entry.promise = create(text => {
      const style = Object.assign(document.createElement('style'), { textContent: text })
      entry.styles.push(style)
      if (entry.references) document.head.appendChild(style)
    }).catch(error => { resources.delete(source); throw error })
  }
  ++entry.references
  entry.styles.forEach(style => { if (!style.isConnected) document.head.appendChild(style) })
  return { promise: entry.promise, release: () => {
    if (--entry.references === 0) entry.styles.forEach(style => style.remove())
    // A bounded cache retains only inactive definitions, never an edited form instance.
    for (const [key, value] of resources) {
      if (resources.size <= 24) break
      if (!value.references) resources.delete(key)
    }
  } }
}
</script>
<script setup>
import {loadModule} from 'vue3-sfc-loader/dist/vue3-sfc-loader'
import {markRaw, onBeforeUnmount, shallowRef, ref, watch} from 'vue'
import * as Vue from 'vue'
import * as JetlinksCore from '@jetlinks-web/core'
import * as JetlinksUtils from '@jetlinks-web/utils'
import * as JetlinksTypes from '@jetlinks-web/types'
import * as JetlinksConstants from '@jetlinks-web/constants'
import * as JetlinksHooks from '@jetlinks-web/hooks'
import * as pinia from 'pinia'
import * as Router from 'vue-router'
import * as LocalUtils from '@jetlinks-web-core/utils'
import * as LodashEs from 'lodash-es'
import * as hooks from '@data-collector-ui/hooks'
import dayjs from 'dayjs'
import PointEditTable
  from "@data-collector-ui/views/data-collect/components/Point/BatchSave/components/PointEditTable.vue";
import PointScanWorkspace from '@data-collector-ui/views/data-collect/components/Point/Scan/PointScanWorkspace.vue'
import ConfigSelect from '../ConfigSelect.vue'
import {
  commandRequest,
  queryCodecProvider,
  queryPointMetadata,
  queryPointNoPaging,
  scanOpcUAList,
} from '@data-collector-ui/api/data-collect/collector'
import { handlePointConfigMetadata } from '@data-collector-ui/utils/utils'
import { getResourceModule } from '@data-collector-ui/api/data-collect/channel'

defineOptions({name: 'RenderComponents'})

const props = defineProps({
  value: {
    type: String
  }
})
const emit = defineEmits(['ready', 'error'])

const myComponents = shallowRef()
const componentRef = ref()
let resource, revision = 0

const render = async () => {
  const identity = ++revision, source = props.value
  resource?.release(); resource = undefined; myComponents.value = undefined
  if (!source) return
  resource = retainResource(source, addStyle => loadModule('./components/PluginRender.vue', {
    moduleCache: {
      vue: Vue,
      '@jetlinks-web/core': JetlinksCore,
      '@jetlinks-web/utils': JetlinksUtils,
      '@jetlinks-web/types': JetlinksTypes,
      '@jetlinks-web/constants': JetlinksConstants,
      '@jetlinks-web/hooks': JetlinksHooks,
      'dayjs': dayjs,
      pinia: pinia,
      'vue-router': Router,
      'local-utils': { ...LocalUtils, handlePointConfigMetadata },
      'lodash-es': LodashEs,
      '@hooks': hooks,
      '@components': {
        PointEditTable,
        PointScanWorkspace,
        ConfigSelect,
      },
      request: {
        commandRequest,
        queryCodecProvider,
        queryPointMetadata,
        queryPointNoPaging,
        scanOpcUAList,
      }
    },
    // Dependencies keep their real resource URL, allowing normal relative imports.
    getFile: url => url === './components/PluginRender.vue' ? Promise.resolve(source) : getResourceModule(url),
    addStyle,
  }))
  try { const definition = await resource.promise; if (identity === revision) myComponents.value = markRaw(definition) }
  catch (error) { if (identity === revision) emit('error', error) }
}

watch(() => props.value, () => {
  render()
}, {immediate: true})

onBeforeUnmount(() => { ++revision; resource?.release() })

defineExpose({
  onSave: async () => {
    const result = await componentRef.value?.onSave?.()
    if (result) {
      return result
    }
    return false
  }
})
</script>

<style scoped>

</style>
